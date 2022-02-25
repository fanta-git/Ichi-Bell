import * as discord from 'discord.js';
import * as KiiteAPI from './KiiteAPI';
import Keyv from 'keyv';
require('dotenv').config();

const client = new discord.Client({ intents: ['GUILDS'] });

type noticeListContents = Record<string, string> | undefined;
type userDataContents = {
    registeredList: KiiteAPI.PlaylistContents | undefined,
    userId: string | undefined,
    channelId: string | undefined
};

class UserDataClass {
    static #noticeList: Keyv<noticeListContents> = new Keyv('sqlite://db.sqlite', { table: 'noticeList' });
    static #userData: Keyv<userDataContents> = new Keyv('sqlite://db.sqlite', { table: 'userData' });

    #database: Promise<userDataContents>;
    #userId: string;

    constructor (userId: string) {
        this.#userId = userId;
        this.#database = UserDataClass.#userData.get(userId).then(item => item ?? {} as userDataContents);
    }

    static async noticeSong (songId: string): Promise<string[] | undefined> {
        const userIds: Record<string, string> | undefined = await UserDataClass.#noticeList.get(songId);
        const sendData: Record<string, { channel: discord.TextChannel, userIds: string[] }> = {};
        if (!userIds) return;

        for (const userId of Object.keys(userIds)) {
            const userData = new UserDataClass(userId);
            const channel = await userData.getChannel();
            if (channel === undefined) {
                userData.unregisterNoticeList();
                console.log('delete', userId);
                continue;
            } else {
                console.log(userId);
                channel.guild.members.fetch(userId).catch(_ => {
                    userData.unregisterNoticeList();
                    console.log('delete', userId);
                });
                sendData[channel.id] ??= { channel: channel, userIds: [] };
                sendData[channel.id].userIds.push(userId);
            }
        }

        for (const key of Object.keys(sendData)) {
            sendData[key].channel.send(sendData[key].userIds.map(e => `<@${e}>`).join('') + 'リストの曲が流れるよ！');
        }
        return Object.keys(userIds);
    }

    async registerNoticeList (playlistData: KiiteAPI.PlaylistContents, channelId: string) {
        const { userId } = await this.#database;
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
            registeredList: playlistData
        });
        return true;
    }

    async updateNoticeList (channelId: string) {
        const { registeredList } = await this.#database;
        if (registeredList === undefined) throw new Error('リストが登録されていません！`/ib register`コマンドを使ってリストを登録しましょう！');
        const songListData = await KiiteAPI.getAPI('/api/playlists/contents/detail', { list_id: registeredList.list_id });
        if (songListData.status === 'failed') throw new Error(`プレイリストの取得に失敗しました！登録されていたリスト（${registeredList.list_title}）は存在していますか？\n存在している場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。`);
        if (songListData.updated_at === registeredList.updated_at) throw new Error('プレイリストは最新の状態です！');
        this.registerNoticeList(songListData, channelId);
        return songListData;
    }

    async unregisterNoticeList () {
        const { registeredList } = await this.#database;
        if (registeredList === undefined) throw new Error('リストが登録されていません！');
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

    async getRegisteredList () {
        const { registeredList } = await this.#database;
        if (registeredList === undefined) throw new Error('リストが登録されていません！`/ib register`コマンドを使ってリストを登録しましょう！');
        return registeredList;
    }

    async getChannel () {
        const { channelId } = await this.#database;
        if (channelId === undefined) return undefined;
        return client.channels.cache.get(channelId) as discord.TextChannel;
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
    console.log('Ready!');
    console.log(client.user?.tag);
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

    client.application?.commands.set(data, process.env.TEST_SERVER_ID ?? '');
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.channel) return;
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
            if (!listId) throw new Error('URLが正しくありません！`https://kiite.jp/playlist/`で始まるURLを入力してください！');
            const songListData = await KiiteAPI.getAPI('/api/playlists/contents/detail', { list_id: listId });
            if (songListData.status === 'failed') throw new Error('プレイリストの取得に失敗しました！URLが間違っていませんか？\nURLが正しい場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。');

            const userData = new UserDataClass(interaction.user.id);
            await userData.registerNoticeList(songListData, interaction.channelId);

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
            const registeredList = await userData.getRegisteredList();

            replyManager.reply({
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
            const songListData = await userData.updateNoticeList(interaction.channelId);

            replyManager.reply({
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
            if (!myself && !interaction.memberPermissions?.has('MANAGE_CHANNELS')) {
                replyManager.standby({ ephemeral: true });
                throw Error('指定ユーザーのリスト登録解除にはチャンネルの管理権限が必要です！');
            }
            replyManager.standby(myself ? { ephemeral: true } : undefined);

            const userData = new UserDataClass(target.id);
            await userData.unregisterNoticeList();

            replyManager.reply({
                content: myself ? 'リストの登録を解除しました！' : `<@${target.id}>のリストの登録を解除しました！`
            });
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
            }).catch(e => console.error(e));
        } else {
            console.error(e);
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

            UserDataClass.noticeSong(cafeSongData.video_id);
            setTimeout(() => client.user?.setActivity({ name: cafeSongData.title, type: 'LISTENING' }), Math.max(startTime - nowTime, 0));
            if (getNext) await new Promise(resolve => setTimeout(resolve, Math.max(endTime - 60e3 - nowTime, 3e3)));
            getNext = new Date().getTime() < endTime;
        } catch (e) {
            console.error(e);
            await new Promise(resolve => setTimeout(resolve, 15e3));
        }
    }
}

client.login(process.env.TOKEN);
