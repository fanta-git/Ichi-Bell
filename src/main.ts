import * as discord from 'discord.js';
import * as KiiteAPI from './KiiteAPI';
import Keyv from 'keyv';
require('dotenv').config();

const client = new discord.Client({ intents: ['GUILDS'] });
const listSongFormat = (title: string[]): string[] => title.map((v, k) => `**${k + 1}. **${v}`);
const msTommss = (ms: number): string => `${ms / 60e3 | 0}:${((ms / 1e3 | 0) % 60).toString().padStart(2, '0')}`;

class SuperKeyv extends Keyv {
    async change<T> (namespace: string, callback: (getData:T) => T): Promise<T> {
        const data = await this.get(namespace);
        const newData = await callback(data);
        if (newData === undefined) {
            await this.delete(namespace);
        } else {
            await this.set(namespace, newData);
        }
        return newData;
    }

    async getMulti (...namesapces: string[]): Promise<any[]> {
        const promises = [];
        for (const namespace of namesapces) promises.push(this.get(namespace));
        return await Promise.all(promises);
    }
}

class UserDataClass {
    static noticeList = new SuperKeyv('sqlite://db.sqlite', { table: 'noticeList' });

    #database: SuperKeyv;
    userId: string;

    constructor (userId: string) {
        this.#database = new SuperKeyv('sqlite://db.sqlite', { table: `user_${userId}` });
        this.userId = userId;
    }

    static async noticeSong (songId: string): Promise<void> {
        const userIds: Record<string, string> | undefined = await UserDataClass.noticeList.get(songId);
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

    async registerNoticeList (playlistData: KiiteAPI.PlaylistContents, userId: string, channelId: string) {
        const nowRegisteredList: KiiteAPI.PlaylistContents | undefined = await this.#database.get('registeredList');
        if (nowRegisteredList !== undefined) await this.releaseNoticeList();
        for (const song of playlistData.songs) {
            UserDataClass.noticeList.change(song.video_id, (item: Record<string, string> | undefined = {}) => {
                item[this.userId] = this.userId;
                return item;
            });
        }
        this.#database.set('userId', userId);
        this.#database.set('channelId', channelId);
        this.#database.set('registeredList', playlistData);
        return true;
    }

    async releaseNoticeList () {
        const registeredList: KiiteAPI.PlaylistContents | undefined = await this.#database.get('registeredList');
        if (registeredList === undefined) return;
        this.#database.delete('registeredList');
        for (const videoId of registeredList.songs.map(v => v.video_id)) {
            UserDataClass.noticeList.get(videoId).then((item: Record<string, string> | undefined = {}) => {
                delete item[this.userId];
                return Object.keys(item).length ? item : undefined;
            });
        }
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
        type: 1,
        options: [
            {
                name: 'now',
                description: 'Cafeで今流れている曲とCafeにいる人数を表示します',
                type: 1
            },
            {
                name: 'register',
                description: '通知する曲の入ったプレイリストを登録します。登録にはKiiteのプレイリストを使えます。',
                type: 1,
                options: [{
                    type: 3,
                    name: 'list_url',
                    description: '追加するプレイリストまたはマイリストのURL',
                    required: true
                }]
            },
            {
                name: 'list',
                description: '通知する曲のリストを表示します',
                type: 1
            }
        ]
    }];

    client.application?.commands.set(data, process.env.TEST_SERVER_ID ?? '');
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand() || interaction.commandName !== 'ib' || !interaction.channel) return;

    try {
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
                    thumbnail: {
                        url: nowSong.thumbnail
                    },
                    color: nowSong.colors[0],
                    fields: [
                        {
                            name: getStatusbar(Date.now() - Date.parse(nowSong.start_time), nowSong.msec_duration, 12),
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
            if (!arg) throw new TypeError('list_urlにはURLを入力してください');

            const [listId] = arg.match(/(?<=https:\/\/kiite.jp\/playlist\/)\w+/) ?? [];
            const songData = await KiiteAPI.getAPI('/api/playlists/contents/detail', { list_id: listId.trim() });
            if (songData.status === 'failed') throw new TypeError('プレイリストの取得に失敗しました。URLが間違っていないか確認してください。\nURLが正しい場合、Kiiteが混み合っている可能性があります。その場合は時間を置いてもう一度試してみてください。');

            const userData = new UserDataClass(interaction.user.id);
            userData.registerNoticeList(songData, interaction.user.id, interaction.channelId);

            interaction.reply({
                embeds: [{
                    title: '以下のリストを通知リストとして登録しました！',
                    fields: [{
                        name: `${songData.list_title}（全${songData.songs.length}曲）`,
                        value: songData.description
                    }]
                }],
                ephemeral: true
            });
            break;
        }
        case 'list': {
            const userData = new UserDataClass(interaction.user.id);
            const registeredList = await userData.getRegisteredList();

            if (registeredList === undefined) {
                interaction.reply({
                    content: 'リストは空っぽです！`/ib register`コマンドを使ってリストを登録しましょう！',
                    ephemeral: true
                });
            } else {
                const songData = await KiiteAPI.getAPI('/api/songs/by_video_ids', { video_ids: registeredList.songs.map(v => v.video_id).join(',') });
                const songListTitles = songData.map(v => v.title);

                interaction.reply({
                    embeds: [{
                        fields: [{
                            name: `${registeredList.list_title}（全${songListTitles.length}曲）`,
                            value: listSongFormat(songListTitles).join('\n')
                        }]
                    }],
                    ephemeral: true
                });
            }
            break;
        }
        }
    } catch (e) {
        console.error(e);
        const errorMessage: { name: string, value: string } = {
            name: 'エラー',
            value: 'エラーが発生しました'
        };
        if (e instanceof Error) {
            switch (e.message) {
            case 'error000': {
                errorMessage.name = 'データの読み込みに失敗しました';
                errorMessage.value = '入力内容を見直してみて下さい\nまた、イベント中などでCafeが混み合うと読み込みに失敗することがあるのでそのような場合は少し待ってから再試行してみてください';
                break;
            }
            default: {
                break;
            }
            }
            errorMessage.name = e.name;
            errorMessage.value = e.message;
        }
        interaction.reply({
            embeds: [{
                fields: [errorMessage],
                color: '#ff0000'
            }],
            ephemeral: true
        });
    }
});

function getStatusbar (nowPoint: number, endPoint: number, length: number) {
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
