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
var _a, _UserDataClass_noticeList, _UserDataClass_database, _UserDataClass_userId;
Object.defineProperty(exports, "__esModule", { value: true });
const discord = __importStar(require("discord.js"));
const KiiteAPI = __importStar(require("./KiiteAPI"));
const keyv_1 = __importDefault(require("keyv"));
require('dotenv').config();
const client = new discord.Client({ intents: ['GUILDS'] });
class UserDataClass {
    constructor(userId) {
        _UserDataClass_database.set(this, void 0);
        _UserDataClass_userId.set(this, void 0);
        __classPrivateFieldSet(this, _UserDataClass_database, new keyv_1.default('sqlite://db.sqlite', { table: `user_${userId}` }), "f");
        __classPrivateFieldSet(this, _UserDataClass_userId, userId, "f");
    }
    static noticeSong(songId) {
        var _b;
        var _c;
        return __awaiter(this, void 0, void 0, function* () {
            const userIds = yield __classPrivateFieldGet(UserDataClass, _a, "f", _UserDataClass_noticeList).get(songId);
            const sendData = {};
            if (!userIds)
                return;
            for (const userId of Object.keys(userIds)) {
                const userData = new UserDataClass(userId);
                const channel = yield userData.getChannel();
                if (channel === undefined)
                    throw new Error('チャンネルが見つかりませんでした。リストを再登録してください。');
                (_b = sendData[_c = channel.id]) !== null && _b !== void 0 ? _b : (sendData[_c] = { server: channel, userIds: [] });
                sendData[channel.id].userIds.push(userId);
            }
            for (const key of Object.keys(sendData)) {
                sendData[key].server.send(sendData[key].userIds.map(e => `<@${e}>`).join('') + 'リストの曲が流れるよ！');
            }
        });
    }
    registerNoticeList(playlistData, channelId) {
        return __awaiter(this, void 0, void 0, function* () {
            const nowRegisteredList = yield __classPrivateFieldGet(this, _UserDataClass_database, "f").get('registeredList');
            if (nowRegisteredList !== undefined)
                yield this.unregisterNoticeList();
            for (const song of playlistData.songs) {
                __classPrivateFieldGet(UserDataClass, _a, "f", _UserDataClass_noticeList).get(song.video_id).then((item = {}) => {
                    item[__classPrivateFieldGet(this, _UserDataClass_userId, "f")] = __classPrivateFieldGet(this, _UserDataClass_userId, "f");
                    __classPrivateFieldGet(UserDataClass, _a, "f", _UserDataClass_noticeList).set(song.video_id, item);
                });
            }
            __classPrivateFieldGet(this, _UserDataClass_database, "f").set('userId', __classPrivateFieldGet(this, _UserDataClass_userId, "f"));
            __classPrivateFieldGet(this, _UserDataClass_database, "f").set('channelId', channelId);
            __classPrivateFieldGet(this, _UserDataClass_database, "f").set('registeredList', playlistData);
            return true;
        });
    }
    unregisterNoticeList() {
        return __awaiter(this, void 0, void 0, function* () {
            const registeredList = yield __classPrivateFieldGet(this, _UserDataClass_database, "f").get('registeredList');
            if (registeredList === undefined)
                return;
            __classPrivateFieldGet(this, _UserDataClass_database, "f").delete('registeredList');
            for (const videoId of registeredList.songs.map(v => v.video_id)) {
                __classPrivateFieldGet(UserDataClass, _a, "f", _UserDataClass_noticeList).get(videoId).then((item = {}) => {
                    delete item[__classPrivateFieldGet(this, _UserDataClass_userId, "f")];
                    return Object.keys(item).length ? item : undefined;
                });
            }
            return registeredList;
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
_a = UserDataClass, _UserDataClass_database = new WeakMap(), _UserDataClass_userId = new WeakMap();
_UserDataClass_noticeList = { value: new keyv_1.default('sqlite://db.sqlite', { table: 'noticeList' }) };
client.once('ready', () => {
    var _b, _c, _d;
    console.log('Ready!');
    console.log((_b = client.user) === null || _b === void 0 ? void 0 : _b.tag);
    observeNextSong('/api/cafe/now_playing');
    const data = [{
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
    (_c = client.application) === null || _c === void 0 ? void 0 : _c.commands.set(data, (_d = process.env.TEST_SERVER_ID) !== null && _d !== void 0 ? _d : '');
});
client.on('interactionCreate', (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d, _e, _f, _g, _h, _j;
    if (!interaction.channel)
        return;
    if (!(interaction.isButton() || interaction.isCommand()))
        return;
    try {
        if (interaction.isCommand() && interaction.commandName === 'ib') {
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
                                    url: (_b = 'https://kiite.jp/creator/' + (artistData === null || artistData === void 0 ? void 0 : artistData.creator_id)) !== null && _b !== void 0 ? _b : ''
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
                                        value: (yield cafeNowP).toLocaleString('ja'),
                                        inline: true
                                    },
                                    {
                                        name: ':arrows_counterclockwise:回転数',
                                        value: ((_d = (_c = rotateData[nowSong.id]) === null || _c === void 0 ? void 0 : _c.length) !== null && _d !== void 0 ? _d : 0).toLocaleString('ja'),
                                        inline: true
                                    }
                                ]
                            }],
                        ephemeral: true
                    });
                    break;
                }
                case 'register': {
                    const [arg] = (_f = (_e = interaction.options.getString('list_url')) === null || _e === void 0 ? void 0 : _e.match(/https?:\/\/[\w!?/+\-~=;.,*&@#$%()'[\]]+/)) !== null && _f !== void 0 ? _f : [];
                    const [listId] = (_g = arg.match(/(?<=https:\/\/kiite.jp\/playlist\/)\w+/)) !== null && _g !== void 0 ? _g : [];
                    const songListData = yield KiiteAPI.getAPI('/api/playlists/contents/detail', { list_id: listId.trim() });
                    if (songListData.status === 'failed')
                        throw new Error('プレイリストの取得に失敗しました！URLが間違っていませんか？\nURLが正しい場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。');
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
                    const registeredList = yield userData.getRegisteredList();
                    if (registeredList === undefined)
                        throw new Error('リストが登録されていません！`/ib register`コマンドを使ってリストを登録しましょう！');
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
                    const nowRegisteredList = yield userData.getRegisteredList();
                    if (nowRegisteredList === undefined)
                        throw new Error('リストが登録されていません！`/ib register`コマンドを使ってリストを登録しましょう！');
                    const songListData = yield KiiteAPI.getAPI('/api/playlists/contents/detail', { list_id: nowRegisteredList.list_id });
                    if (songListData.status === 'failed')
                        throw new Error(`プレイリストの取得に失敗しました！登録されていたリスト（${nowRegisteredList.list_title}）は存在していますか？\n存在している場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。`);
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
                    const target = (_h = interaction.options.getUser('target')) !== null && _h !== void 0 ? _h : interaction.user;
                    if (target.id !== interaction.user.id && ((_j = interaction.memberPermissions) === null || _j === void 0 ? void 0 : _j.has('MANAGE_CHANNELS')))
                        throw Error('自分以外のユーザーのリスト登録解除にはチャンネルの管理権限が必要です！');
                    const userData = new UserDataClass(target.id);
                    const unregisterSuccess = userData.unregisterNoticeList();
                    if (unregisterSuccess === undefined)
                        throw Error('リストが登録されていません！');
                    interaction.reply(`<@${target.id}>のリストの登録を解除しました！`);
                }
            }
        }
    }
    catch (e) {
        if (e instanceof Error) {
            interaction.reply({
                embeds: [{
                        title: e.name,
                        description: e.message,
                        color: '#ff0000'
                    }],
                ephemeral: true
            });
        }
        else {
            console.error(e);
        }
    }
}));
function makeStatusbar(nowPoint, endPoint, length) {
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
function msTommss(ms) {
    return `${ms / 60e3 | 0}:${((ms / 1e3 | 0) % 60).toString().padStart(2, '0')}`;
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
            setTimeout(() => { var _b; return (_b = client.user) === null || _b === void 0 ? void 0 : _b.setActivity({ name: nextSong.title, type: 'LISTENING' }); }, startTime - nowTime);
            setTimeout(observeNextSong.bind(null, '/api/cafe/next_song'), Math.max(startTime + msecDuration - 60e3 - nowTime, 3e3));
        }
        catch (e) {
            setTimeout(observeNextSong.bind(null, '/api/cafe/next_song'), 15e3);
        }
    });
}
client.login(process.env.TOKEN);
