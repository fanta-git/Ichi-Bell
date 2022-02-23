import * as discord from 'discord.js';
import * as KiiteAPI from './KiiteAPI';
import Keyv from 'keyv';
require('dotenv').config();

type NotificListItem = {
    flag: boolean;
    songList: KiiteAPI.ReturnSongData[];
    userId: string;
    channel: discord.TextBasedChannel | null;
};
type interaction = discord.Interaction<discord.CacheType>;

const notificList: Record<string, NotificListItem> = {};
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
        const noticeUsers: Record<string, interaction> | undefined = await UserDataClass.noticeList.get(songId);
        if (!noticeUsers) return;

        const servers: Record<string, { userId: string, channel: discord.TextBasedChannel }[]> = {};
        for (const interaction of Object.values(noticeUsers)) {
            if (interaction.channelId && interaction.channel) {
                const data = { userId: interaction.user.id, channel: interaction.channel };
                servers[interaction.channelId].push(data);
            }
        }
        for (const sendData of Object.values(servers)) {
            sendData[0].channel.send(sendData.map(e => `<@${e.userId}>`).join('') + 'リストの曲が流れるよ！');
        }
    }

    async addNoticeList (songs: KiiteAPI.ReturnSongData[]): Promise<KiiteAPI.ReturnSongData[]> {
        const addSongs: KiiteAPI.ReturnSongData[] = [];
        const songList: Record<string, KiiteAPI.ReturnSongData> = await this.#database.get('songList') ?? {};
        for (const song of songs) {
            const videoId = song.video_id;
            if (songList[videoId] === undefined) addSongs.push(song);
            songList[videoId] = song;
            UserDataClass.noticeList.change(videoId, (item: Record<string, string> | undefined = {}) => {
                item[this.userId] = this.userId;
                return item;
            });
        }
        this.#database.set('songList', songList);
        return addSongs;
    }

    async removeNoticeList (videoIds: string[]): Promise<KiiteAPI.ReturnSongData[]> {
        const removeSongs: KiiteAPI.ReturnSongData[] = [];
        const songList: Record<string, KiiteAPI.ReturnSongData> = await this.#database.get('songList') ?? {};
        for (const videoId of videoIds) {
            if (songList[videoId] !== undefined) removeSongs.push(songList[videoId]);
            delete songList[videoId];
            UserDataClass.noticeList.change(videoId, (item: Record<string, string> | undefined = {}) => {
                delete item[this.userId];
                return Object.keys(item).length ? item : undefined;
            });
        }
        this.#database.set('songList', songList);
        return removeSongs;
    }

    async clearNoticeList (): Promise<void> {
        const songList: Record<string, KiiteAPI.ReturnSongData> = await this.#database.get('songList') ?? {};
        for (const videoId of Object.keys(songList)) {
            UserDataClass.noticeList.get(videoId).then((item: Record<string, string> | undefined = {}) => {
                delete item[this.userId];
                return Object.keys(item).length ? item : undefined;
            });
            delete songList[videoId];
        }
        this.#database.set('songList', songList);
    }

    async getSongList (): Promise<KiiteAPI.ReturnSongData[]> {
        const songList: Record<string, KiiteAPI.ReturnSongData> = await this.#database.get('songList') ?? {};
        return [...Object.values(songList)];
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
                name: 'start',
                description: '選曲通知をオンにします',
                type: 1
            },
            {
                name: 'stop',
                description: '選曲通知をオフにします',
                type: 1
            },
            {
                name: 'add',
                description: '通知する曲のリストに曲を追加します',
                type: 1,
                options: [{
                    type: 3,
                    name: 'music_id',
                    description: '追加する曲のID',
                    required: true
                }]
            },
            {
                name: 'register',
                description: '通知する曲を登録します。登録にはKiiteのプレイリストとニコニコのマイリストが使えます。',
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
            },
            {
                name: 'eval',
                description: 'aa',
                type: 1,
                options: [{
                    type: 3,
                    name: 'com',
                    description: 'aa',
                    required: true
                }]
            }
        ]
    }];

    client.application?.commands.set(data, process.env.TEST_SERVER_ID ?? '');
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand() || interaction.commandName !== 'kcns' || !interaction.channel) return;

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
        case 'start': {
            notificList[interaction.user.id].flag = true;
            interaction.reply({
                content: '通知リストの曲が選曲される直前に通知します！',
                ephemeral: true
            });
            break;
        }
        case 'stop': {
            notificList[interaction.user.id].flag = false;
            interaction.reply({
                content: '通知を停止しました！',
                ephemeral: true
            });
            break;
        }
        case 'add': {
            const args = interaction.options.getString('music_id')?.split(',');

            if (!args) throw new TypeError('error001');
            const userData = new UserDataClass(interaction.user.id);
            const songDataList = await KiiteAPI.getAPI('/api/songs/by_video_ids', { video_ids: args.join(',') });
            const addListReturn = await userData.addNoticeList(songDataList);
            const pushListTitles = addListReturn.map(v => v.title);

            interaction.reply({
                embeds: [{
                    fields: [{
                        name: '以下の曲を通知リストに追加しました！',
                        value: listSongFormat(pushListTitles).join('\n')
                    }]
                }],
                ephemeral: true
            });
            break;
        }
        case 'register': {
            const [arg] = interaction.options.getString('list_url')?.match(/https?:\/\/[\w!?/+\-~=;.,*&@#$%()'[\]]+/) ?? [];
            if (!arg) throw new TypeError('list_urlにはURLを入力してください');

            if (arg.startsWith('https://kiite.jp/playlist/')) {
                const [listId] = arg.match(/(?<=https:\/\/kiite.jp\/playlist\/)\w+/) ?? [];
                const songData = await KiiteAPI.getAPI('/api/playlists/contents', { list_id: listId });
                if (songData.status === 'failed') throw new TypeError('プレイリストの取得に失敗しました。URLが間違っていないか確認してください。\nURLが正しい場合、Kiiteが混み合っている可能性があります。その場合は時間を置いてもう一度試してみてください。');
            }

            const userData = new UserDataClass(interaction.user.id);
            const addListReturn = await userData.addNoticeList(songDataList);
            const pushListTitles = addListReturn.map(v => v.title);

            interaction.reply({
                embeds: [{
                    fields: [{
                        name: '以下の曲を通知リストに追加しました！',
                        value: listSongFormat(pushListTitles).join('\n')
                    }]
                }],
                ephemeral: true
            });
            break;
        }
        // case 'remove': {
        //     // nanika
        //     break;
        // }
        case 'list': {
            const userData = new UserDataClass(interaction.user.id);
            const songList = await userData.getSongList();

            if (songList.length) {
                const songListTitles = songList.map(v => v.title);

                interaction.reply({
                    embeds: [{
                        fields: [{
                            name: `全${songListTitles.length}曲`,
                            value: listSongFormat(songListTitles).join('\n')
                        }]
                    }],
                    ephemeral: true
                });
            } else {
                interaction.reply({
                    content: 'リストは空っぽです！`/kcns add`コマンドを使ってリストに好きな曲を追加しましょう！',
                    ephemeral: true
                });
            }
            break;
        }
        // case 'clear': {
        //     // nanika
        //     break;
        // }
        case 'eval': {
            console.log(interaction.options.getString('com'));
            // eslint-disable-next-line no-eval
            eval(interaction.options.getString('com') ?? '');
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
            case 'error001': {
                errorMessage.name = 'optionが不足しています';
                errorMessage.value = '必須のoptionsを書き忘れていませんか？入力内容を確認してみてください';
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

async function observeNextSong (apiUrl: '/api/cafe/now_playing' | '/api/cafe/next_song') {
    try {
        const nextSong = await KiiteAPI.getAPI(apiUrl);
        const nowTime = new Date().getTime();
        const startTime = new Date(nextSong.start_time).getTime();
        const msecDuration = Math.min(nextSong.msec_duration, 480e3);

        // UserDataClass.noticeSong(nextSong.video_id);

        setTimeout(() => client.user?.setActivity({ name: nextSong.title, type: 'LISTENING' }), startTime - nowTime);
        setTimeout(observeNextSong.bind(null, '/api/cafe/next_song'), Math.max(startTime + msecDuration - 30e3 - nowTime, 3e3));
    } catch (e) {
        setTimeout(observeNextSong.bind(null, '/api/cafe/next_song'), 15e3);
    }
}

client.login(process.env.TOKEN);
