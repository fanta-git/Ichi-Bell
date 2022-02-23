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
    getMulti(...namesapces) {
        return __awaiter(this, void 0, void 0, function* () {
            const promises = [];
            for (const namespace of namesapces)
                promises.push(this.get(namespace));
            return yield Promise.all(promises);
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
        var _a;
        var _b;
        return __awaiter(this, void 0, void 0, function* () {
            const userIds = yield UserDataClass.noticeList.get(songId);
            const sendData = {};
            if (!userIds)
                return;
            for (const userId of Object.keys(userIds)) {
                const userData = new UserDataClass(userId);
                const channel = yield userData.getChannel();
                if (channel === undefined)
                    throw new Error('チャンネルが見つかりませんでした。リストを再登録してください。');
                (_a = sendData[_b = channel.id]) !== null && _a !== void 0 ? _a : (sendData[_b] = { server: channel, userIds: [] });
                sendData[channel.id].userIds.push(userId);
            }
            for (const key of Object.keys(sendData)) {
                sendData[key].server.send(sendData[key].userIds.map(e => `<@${e}>`).join('') + 'リストの曲が流れるよ！');
            }
        });
    }
    registerNoticeList(playlistData, userId, channelId) {
        return __awaiter(this, void 0, void 0, function* () {
            const nowRegisteredList = yield __classPrivateFieldGet(this, _UserDataClass_database, "f").get('registeredList');
            if (nowRegisteredList !== undefined)
                yield this.releaseNoticeList();
            for (const song of playlistData.songs) {
                UserDataClass.noticeList.change(song.video_id, (item = {}) => {
                    item[this.userId] = this.userId;
                    return item;
                });
            }
            __classPrivateFieldGet(this, _UserDataClass_database, "f").set('userId', userId);
            __classPrivateFieldGet(this, _UserDataClass_database, "f").set('channelId', channelId);
            __classPrivateFieldGet(this, _UserDataClass_database, "f").set('registeredList', playlistData);
            return true;
        });
    }
    releaseNoticeList() {
        return __awaiter(this, void 0, void 0, function* () {
            const registeredList = yield __classPrivateFieldGet(this, _UserDataClass_database, "f").get('registeredList');
            if (registeredList === undefined)
                return;
            __classPrivateFieldGet(this, _UserDataClass_database, "f").delete('registeredList');
            for (const videoId of registeredList.songs.map(v => v.video_id)) {
                UserDataClass.noticeList.get(videoId).then((item = {}) => {
                    delete item[this.userId];
                    return Object.keys(item).length ? item : undefined;
                });
            }
        });
    }
    getRegisteredList() {
        return __awaiter(this, void 0, void 0, function* () {
            const registeredList = yield __classPrivateFieldGet(this, _UserDataClass_database, "f").get('registeredList');
            return registeredList;
        });
    }
    getChannel() {
        return __awaiter(this, void 0, void 0, function* () {
            const channelId = yield __classPrivateFieldGet(this, _UserDataClass_database, "f").get('channelId');
            if (channelId === undefined)
                return undefined;
            return client.channels.cache.get(channelId);
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
    (_b = client.application) === null || _b === void 0 ? void 0 : _b.commands.set(data, (_c = process.env.TEST_SERVER_ID) !== null && _c !== void 0 ? _c : '');
});
client.on('interactionCreate', (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c, _d, _e, _f;
    if (!interaction.isCommand() || interaction.commandName !== 'ib' || !interaction.channel)
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
            case 'register': {
                const [arg] = (_e = (_d = interaction.options.getString('list_url')) === null || _d === void 0 ? void 0 : _d.match(/https?:\/\/[\w!?/+\-~=;.,*&@#$%()'[\]]+/)) !== null && _e !== void 0 ? _e : [];
                if (!arg)
                    throw new TypeError('list_urlにはURLを入力してください');
                const [listId] = (_f = arg.match(/(?<=https:\/\/kiite.jp\/playlist\/)\w+/)) !== null && _f !== void 0 ? _f : [];
                const songData = yield KiiteAPI.getAPI('/api/playlists/contents/detail', { list_id: listId.trim() });
                if (songData.status === 'failed')
                    throw new TypeError('プレイリストの取得に失敗しました。URLが間違っていないか確認してください。\nURLが正しい場合、Kiiteが混み合っている可能性があります。その場合は時間を置いてもう一度試してみてください。');
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
                const registeredList = yield userData.getRegisteredList();
                if (registeredList === undefined) {
                    interaction.reply({
                        content: 'リストは空っぽです！`/ib register`コマンドを使ってリストを登録しましょう！',
                        ephemeral: true
                    });
                }
                else {
                    const songData = yield KiiteAPI.getAPI('/api/songs/by_video_ids', { video_ids: registeredList.songs.map(v => v.video_id).join(',') });
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
// function * zip (...args: any[][]) {
//     const length = args[0].length;
//     for (const arr of args) {
//         if (arr.length !== length) return undefined;
//     }
//     for (let i = 0; i < length; i++) yield args.map(v => v[i]);
// }
function observeNextSong(apiUrl) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const nextSong = yield KiiteAPI.getAPI(apiUrl);
            const nowTime = new Date().getTime();
            const startTime = new Date(nextSong.start_time).getTime();
            const msecDuration = Math.min(nextSong.msec_duration, 480e3);
            UserDataClass.noticeSong(nextSong.video_id);
            setTimeout(() => { var _a; return (_a = client.user) === null || _a === void 0 ? void 0 : _a.setActivity({ name: nextSong.title, type: 'LISTENING' }); }, startTime - nowTime);
            setTimeout(observeNextSong.bind(null, '/api/cafe/next_song'), Math.max(startTime + msecDuration - 60e3 - nowTime, 3e3));
        }
        catch (e) {
            setTimeout(observeNextSong.bind(null, '/api/cafe/next_song'), 15e3);
        }
    });
}
client.login(process.env.TOKEN);
