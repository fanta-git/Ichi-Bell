import * as discord from 'discord.js';
import * as KiiteAPI from './KiiteAPI';
import Keyv from 'keyv';
require('dotenv').config();

const client = new discord.Client({ intents: ['GUILDS'] });

class UserDataClass {
    static #noticeList: Keyv = new Keyv('sqlite://db.sqlite', { table: 'noticeList' });

    #database: Keyv;
    #userId: string;

    constructor (userId: string) {
        this.#database = new Keyv('sqlite://db.sqlite', { table: `user_${userId}` });
        this.#userId = userId;
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
        const nowRegisteredList: KiiteAPI.PlaylistContents | undefined = await this.#database.get('registeredList');
        if (nowRegisteredList !== undefined) await this.unregisterNoticeList();
        for (const song of playlistData.songs) {
            UserDataClass.#noticeList.get(song.video_id).then((item: Record<string, string> | undefined = {}) => {
                item[this.#userId] = this.#userId;
                UserDataClass.#noticeList.set(song.video_id, item);
            });
        }
        this.#database.set('userId', this.#userId);
        this.#database.set('channelId', channelId);
        this.#database.set('registeredList', playlistData);
        return true;
    }

    async unregisterNoticeList () {
        const registeredList: KiiteAPI.PlaylistContents | undefined = await this.#database.get('registeredList');
        if (registeredList === undefined) return;
        this.#database.delete('registeredList');
        for (const videoId of registeredList.songs.map(v => v.video_id)) {
            UserDataClass.#noticeList.get(videoId).then((item: Record<string, string> | undefined = {}) => {
                delete item[this.#userId];
                return Object.keys(item).length ? item : undefined;
            });
        }
        return registeredList;
    }

    async getRegisteredList () {
        const registeredList: KiiteAPI.PlaylistContents | undefined = await this.#database.get('registeredList');
        return registeredList;
    }

    async getChannel () {
        const channelId: string | undefined = await this.#database.get('channelId');
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
                const [arg] = interaction.options.getString('list_url')?.match(/https?:\/\/[\w!?/+\-~=;.,*&@#$%()'[\]]+/) ?? [];

                const [listId] = arg.match(/(?<=https:\/\/kiite.jp\/playlist\/)\w+/) ?? [];
                const songListData = await KiiteAPI.getAPI('/api/playlists/contents/detail', { list_id: listId.trim() });
                if (songListData.status === 'failed') throw new Error('プレイリストの取得に失敗しました！URLが間違っていませんか？\nURLが正しい場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。');

                const userData = new UserDataClass(interaction.user.id);
                userData.registerNoticeList(songListData, interaction.channelId);

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

                if (registeredList === undefined) throw new Error('リストが登録されていません！`/ib register`コマンドを使ってリストを登録しましょう！');
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
                const nowRegisteredList = await userData.getRegisteredList();
                if (nowRegisteredList === undefined) throw new Error('リストが登録されていません！`/ib register`コマンドを使ってリストを登録しましょう！');
                const songListData = await KiiteAPI.getAPI('/api/playlists/contents/detail', { list_id: nowRegisteredList.list_id });
                if (songListData.status === 'failed') throw new Error(`プレイリストの取得に失敗しました！登録されていたリスト（${nowRegisteredList.list_title}）は存在していますか？\n存在している場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。`);
                userData.registerNoticeList(songListData, interaction.channelId);
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
                if (target.id !== interaction.user.id && interaction.memberPermissions?.has('MANAGE_CHANNELS')) throw Error('自分以外のユーザーのリスト登録解除にはチャンネルの管理権限が必要です！');
                const userData = new UserDataClass(target.id);
                const unregisterSuccess = userData.unregisterNoticeList();
                if (unregisterSuccess === undefined) throw Error('リストが登録されていません！');
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

// function * zip (...args: any[][]) {
//     const length = args[0].length;

//     for (const arr of args) {
//         if (arr.length !== length) return undefined;
//     }

//     for (let i = 0; i < length; i++) yield args.map(v => v[i]);
// }

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
