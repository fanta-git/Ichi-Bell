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
var _a, _UserDataClass_noticeList, _UserDataClass_userData, _UserDataClass_database, _UserDataClass_userId, _ResponseIntetaction_interaction, _ResponseIntetaction_options, _ResponseIntetaction_timeout;
Object.defineProperty(exports, "__esModule", { value: true });
const discord = __importStar(require("discord.js"));
const KiiteAPI = __importStar(require("./KiiteAPI"));
const keyv_1 = __importDefault(require("keyv"));
const log4js_1 = __importDefault(require("log4js"));
require('dotenv').config();
const client = new discord.Client({ intents: ['GUILDS'] });
const logger = log4js_1.default.getLogger('main');
const errorlog = log4js_1.default.getLogger('error');
log4js_1.default.configure('./log-config.json');
class UserDataClass {
    constructor(userId) {
        _UserDataClass_database.set(this, void 0);
        _UserDataClass_userId.set(this, void 0);
        __classPrivateFieldSet(this, _UserDataClass_userId, userId, "f");
        __classPrivateFieldSet(this, _UserDataClass_database, __classPrivateFieldGet(UserDataClass, _a, "f", _UserDataClass_userData).get(userId).then(item => item !== null && item !== void 0 ? item : {}), "f");
    }
    static noticeSong(songId) {
        var _b;
        var _c;
        return __awaiter(this, void 0, void 0, function* () {
            const userIds = yield __classPrivateFieldGet(UserDataClass, _a, "f", _UserDataClass_noticeList).get(songId);
            const forChannels = {};
            const forDMs = [];
            if (!userIds)
                return;
            for (const userId of Object.keys(userIds)) {
                const userData = new UserDataClass(userId);
                if (yield userData.isDM()) {
                    const user = client.users.cache.get(userId);
                    if (user)
                        forDMs.push(user);
                }
                else {
                    const channel = yield userData.getChannel();
                    if (channel === undefined) {
                        userData.unregisterNoticeList();
                        logger.info('delete', userId);
                    }
                    else {
                        channel.guild.members.fetch(userId).catch(_ => {
                            userData.unregisterNoticeList();
                            logger.info('delete', userId);
                        });
                        (_b = forChannels[_c = channel.id]) !== null && _b !== void 0 ? _b : (forChannels[_c] = { channel: channel, userIds: [] });
                        forChannels[channel.id].userIds.push(userId);
                    }
                }
            }
            for (const user of forDMs) {
                user.send('リストの曲が流れるよ！');
            }
            for (const key of Object.keys(forChannels)) {
                forChannels[key].channel.send(forChannels[key].userIds.map(e => `<@${e}>`).join('') + 'リストの曲が流れるよ！');
            }
            return Object.keys(userIds);
        });
    }
    registerNoticeList(playlistData, channelId, dm) {
        return __awaiter(this, void 0, void 0, function* () {
            const { userId } = yield __classPrivateFieldGet(this, _UserDataClass_database, "f");
            if (userId)
                yield this.unregisterNoticeList();
            for (const song of playlistData.songs) {
                __classPrivateFieldGet(UserDataClass, _a, "f", _UserDataClass_noticeList).get(song.video_id).then((item = {}) => {
                    item[__classPrivateFieldGet(this, _UserDataClass_userId, "f")] = __classPrivateFieldGet(this, _UserDataClass_userId, "f");
                    __classPrivateFieldGet(UserDataClass, _a, "f", _UserDataClass_noticeList).set(song.video_id, item);
                });
            }
            __classPrivateFieldGet(UserDataClass, _a, "f", _UserDataClass_userData).set(__classPrivateFieldGet(this, _UserDataClass_userId, "f"), {
                userId: __classPrivateFieldGet(this, _UserDataClass_userId, "f"),
                channelId: channelId,
                dm: dm,
                registeredList: playlistData
            });
            return true;
        });
    }
    updateNoticeList(channelId, dm) {
        return __awaiter(this, void 0, void 0, function* () {
            const { registeredList, channelId: registedChannelId } = yield __classPrivateFieldGet(this, _UserDataClass_database, "f");
            if (registeredList === undefined)
                throw new Error('リストが登録されていません！`/ib register`コマンドを使ってリストを登録しましょう！');
            const songListData = yield KiiteAPI.getAPI('/api/playlists/contents/detail', { list_id: registeredList.list_id });
            if (songListData.status === 'failed')
                throw new Error(`プレイリストの取得に失敗しました！登録されていたリスト（${registeredList.list_title}）は存在していますか？\n存在している場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。`);
            if (registedChannelId === channelId && songListData.updated_at === registeredList.updated_at)
                throw new Error('プレイリストは最新の状態です！');
            this.registerNoticeList(songListData, channelId, dm);
            return songListData;
        });
    }
    unregisterNoticeList() {
        return __awaiter(this, void 0, void 0, function* () {
            const { registeredList } = yield __classPrivateFieldGet(this, _UserDataClass_database, "f");
            if (registeredList === undefined)
                throw new Error('リストが登録されていません！');
            __classPrivateFieldGet(UserDataClass, _a, "f", _UserDataClass_userData).delete(__classPrivateFieldGet(this, _UserDataClass_userId, "f"));
            for (const songData of registeredList.songs) {
                __classPrivateFieldGet(UserDataClass, _a, "f", _UserDataClass_noticeList).get(songData.video_id).then((item = {}) => {
                    delete item[__classPrivateFieldGet(this, _UserDataClass_userId, "f")];
                    if (Object.keys(item).length) {
                        __classPrivateFieldGet(UserDataClass, _a, "f", _UserDataClass_noticeList).set(songData.video_id, item);
                    }
                    else {
                        __classPrivateFieldGet(UserDataClass, _a, "f", _UserDataClass_noticeList).delete(songData.video_id);
                    }
                });
            }
            return registeredList;
        });
    }
    getRegisteredList() {
        return __awaiter(this, void 0, void 0, function* () {
            const { registeredList } = yield __classPrivateFieldGet(this, _UserDataClass_database, "f");
            if (registeredList === undefined)
                throw new Error('リストが登録されていません！`/ib register`コマンドを使ってリストを登録しましょう！');
            return registeredList;
        });
    }
    getChannel() {
        return __awaiter(this, void 0, void 0, function* () {
            const { channelId } = yield __classPrivateFieldGet(this, _UserDataClass_database, "f");
            if (channelId === undefined)
                return undefined;
            return client.channels.cache.get(channelId);
        });
    }
    isDM() {
        return __awaiter(this, void 0, void 0, function* () {
            const { dm } = yield __classPrivateFieldGet(this, _UserDataClass_database, "f");
            return dm;
        });
    }
}
_a = UserDataClass, _UserDataClass_database = new WeakMap(), _UserDataClass_userId = new WeakMap();
_UserDataClass_noticeList = { value: new keyv_1.default('sqlite://db.sqlite', { table: 'noticeList' }) };
_UserDataClass_userData = { value: new keyv_1.default('sqlite://db.sqlite', { table: 'userData' }) };
class ResponseIntetaction {
    constructor(interaction) {
        _ResponseIntetaction_interaction.set(this, void 0);
        _ResponseIntetaction_options.set(this, void 0);
        _ResponseIntetaction_timeout.set(this, void 0);
        __classPrivateFieldSet(this, _ResponseIntetaction_interaction, interaction, "f");
    }
    standby(options) {
        __classPrivateFieldSet(this, _ResponseIntetaction_options, options, "f");
        __classPrivateFieldSet(this, _ResponseIntetaction_timeout, setTimeout(() => __classPrivateFieldGet(this, _ResponseIntetaction_interaction, "f").deferReply(options), 2e3), "f");
    }
    reply(options) {
        if (__classPrivateFieldGet(this, _ResponseIntetaction_interaction, "f").replied || __classPrivateFieldGet(this, _ResponseIntetaction_interaction, "f").deferred) {
            return __classPrivateFieldGet(this, _ResponseIntetaction_interaction, "f").editReply(options);
        }
        else {
            if (__classPrivateFieldGet(this, _ResponseIntetaction_timeout, "f") !== undefined)
                clearTimeout(__classPrivateFieldGet(this, _ResponseIntetaction_timeout, "f"));
            return __classPrivateFieldGet(this, _ResponseIntetaction_interaction, "f").reply(Object.assign(Object.assign({}, options), __classPrivateFieldGet(this, _ResponseIntetaction_options, "f")));
        }
    }
}
_ResponseIntetaction_interaction = new WeakMap(), _ResponseIntetaction_options = new WeakMap(), _ResponseIntetaction_timeout = new WeakMap();
client.once('ready', () => {
    var _b, _c;
    logger.info(((_b = client.user) === null || _b === void 0 ? void 0 : _b.tag) + ' Ready!');
    observeNextSong();
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
    (_c = client.application) === null || _c === void 0 ? void 0 : _c.commands.set(data);
});
client.on('interactionCreate', (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    var _b, _c, _d, _e, _f, _g;
    if (!interaction.isCommand() || interaction.commandName !== 'ib')
        return;
    const replyManager = new ResponseIntetaction(interaction);
    try {
        switch (interaction.options.getSubcommand()) {
            case 'now': {
                replyManager.standby({ ephemeral: true });
                const cafeNowP = KiiteAPI.getAPI('/api/cafe/user_count');
                const nowSong = yield KiiteAPI.getAPI('/api/cafe/now_playing');
                const rotateData = yield KiiteAPI.getAPI('/api/cafe/rotate_users', { ids: nowSong.id.toString() });
                const artistData = yield KiiteAPI.getAPI('/api/artist/id', { artist_id: nowSong.artist_id });
                yield replyManager.reply({
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
                        }]
                });
                break;
            }
            case 'register': {
                replyManager.standby({ ephemeral: true });
                const url = interaction.options.getString('url');
                const [listId] = (_e = url.match(/(?<=https:\/\/kiite.jp\/playlist\/)\w+/)) !== null && _e !== void 0 ? _e : [];
                if (!listId)
                    throw new Error('URLが正しくありません！`https://kiite.jp/playlist/`で始まるURLを入力してください！');
                const songListData = yield KiiteAPI.getAPI('/api/playlists/contents/detail', { list_id: listId });
                if (songListData.status === 'failed')
                    throw new Error('プレイリストの取得に失敗しました！URLが間違っていませんか？\nURLが正しい場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。');
                const userData = new UserDataClass(interaction.user.id);
                yield userData.registerNoticeList(songListData, interaction.channelId, !interaction.inGuild());
                yield replyManager.reply({
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
                const registeredList = yield userData.getRegisteredList();
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
                const songListData = yield userData.updateNoticeList(interaction.channelId, !interaction.inGuild());
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
                const target = (_f = interaction.options.getUser('target')) !== null && _f !== void 0 ? _f : interaction.user;
                const myself = target.id === interaction.user.id;
                if (!myself && !((_g = interaction.memberPermissions) === null || _g === void 0 ? void 0 : _g.has('MANAGE_CHANNELS'))) {
                    replyManager.standby({ ephemeral: true });
                    throw Error('指定ユーザーのリスト登録解除にはチャンネルの管理権限が必要です！');
                }
                replyManager.standby(myself ? { ephemeral: true } : undefined);
                const userData = new UserDataClass(target.id);
                yield userData.unregisterNoticeList();
                replyManager.reply({
                    content: myself ? 'リストの登録を解除しました！' : `<@${target.id}>のリストの登録を解除しました！`
                });
            }
        }
    }
    catch (e) {
        if (e instanceof Error) {
            replyManager.reply({
                embeds: [{
                        title: e.name,
                        description: e.message,
                        color: '#ff0000'
                    }]
            }).catch(e => errorlog.error(e));
        }
        else {
            errorlog.error(e);
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
function observeNextSong() {
    return __awaiter(this, void 0, void 0, function* () {
        let getNext = false;
        while (true) {
            try {
                const apiUrl = (getNext ? '/api/cafe/next_song' : '/api/cafe/now_playing');
                const cafeSongData = yield KiiteAPI.getAPI(apiUrl);
                const nowTime = new Date().getTime();
                const startTime = new Date(cafeSongData.start_time).getTime();
                const endTime = startTime + Math.min(cafeSongData.msec_duration, 480e3);
                UserDataClass.noticeSong(cafeSongData.video_id);
                setTimeout(() => { var _b; return (_b = client.user) === null || _b === void 0 ? void 0 : _b.setActivity({ name: cafeSongData.title, type: 'LISTENING' }); }, Math.max(startTime - nowTime, 0));
                if (getNext)
                    yield new Promise(resolve => setTimeout(resolve, Math.max(endTime - 60e3 - nowTime, 3e3)));
                getNext = new Date().getTime() < endTime;
            }
            catch (e) {
                errorlog.error(e);
                yield new Promise(resolve => setTimeout(resolve, 15e3));
            }
        }
    });
}
client.login(process.env.TOKEN);
