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
var __classPrivateFieldSet = (this && this.__classPrivateFieldSet) || function (receiver, state, value, kind, f) {
    if (kind === "m") throw new TypeError("Private method is not writable");
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a setter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot write private member to an object whose class did not declare it");
    return (kind === "a" ? f.call(receiver, value) : f ? f.value = value : state.set(receiver, value)), value;
};
var __classPrivateFieldGet = (this && this.__classPrivateFieldGet) || function (receiver, state, kind, f) {
    if (kind === "a" && !f) throw new TypeError("Private accessor was defined without a getter");
    if (typeof state === "function" ? receiver !== state || !f : !state.has(receiver)) throw new TypeError("Cannot read private member from an object whose class did not declare it");
    return kind === "m" ? f : kind === "a" ? f.call(receiver) : f ? f.value : state.get(receiver);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
var _UserDataClass_database;
Object.defineProperty(exports, "__esModule", { value: true });
const discord = __importStar(require("discord.js"));
const KiiteAPI = __importStar(require("./KiiteAPI"));
const keyv_1 = __importDefault(require("keyv"));
require('dotenv').config();
const notificList = {};
const client = new discord.Client({ intents: ['GUILDS'] });
const listSongFormat = (title) => title.map((v, k) => `**${k + 1}. **${v}`);
const msTommss = (ms) => `${ms / 60e3 | 0}:${((ms / 1e3 | 0) % 60).toString().padStart(2, '0')}`;
class SuperKeyv extends keyv_1.default {
    change(namespace, callback) {
        return __awaiter(this, void 0, void 0, function* () {
            const data = yield this.get(namespace);
            const newData = yield callback(data);
            if (newData === undefined) {
                yield this.delete(namespace);
            }
            else {
                yield this.set(namespace, newData);
            }
            return newData;
        });
    }
}
class UserDataClass {
    constructor(userId) {
        _UserDataClass_database.set(this, void 0);
        __classPrivateFieldSet(this, _UserDataClass_database, new SuperKeyv('sqlite://db.sqlite', { table: `user_${userId}` }), "f");
        this.userId = userId;
    }
    static noticeSong(songId) {
        return __awaiter(this, void 0, void 0, function* () {
            const noticeUsers = yield UserDataClass.noticeList.get(songId);
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
    addNoticeList(songs) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const addSongs = [];
            const songList = (_a = yield __classPrivateFieldGet(this, _UserDataClass_database, "f").get('songList')) !== null && _a !== void 0 ? _a : {};
            for (const song of songs) {
                const videoId = song.video_id;
                if (songList[videoId] === undefined)
                    addSongs.push(song);
                songList[videoId] = song;
                UserDataClass.noticeList.change(videoId, (item = {}) => {
                    item[this.userId] = this.userId;
                    return item;
                });
            }
            __classPrivateFieldGet(this, _UserDataClass_database, "f").set('songList', songList);
            return addSongs;
        });
    }
    removeNoticeList(videoIds) {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const removeSongs = [];
            const songList = (_a = yield __classPrivateFieldGet(this, _UserDataClass_database, "f").get('songList')) !== null && _a !== void 0 ? _a : {};
            for (const videoId of videoIds) {
                if (songList[videoId] !== undefined)
                    removeSongs.push(songList[videoId]);
                delete songList[videoId];
                UserDataClass.noticeList.change(videoId, (item = {}) => {
                    delete item[this.userId];
                    return Object.keys(item).length ? item : undefined;
                });
            }
            __classPrivateFieldGet(this, _UserDataClass_database, "f").set('songList', songList);
            return removeSongs;
        });
    }
    clearNoticeList() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const songList = (_a = yield __classPrivateFieldGet(this, _UserDataClass_database, "f").get('songList')) !== null && _a !== void 0 ? _a : {};
            for (const videoId of Object.keys(songList)) {
                UserDataClass.noticeList.get(videoId).then((item = {}) => {
                    delete item[this.userId];
                    return Object.keys(item).length ? item : undefined;
                });
                delete songList[videoId];
            }
            __classPrivateFieldGet(this, _UserDataClass_database, "f").set('songList', songList);
        });
    }
    getSongList() {
        var _a;
        return __awaiter(this, void 0, void 0, function* () {
            const songList = (_a = yield __classPrivateFieldGet(this, _UserDataClass_database, "f").get('songList')) !== null && _a !== void 0 ? _a : {};
            return [...Object.values(songList)];
        });
    }
}
_UserDataClass_database = new WeakMap();
UserDataClass.noticeList = new SuperKeyv('sqlite://db.sqlite', { table: 'noticeList' });
client.once('ready', () => {
    var _a, _b, _c;
    console.log('Ready!');
    console.log((_a = client.user) === null || _a === void 0 ? void 0 : _a.tag);
    observeNextSong('/api/cafe/now_playing');
    const data = [{
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
    (_b = client.application) === null || _b === void 0 ? void 0 : _b.commands.set(data, (_c = process.env.TEST_SERVER_ID) !== null && _c !== void 0 ? _c : '');
});
client.on('interactionCreate', (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f, _g, _h;
    if (!interaction.isCommand() || interaction.commandName !== 'kcns' || !interaction.channel)
        return;
    try {
        switch (interaction.options.getSubcommand()) {
            case 'now': {
                const cafeNowP = KiiteAPI.getAPI('/api/cafe/user_count');
                const nowSong = yield KiiteAPI.getAPI('/api/cafe/now_playing');
                const rotateData = yield KiiteAPI.getAPI('/api/cafe/rotate_users', { ids: nowSong.id.toString() });
                const artistData = yield KiiteAPI.getAPI('/api/artist/id', { artist_id: nowSong.artist_id });
                interaction.reply({
                    embeds: [{
                            title: nowSong.title,
                            url: 'https://www.nicovideo.jp/watch/' + nowSong.baseinfo.video_id,
                            author: {
                                name: nowSong.baseinfo.user_nickname,
                                icon_url: nowSong.baseinfo.user_icon_url,
                                url: (_a = 'https://kiite.jp/creator/' + (artistData === null || artistData === void 0 ? void 0 : artistData.creator_id)) !== null && _a !== void 0 ? _a : ''
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
                                    value: (yield cafeNowP).toLocaleString('ja'),
                                    inline: true
                                },
                                {
                                    name: ':arrows_counterclockwise:回転数',
                                    value: ((_c = (_b = rotateData[nowSong.id]) === null || _b === void 0 ? void 0 : _b.length) !== null && _c !== void 0 ? _c : 0).toLocaleString('ja'),
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
                const args = (_d = interaction.options.getString('music_id')) === null || _d === void 0 ? void 0 : _d.split(',');
                if (!args)
                    throw new TypeError('error001');
                const userData = new UserDataClass(interaction.user.id);
                const songDataList = yield KiiteAPI.getAPI('/api/songs/by_video_ids', { video_ids: args.join(',') });
                const addListReturn = yield userData.addNoticeList(songDataList);
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
                const [arg] = (_f = (_e = interaction.options.getString('list_url')) === null || _e === void 0 ? void 0 : _e.match(/https?:\/\/[\w!?/+\-~=;.,*&@#$%()'[\]]+/)) !== null && _f !== void 0 ? _f : [];
                if (!arg)
                    throw new TypeError('list_urlにはURLを入力してください');
                if (arg.startsWith('https://kiite.jp/playlist/')) {
                    const [listId] = (_g = arg.match(/(?<=https:\/\/kiite.jp\/playlist\/)\w+/)) !== null && _g !== void 0 ? _g : [];
                    const songData = yield KiiteAPI.getAPI('/api/playlists/contents', { list_id: listId });
                    if (songData.status === 'failed')
                        throw new TypeError('プレイリストの取得に失敗しました。URLが間違っていないか確認してください。\nURLが正しい場合、Kiiteが混み合っている可能性があります。その場合は時間を置いてもう一度試してみてください。');
                }
                const userData = new UserDataClass(interaction.user.id);
                const addListReturn = yield userData.addNoticeList(songDataList);
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
                const songList = yield userData.getSongList();
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
                }
                else {
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
                eval((_h = interaction.options.getString('com')) !== null && _h !== void 0 ? _h : '');
            }
        }
    }
    catch (e) {
        console.error(e);
        const errorMessage = {
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
}));
function getStatusbar(nowPoint, endPoint, length) {
    const nowLength = nowPoint * (length + 1) / endPoint | 0;
    let statusbar = '';
    statusbar += (nowLength <= 0) ? '┠' : '┣';
    for (let i = 1; i < length - 1; i++) {
        if (i < nowLength) {
            statusbar += '━';
        }
        else if (i === nowLength) {
            statusbar += '╉';
        }
        else {
            statusbar += '─';
        }
    }
    statusbar += (length - 1 <= nowLength) ? '┫' : '┤';
    return statusbar;
}
function observeNextSong(apiUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const nextSong = yield KiiteAPI.getAPI(apiUrl);
            const nowTime = new Date().getTime();
            const startTime = new Date(nextSong.start_time).getTime();
            const msecDuration = Math.min(nextSong.msec_duration, 480e3);
            // UserDataClass.noticeSong(nextSong.video_id);
            setTimeout(() => { var _a; return (_a = client.user) === null || _a === void 0 ? void 0 : _a.setActivity({ name: nextSong.title, type: 'LISTENING' }); }, startTime - nowTime);
            setTimeout(observeNextSong.bind(null, '/api/cafe/next_song'), Math.max(startTime + msecDuration - 30e3 - nowTime, 3e3));
        }
        catch (e) {
            setTimeout(observeNextSong.bind(null, '/api/cafe/next_song'), 15e3);
        }
    });
}
client.login(process.env.TOKEN);
