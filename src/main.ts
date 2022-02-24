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

    static async noticeSong (songId: string): Promise<void> {
        const userIds: Record<string, string> | undefined = await UserDataClass.#noticeList.get(songId);
        const sendData: Record<string, { server: discord.TextChannel, userIds: string[] }> = {};
        if (!userIds) return;

        for (const userId of Object.keys(userIds)) {
            const userData = new UserDataClass(userId);
            const channel = await userData.getChannel();
            if (channel === undefined) throw new Error('チャンネルが見つかりませんでした。リストを再登録してください。');
            sendData[channel.id] ??= { server: channel, userIds: [] };
            sendData[channel.id].userIds.push(userId);
        }

        for (const key of Object.keys(sendData)) {
            sendData[key].server.send(sendData[key].userIds.map(e => `<@${e}>`).join('') + 'リストの曲が流れるよ！');
        }
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

client.once('ready', () => {
    console.log('Ready!');
    console.log(client.user?.tag);
    observeNextSong('/api/cafe/now_playing');

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
                    name: 'list_url',
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
    if (!(interaction.isButton() || interaction.isCommand())) return;

    try {
        if (interaction.isCommand() && interaction.commandName === 'ib') {
            switch (interaction.options.getSubcommand()) {
            case 'now': {
                const cafeNowP = KiiteAPI.getAPI('/api/cafe/user_count');
                const nowSong = await KiiteAPI.getAPI('/api/cafe/now_playing');
                const rotateData = await KiiteAPI.getAPI('/api/cafe/rotate_users', { ids: nowSong.id.toString() });
                const artistData = await KiiteAPI.getAPI('/api/artist/id', { artist_id: nowSong.artist_id });

                interaction.reply({
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
                    }],
                    ephemeral: true
                });
                break;
            }
            case 'register': {
                const [listId] = interaction.options.getString('list_url')?.match(/(?<=https:\/\/kiite.jp\/playlist\/)\w+/) ?? [];
                const songListData = await KiiteAPI.getAPI('/api/playlists/contents/detail', { list_id: listId });
                if (songListData.status === 'failed') throw new Error('プレイリストの取得に失敗しました！URLが間違っていませんか？\nURLが正しい場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。');

                const userData = new UserDataClass(interaction.user.id);
                await userData.registerNoticeList(songListData, interaction.channelId);

                interaction.reply({
                    content: '以下のリストを通知リストとして登録しました！',
                    embeds: [{
                        title: songListData.list_title,
                        url: `https://kiite.jp/playlist/${songListData.list_id}`,
                        description: `**全${songListData.songs.length}曲**\n${songListData.description}`,
                        footer: { text: `最終更新: ${songListData.updated_at}` }
                    }],
                    ephemeral: true
                });
                break;
            }
            case 'list': {
                const userData = new UserDataClass(interaction.user.id);
                const registeredList = await userData.getRegisteredList();

                interaction.reply({
                    content: '以下のリストが通知リストとして登録されています！',
                    embeds: [{
                        title: `${registeredList.list_title}`,
                        url: `https://kiite.jp/playlist/${registeredList.list_id}`,
                        description: `**全${registeredList.songs.length}曲**\n${registeredList.description}`,
                        footer: { text: `最終更新: ${registeredList.updated_at}` }
                    }],
                    ephemeral: true
                });
                break;
            }
            case 'update': {
                const userData = new UserDataClass(interaction.user.id);
                const songListData = await userData.updateNoticeList(interaction.channelId);

                interaction.reply({
                    content: '以下のリストから通知リストを更新しました！',
                    embeds: [{
                        title: songListData.list_title,
                        url: `https://kiite.jp/playlist/${songListData.list_id}`,
                        description: `**全${songListData.songs.length}曲**\n${songListData.description}`,
                        footer: { text: `最終更新: ${songListData.updated_at}` }
                    }],
                    ephemeral: true
                });
                break;
            }
            case 'unregister': {
                const target = interaction.options.getUser('target') ?? interaction.user;
                if (target.id !== interaction.user.id && !interaction.memberPermissions?.has('MANAGE_CHANNELS')) throw Error('自分以外のユーザーのリスト登録解除にはチャンネルの管理権限が必要です！');

                const userData = new UserDataClass(target.id);
                await userData.unregisterNoticeList();

                interaction.reply(`<@${target.id}>のリストの登録を解除しました！`);
            }
            }
        }
    } catch (e) {
        if (e instanceof Error) {
            interaction.reply({
                embeds: [{
                    title: e.name,
                    description: e.message,
                    color: '#ff0000'
                }],
                ephemeral: true
            });
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

async function observeNextSong (apiUrl: '/api/cafe/now_playing' | '/api/cafe/next_song') {
    try {
        const nextSong = await KiiteAPI.getAPI(apiUrl);
        const nowTime = new Date().getTime();
        const startTime = new Date(nextSong.start_time).getTime();
        const msecDuration = Math.min(nextSong.msec_duration, 480e3);

        UserDataClass.noticeSong(nextSong.video_id);

        setTimeout(() => client.user?.setActivity({ name: nextSong.title, type: 'LISTENING' }), startTime - nowTime);
        setTimeout(observeNextSong.bind(null, '/api/cafe/next_song'), Math.max(startTime + msecDuration - 60e3 - nowTime, 3e3));
    } catch (e) {
        setTimeout(observeNextSong.bind(null, '/api/cafe/next_song'), 15e3);
    }
}

client.login(process.env.TOKEN);
