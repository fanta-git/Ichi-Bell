import * as discord from 'discord.js';
import * as KiiteAPI from './KiiteAPI';
import Keyv from 'keyv';
import log4js from 'log4js';
import dotenv from 'dotenv';

const client = new discord.Client({ intents: ['GUILDS'] });
const logger = log4js.getLogger('main');
const errorlog = log4js.getLogger('error');
dotenv.config();
log4js.configure('./log-config.json');

type noticeListContents = Record<string, string> | undefined;
type userDataContents = {
    registeredList: KiiteAPI.PlaylistContents | undefined,
    userId: string | undefined,
    dm: boolean | undefined,
    channelId: string | undefined
};

class UserDataClass {
    static #noticeList: Keyv<noticeListContents> = new Keyv('sqlite://db.sqlite', { table: 'noticeList' });
    static #userData: Keyv<userDataContents> = new Keyv('sqlite://db.sqlite', { table: 'userData' });

    #userId: string;

    constructor (userId: string) {
        this.#userId = userId;
    }

    static async noticeSong (songId: string): Promise<string[] | undefined> {
        const userIds = await UserDataClass.#noticeList.get(songId);
        const forChannels: Record<string, { channel: discord.TextChannel, userIds: string[] }> = {};
        const forDMs: discord.User[] = [];
        if (!userIds) return;

        for (const userId of Object.keys(userIds)) {
            const userData = new UserDataClass(userId);
            const { channelId, dm } = await userData.getData();
            if (dm) {
                const user = client.users.cache.get(userId) ?? await client.users.fetch(userId);
                if (user === undefined) throw Error('DMの取得に失敗しました');
                forDMs.push(user);
            } else {
                if (channelId === undefined) {
                    userData.unregisterNoticeList();
                    logger.info('delete', userId);
                } else {
                    const channel = client.channels.cache.get(channelId) as discord.TextChannel | undefined;
                    if (channel === undefined) throw Error('チャンネルの取得に失敗しました');
                    channel.guild.members.fetch(userId).catch(_ => {
                        userData.unregisterNoticeList();
                        logger.info('delete', userId);
                    });
                    forChannels[channel.id] ??= { channel: channel, userIds: [] };
                    forChannels[channel.id].userIds.push(userId);
                }
            }
        }

        for (const user of forDMs) {
            user.send('リストの曲が流れるよ！');
        }
        for (const key of Object.keys(forChannels)) {
            forChannels[key].channel.send(forChannels[key].userIds.map(e => `<@${e}>`).join('') + 'リストの曲が流れるよ！');
        }
        return Object.keys(userIds);
    }

    async registerNoticeList (playlistData: KiiteAPI.PlaylistContents, channelId: string, dm: boolean) {
        const { userId } = await this.getData();
        if (userId) await this.unregisterNoticeList();
        for (const song of playlistData.songs) {
            UserDataClass.#noticeList.get(song.video_id).then((item = {}) => {
                item[this.#userId] = this.#userId;
                UserDataClass.#noticeList.set(song.video_id, item);
            });
        }
        UserDataClass.#userData.set(this.#userId, {
            userId: this.#userId,
            channelId: channelId,
            dm: dm,
            registeredList: playlistData
        });
        return true;
    }

    async updateNoticeList (channelId: string, dm: boolean) {
        const { registeredList, channelId: registedChannelId } = await this.getData();
        if (registeredList === undefined) throw Error('リストが登録されていません！`/ib register`コマンドを使ってリストを登録しましょう！');
        const songListData = await KiiteAPI.getAPI('/api/playlists/contents/detail', { list_id: registeredList.list_id });
        if (songListData.status === 'failed') throw Error(`プレイリストの取得に失敗しました！登録されていたリスト（${registeredList.list_title}）は存在していますか？\n存在している場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。`);
        if (registedChannelId === channelId && songListData.updated_at === registeredList.updated_at) throw Error('プレイリストは最新の状態です！');
        this.registerNoticeList(songListData, channelId, dm);
        return songListData;
    }

    async unregisterNoticeList () {
        const { registeredList } = await this.getData();
        if (registeredList === undefined) throw Error('リストが登録されていません！');
        UserDataClass.#userData.delete(this.#userId);
        for (const songData of registeredList.songs) {
            UserDataClass.#noticeList.get(songData.video_id).then((item = {}) => {
                delete item[this.#userId];
                if (Object.keys(item).length) {
                    UserDataClass.#noticeList.set(songData.video_id, item);
                } else {
                    UserDataClass.#noticeList.delete(songData.video_id);
                }
            });
        }
        return registeredList;
    }

    async getData () {
        return await UserDataClass.#userData.get(this.#userId).then(item => item ?? {} as userDataContents);
    }
}

class ResponseIntetaction {
    #interaction: discord.CommandInteraction<discord.CacheType>;
    #options: discord.InteractionDeferReplyOptions | undefined;
    #timeout: ReturnType<typeof setTimeout> | undefined;

    constructor (interaction: discord.CommandInteraction<discord.CacheType>) {
        this.#interaction = interaction;
    }

    standby (options?: discord.InteractionDeferReplyOptions) {
        this.#options = options;
        this.#timeout = setTimeout(() => this.#interaction.deferReply(options), 2e3);
    }

    reply (options: discord.WebhookEditMessageOptions) {
        if (this.#interaction.replied || this.#interaction.deferred) {
            return this.#interaction.editReply(options);
        } else {
            if (this.#timeout !== undefined) clearTimeout(this.#timeout);
            return this.#interaction.reply({ ...options, ...this.#options });
        }
    }
}

client.once('ready', () => {
    logger.info(client.user?.tag + ' Ready!');
    observeNextSong();

    const data: Array<discord.ApplicationCommandDataResolvable> = [{
        name: 'ib',
        description: 'KiiteCafeでの選曲を通知します',
        options: [
            {
                name: 'now',
                description: 'Cafeで今流れている曲やCafeにいる人数などを表示します',
                type: 'SUB_COMMAND'
            },
            {
                name: 'register',
                description: '通知する曲のリストとしてKiiteのプレイリストを登録します',
                type: 'SUB_COMMAND',
                options: [{
                    type: 'STRING',
                    name: 'url',
                    description: '追加するプレイリストのURL',
                    required: true
                }]
            },
            {
                name: 'list',
                description: '登録されているリストの情報を表示します',
                type: 'SUB_COMMAND'
            },
            {
                name: 'update',
                description: '登録されているリストの情報を再登録し、Kiiteのプレイリストの更新を反映させます',
                type: 'SUB_COMMAND'
            },
            {
                name: 'unregister',
                description: 'リストの登録を解除し、選曲通知を停止します',
                type: 'SUB_COMMAND',
                options: [{
                    type: 'USER',
                    name: 'target',
                    description: '登録を解除させたいユーザー（ユーザー指定にはチャンネルの管理権限が必要です）',
                    required: false
                }]
            }
        ]
    }];

    if (process.env.TEST_SERVER_ID === undefined) {
        client.application?.commands.set(data);
    } else {
        client.application?.commands.set(data, process.env.TEST_SERVER_ID);
    }
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand() || interaction.commandName !== 'ib') return;
    const replyManager = new ResponseIntetaction(interaction);
    try {
        switch (interaction.options.getSubcommand()) {
        case 'now': {
            replyManager.standby({ ephemeral: true });
            const cafeNowP = KiiteAPI.getAPI('/api/cafe/user_count');
            const nowSong = await KiiteAPI.getAPI('/api/cafe/now_playing');
            const rotateData = await KiiteAPI.getAPI('/api/cafe/rotate_users', { ids: nowSong.id.toString() });
            const artistData = await KiiteAPI.getAPI('/api/artist/id', { artist_id: nowSong.artist_id });
            await replyManager.reply({
                embeds: [{
                    title: nowSong.title,
                    url: 'https://www.nicovideo.jp/watch/' + nowSong.baseinfo.video_id,
                    author: {
                        name: nowSong.baseinfo.user_nickname,
                        icon_url: nowSong.baseinfo.user_icon_url,
                        url: 'https://kiite.jp/creator/' + artistData?.creator_id ?? ''
                    },
                    thumbnail: { url: nowSong.thumbnail },
                    color: nowSong.colors[0],
                    fields: [
                        {
                            name: makeStatusbar(Date.now() - Date.parse(nowSong.start_time), nowSong.msec_duration, 12),
                            value: `${msTommss(Date.now() - Date.parse(nowSong.start_time))} / ${msTommss(nowSong.msec_duration)}`,
                            inline: false
                        },
                        {
                            name: ':arrow_forward:再生数',
                            value: Number(nowSong.baseinfo.view_counter).toLocaleString('ja'),
                            inline: true
                        },
                        {
                            name: ':busts_in_silhouette:Cafe内の人数',
                            value: (await cafeNowP).toLocaleString('ja'),
                            inline: true
                        },
                        {
                            name: ':arrows_counterclockwise:回転数',
                            value: (rotateData[nowSong.id]?.length ?? 0).toLocaleString('ja'),
                            inline: true
                        }
                    ]
                }]
            });
            break;
        }
        case 'register': {
            replyManager.standby({ ephemeral: true });
            const url = interaction.options.getString('url') as string;
            const [listId] = url.match(/(?<=https:\/\/kiite.jp\/playlist\/)\w+/) ?? [];
            if (!listId) throw Error('URLが正しくありません！`https://kiite.jp/playlist/`で始まるURLを入力してください！');
            const songListData = await KiiteAPI.getAPI('/api/playlists/contents/detail', { list_id: listId });
            if (songListData.status === 'failed') throw Error('プレイリストの取得に失敗しました！URLが間違っていませんか？\nURLが正しい場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。');

            const userData = new UserDataClass(interaction.user.id);
            await userData.registerNoticeList(songListData, interaction.channelId, !interaction.inGuild());

            await replyManager.reply({
                content: '以下のリストを通知リストとして登録しました！',
                embeds: [{
                    title: songListData.list_title,
                    url: `https://kiite.jp/playlist/${songListData.list_id}`,
                    description: `**全${songListData.songs.length}曲**\n${songListData.description}`,
                    footer: { text: `最終更新: ${songListData.updated_at}` }
                }]
            });
            break;
        }
        case 'list': {
            replyManager.standby({ ephemeral: true });
            const userData = new UserDataClass(interaction.user.id);
            const { registeredList } = await userData.getData();
            if (registeredList === undefined) throw Error('リストが登録されていません！`/ib register`コマンドを使ってリストを登録しましょう！');

            await replyManager.reply({
                content: '以下のリストが通知リストとして登録されています！',
                embeds: [{
                    title: `${registeredList.list_title}`,
                    url: `https://kiite.jp/playlist/${registeredList.list_id}`,
                    description: `**全${registeredList.songs.length}曲**\n${registeredList.description}`,
                    footer: { text: `最終更新: ${registeredList.updated_at}` }
                }]
            });
            break;
        }
        case 'update': {
            replyManager.standby({ ephemeral: true });
            const userData = new UserDataClass(interaction.user.id);
            const songListData = await userData.updateNoticeList(interaction.channelId, !interaction.inGuild());

            await replyManager.reply({
                content: '以下のリストから通知リストを更新しました！',
                embeds: [{
                    title: songListData.list_title,
                    url: `https://kiite.jp/playlist/${songListData.list_id}`,
                    description: `**全${songListData.songs.length}曲**\n${songListData.description}`,
                    footer: { text: `最終更新: ${songListData.updated_at}` }
                }]
            });
            break;
        }
        case 'unregister': {
            const target = interaction.options.getUser('target') ?? interaction.user;
            const myself = target.id === interaction.user.id;
            const userData = new UserDataClass(target.id);
            const { channelId } = await userData.getData();
            if (!myself && interaction.channelId !== channelId) throw Error('指定ユーザーのリスト登録解除は通知先として設定されているチャンネル内で行う必要があります！');

            if (!myself && !interaction.memberPermissions?.has('MANAGE_CHANNELS')) {
                replyManager.standby({ ephemeral: true });
                throw Error('指定ユーザーのリスト登録解除にはチャンネルの管理権限が必要です！');
            }
            replyManager.standby(myself ? { ephemeral: true } : undefined);

            await userData.unregisterNoticeList();

            await replyManager.reply({
                content: myself ? 'リストの登録を解除しました！' : `<@${target.id}>のリストの登録を解除しました！`
            });
            break;
        }
        }
    } catch (e) {
        if (e instanceof Error) {
            replyManager.reply({
                embeds: [{
                    title: e.name,
                    description: e.message,
                    color: '#ff0000'
                }]
            }).catch(e => errorlog.error(e));
        } else {
            errorlog.error(e);
        }
    }
});

function makeStatusbar (nowPoint: number, endPoint: number, length: number) {
    const nowLength = nowPoint * (length + 1) / endPoint | 0;
    let statusbar: string = '';
    statusbar += (nowLength <= 0) ? '┠' : '┣';
    for (let i = 1; i < length - 1; i++) {
        if (i < nowLength) {
            statusbar += '━';
        } else if (i === nowLength) {
            statusbar += '╉';
        } else {
            statusbar += '─';
        }
    }
    statusbar += (length - 1 <= nowLength) ? '┫' : '┤';
    return statusbar;
}

function msTommss (ms: number) {
    return `${ms / 60e3 | 0}:${((ms / 1e3 | 0) % 60).toString().padStart(2, '0')}`;
}

async function observeNextSong () {
    let getNext: boolean = false;
    while (true) {
        try {
            const apiUrl = (getNext ? '/api/cafe/next_song' : '/api/cafe/now_playing') as '/api/cafe/now_playing' | '/api/cafe/next_song';
            const cafeSongData = await KiiteAPI.getAPI(apiUrl);
            const nowTime = new Date().getTime();
            const startTime = new Date(cafeSongData.start_time).getTime();
            const endTime = startTime + Math.min(cafeSongData.msec_duration, 480e3);

            if (getNext) UserDataClass.noticeSong(cafeSongData.video_id);
            setTimeout(() => client.user?.setActivity({ name: cafeSongData.title, type: 'LISTENING' }), Math.max(startTime - nowTime, 0));
            await new Promise(resolve => setTimeout(resolve, Math.max(endTime - 60e3 - nowTime, getNext ? 3e3 : 0)));
            getNext = new Date().getTime() < endTime;
        } catch (e) {
            errorlog.error(e);
            await new Promise(resolve => setTimeout(resolve, 15e3));
        }
    }
}

if (process.env.TOKEN === undefined) throw Error('トークンが設定されていません！');
client.login(process.env.TOKEN);
