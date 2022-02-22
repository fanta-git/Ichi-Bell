import * as discord from 'discord.js';
import * as KiiteAPI from './KiiteAPI';
import Keyv from 'keyv';
require('dotenv').config();

type extendObject<T> = { [key: string]: T };
type NotificListItem = {
    flag: boolean;
    songList: KiiteAPI.ReturnSongData[];
    userId: string;
    channel: discord.TextBasedChannel | null;
};
type interaction = discord.Interaction<discord.CacheType>;

const notificList: extendObject<NotificListItem> = {};
const client = new discord.Client({ intents: ['GUILDS'] });
const listSongFormat = (title: string[]): string[] => title.map((v, k) => `**${k + 1}. **${v}`);

class UserData {
    static noticeList = new Keyv('sqlite://db.sqlite', { table: 'noticeList' });

    parsonalNoticeList: extendObject<KiiteAPI.ReturnSongData>;
    database: Keyv<any>;
    flag: boolean | undefined;
    userId: string | undefined;
    channel: discord.TextBasedChannel | undefined;

    constructor (userId: string, channel: discord.TextBasedChannel) {
        this.parsonalNoticeList = {};
        this.database = new Keyv('sqlite://db.sqlite', { table: `user_${userId}` });
        this.database.get('userId').then((value: string | undefined) => {
            if (value === undefined) {
                this.database.set('flag', this.flag = true);
                this.database.set('userId', this.userId = userId);
                this.database.set('channel', this.channel = channel);
            } else {
                this.userId = value;
                this.database.get('flag').then((v: boolean) => (this.flag = v));
                this.database.get('channel').then((v: discord.TextBasedChannel) => (this.channel = v));
            }
        });
    }

    static async noticeSong (songId: string) {
        const noticeUsers: extendObject<interaction> | undefined = await UserData.noticeList.get(songId);
        if (!noticeUsers) return;

        const servers: extendObject<{ userId: string, channel: discord.TextBasedChannel }[]> = {};
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

    addNoticeList (interaction: interaction, songs: KiiteAPI.ReturnSongData[]) {
        for (const song of songs) {
            UserData.noticeList.get(song.video_id).then((value: extendObject<interaction> | undefined = {}) => {
                value[interaction.user.id] = interaction;
                UserData.noticeList.set(song.video_id, value);
            });
            this.parsonalNoticeList[song.video_id] = song;
        }
    }

    removeNoticeList (userId: string, videoIds: string[]) {
        for (const videoId of videoIds) {
            UserData.noticeList.get(videoId).then((value: extendObject<interaction> | undefined = {}) => {
                delete value[userId];
                UserData.noticeList.set(videoId, value);
            });
            delete this.parsonalNoticeList[videoId];
        }
    }

    clearNoticeList (userId: string) {
        this.removeNoticeList(userId, Object.keys(this.parsonalNoticeList));
    }

    flagChange (to: boolean): void {
        this.database.set('flag', to);
    }
}
const dataRoot: extendObject<UserData> = {};

client.once('ready', () => {
    console.log('Ready!');
    console.log(client.user?.tag);
    observeNextSong('/api/cafe/now_playing');

    const data: Array<discord.ApplicationCommandDataResolvable> = [{
        name: 'kcns',
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
    dataRoot[interaction.user.id] ??= new UserData(interaction.user.id, interaction.channel);

    try {
        switch (interaction.options.getSubcommand()) {
        case 'now': {
            const cafeNowP = KiiteAPI.getAPI('/api/cafe/user_count');
            const nowSong = await KiiteAPI.getAPI('/api/cafe/now_playing');
            const rotateData = await KiiteAPI.getAPI('/api/cafe/rotate_users', { ids: nowSong.id.toString() });

            interaction.reply({
                embeds: [{
                    title: nowSong.title,
                    url: 'https://www.nicovideo.jp/watch/' + nowSong.baseinfo.video_id,
                    // description: nowSong.baseinfo.description
                    //     .replace(/\s*https?:\/\/[\w!?/+\-~=;.,*&@#$%()'[\]]+\s*/g, ' $& ')
                    //     .replace(/(?<![/\w@＠])(mylist\/|user\/|series\/|sm|nm|so|ar|nc|co)\d+/g, nicoURL),
                    author: {
                        name: nowSong.baseinfo.user_nickname,
                        icon_url: nowSong.baseinfo.user_icon_url,
                        url: 'https://www.nicovideo.jp/user/' + nowSong.baseinfo.user_id
                    },
                    thumbnail: {
                        url: nowSong.thumbnail
                    },
                    fields: [
                        {
                            name: ':arrow_forward:再生数',
                            value: Number(nowSong.baseinfo.view_counter).toLocaleString('ja'),
                            inline: true
                        },
                        // {
                        //     name: ':speech_balloon:コメント',
                        //     value: Number(nowSong.baseinfo.comment_num).toLocaleString('ja'),
                        //     inline: true
                        // },
                        // {
                        //     name: ':file_folder:マイリスト',
                        //     value: Number(nowSong.baseinfo.mylist_counter).toLocaleString('ja'),
                        //     inline: true
                        // },
                        {
                            name: ':busts_in_silhouette:Cafe内の人数',
                            value: (await cafeNowP).toLocaleString('ja'),
                            inline: true
                        },
                        // {
                        //     name: ':heartbeat:新規お気に入り数',
                        //     value: (nowSong.new_fav_user_ids?.length ?? 0).toLocaleString('ja'),
                        //     inline: true
                        // },
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

            if (args) {
                const pushList = await KiiteAPI.getAPI('/api/songs/by_video_ids', { video_ids: args.join(',') });
                const pushListTitles = pushList.map(v => v.title);
                dataRoot[interaction.user.id].addNoticeList(interaction, pushList);

                interaction.reply({
                    embeds: [{
                        fields: [{
                            name: '以下の曲を通知リストに追加しました！',
                            value: listSongFormat(pushListTitles).join('\n')
                        }]
                    }],
                    ephemeral: true
                });
            }
            break;
        }
        // case 'remove': {
        //     // nanika
        //     break;
        // }
        case 'list': {
            const pushList = Object.values(dataRoot[interaction.user.id].parsonalNoticeList).map(v => v.title);

            interaction.reply({
                embeds: [{
                    fields: [{
                        name: `全${pushList.length}曲`,
                        value: listSongFormat(pushList).join('\n')
                    }]
                }],
                ephemeral: true
            });
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
        interaction.reply({
            embeds: [{
                fields: [{
                    name: 'データの読み込みに失敗しました',
                    value: '入力内容を見直してみて下さい\nまた、イベント中などでCafeが混み合うと読み込みに失敗することがあるのでそのような場合は少し待ってから再試行してみてください'
                }],
                color: '#ff0000'
            }],
            ephemeral: true
        });
    }
});

function nicoURL (match: string, type: string | undefined) {
    let url;

    switch (type) {
    case 'mylist/':
    case 'user/':
        url = `https://www.nicovideo.jp/${match}`;
        break;
    case 'series/':
        url = `https://www.nicovideo.jp/${match}`;
        break;
    case 'sm':
    case 'nm':
    case 'so':
        url = `https://www.nicovideo.jp/watch/${match}`;
        break;
    case 'ar':
        url = `https://ch.nicovideo.jp/article/${match}`;
        break;
    case 'nc':
        url = `https://commons.nicovideo.jp/material/${match}`;
        break;
    case 'co':
        url = `https://com.nicovideo.jp/community/${match}`;
        break;
    }

    return url ?? match;
}

async function observeNextSong (apiUrl: '/api/cafe/now_playing' | '/api/cafe/next_song') {
    try {
        const nextSong = await KiiteAPI.getAPI(apiUrl);
        const nowTime = new Date().getTime();
        const startTime = new Date(nextSong.start_time).getTime();
        const msecDuration = Math.min(nextSong.msec_duration, 480e3);

        UserData.noticeSong(nextSong.video_id);

        setTimeout(() => client.user?.setActivity({ name: nextSong.title, type: 'LISTENING' }), startTime - nowTime);
        setTimeout(observeNextSong.bind(null, '/api/cafe/next_song'), Math.max(startTime + msecDuration - 30e3 - nowTime, 3e3));
    } catch (e) {
        setTimeout(observeNextSong.bind(null, '/api/cafe/next_song'), 15e3);
    }
}

client.login(process.env.TOKEN);
