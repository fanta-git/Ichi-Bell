"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    Object.defineProperty(o, k2, { enumerable: true, get: function() { return m[k]; } });
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const discord = __importStar(require("discord.js"));
const KiiteAPI = __importStar(require("./KiiteAPI"));
const keyv_1 = __importDefault(require("keyv"));
require('dotenv').config();
const notificList = {};
const client = new discord.Client({ intents: [discord.Intents.FLAGS.GUILDS] });
const listSongFormat = (title) => title.map((v, k) => `**${k + 1}. **${v}`);
class UserData {
    constructor(userId, channel) {
        this.parsonalNoticeList = {};
        this.database = new keyv_1.default('sqlite://db.sqlite', { table: `user_${userId}` });
        this.database.get('userId').then((value) => {
            if (value === undefined) {
                this.database.set('flag', this.flag = true);
                this.database.set('userId', this.userId = userId);
                this.database.set('channel', this.channel = channel);
            }
            else {
                this.userId = value;
                this.database.get('flag').then((v) => (this.flag = v));
                this.database.get('channel').then((v) => (this.channel = v));
            }
        });
    }
    static noticeSong(songId) {
        return __awaiter(this, void 0, void 0, function* () {
            const noticeUsers = yield UserData.noticeList.get(songId);
            if (!noticeUsers)
                return;
            const servers = {};
            for (const interaction of Object.values(noticeUsers)) {
                if (interaction.channelId && interaction.channel) {
                    const data = { userId: interaction.user.id, channel: interaction.channel };
                    servers[interaction.channelId].push(data);
                }
            }
            for (const sendData of Object.values(servers)) {
                sendData[0].channel.send(sendData.map(e => `<@${e.userId}>`).join('') + 'リストの曲が流れるよ！');
            }
        });
    }
    addNoticeList(interaction, songs) {
        for (const song of songs) {
            UserData.noticeList.get(song.video_id).then((value = {}) => {
                value[interaction.user.id] = interaction;
                UserData.noticeList.set(song.video_id, value);
            });
            this.parsonalNoticeList[song.video_id] = song;
        }
    }
    removeNoticeList(userId, videoIds) {
        for (const videoId of videoIds) {
            UserData.noticeList.get(videoId).then((value = {}) => {
                delete value[userId];
                UserData.noticeList.set(videoId, value);
            });
            delete this.parsonalNoticeList[videoId];
        }
    }
    clearNoticeList(userId) {
        this.removeNoticeList(userId, Object.keys(this.parsonalNoticeList));
    }
    flagChange(to) {
        this.database.set('flag', to);
    }
}
UserData.noticeList = new keyv_1.default('sqlite://db.sqlite', { table: 'noticeList' });
const dataRoot = {};
client.once('ready', () => {
    var _a, _b, _c;
    console.log('Ready!');
    console.log((_a = client.user) === null || _a === void 0 ? void 0 : _a.tag);
    observeNextSong('/api/cafe/now_playing');
    const data = [{
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
    (_b = client.application) === null || _b === void 0 ? void 0 : _b.commands.set(data, (_c = process.env.TEST_SERVER_ID) !== null && _c !== void 0 ? _c : '');
});
client.on('interactionCreate', (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d;
    var _e;
    if (!interaction.isCommand() || interaction.commandName !== 'kcns' || !interaction.channel)
        return;
    (_a = dataRoot[_e = interaction.user.id]) !== null && _a !== void 0 ? _a : (dataRoot[_e] = new UserData(interaction.user.id, interaction.channel));
    try {
        switch (interaction.options.getSubcommand()) {
            case 'now': {
                const nowSongP = KiiteAPI.getAPI('/api/cafe/now_playing');
                const cafeNowP = KiiteAPI.getAPI('/api/cafe/user_count');
                interaction.reply({
                    content: `${(_b = (yield nowSongP)) === null || _b === void 0 ? void 0 : _b.title}\nCafeには現在${yield cafeNowP}人います！`,
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
                const args = (_c = interaction.options.getString('music_id')) === null || _c === void 0 ? void 0 : _c.split(',');
                if (args) {
                    const pushList = yield KiiteAPI.getAPI('/api/songs/by_video_ids', { video_ids: args.join(',') });
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
                eval((_d = interaction.options.getString('com')) !== null && _d !== void 0 ? _d : '');
            }
        }
    }
    catch (e) {
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
}));
function observeNextSong(apiUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const nextSong = yield KiiteAPI.getAPI(apiUrl);
            const nowTime = new Date().getTime();
            const startTime = new Date(nextSong.start_time).getTime();
            const msecDuration = Math.min(nextSong.msec_duration, 480e3);
            UserData.noticeSong(nextSong.video_id);
            setTimeout(() => { var _a; return (_a = client.user) === null || _a === void 0 ? void 0 : _a.setActivity({ name: nextSong.title, type: 'LISTENING' }); }, startTime - nowTime);
            setTimeout(observeNextSong.bind(null, '/api/cafe/next_song'), Math.max(startTime + msecDuration - 30e3 - nowTime, 3e3));
        }
        catch (e) {
            setTimeout(observeNextSong.bind(null, '/api/cafe/next_song'), 15e3);
        }
    });
}
client.login(process.env.TOKEN);
