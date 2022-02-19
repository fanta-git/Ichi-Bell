"use strict";
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
const discord_js_1 = require("discord.js");
const request_1 = __importDefault(require("request"));
require('dotenv').config();
const notificList = [];
let notificFlag = false;
let notificUserId = '';
let notificChannel;
const client = new discord_js_1.Client({
    intents: ['GUILDS', 'GUILD_MEMBERS', 'GUILD_MESSAGES']
});
client.once('ready', () => {
    var _a;
    console.log('Ready!');
    console.log((_a = client.user) === null || _a === void 0 ? void 0 : _a.tag);
});
client.on('messageCreate', (message) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    if (message.author.bot)
        return;
    if (message.content.startsWith('k!')) {
        const [, command, ...args] = message.content.trim().split(/[!,./-\s]/);
        // if ((/^n(ow)?$/i).test(command)) {
        //     // nanika
        // }
        // const exp = [
        //     {
        //         key: 'now',
        //         func: () => {
        //             // nanika
        //         }
        //     }
        // ];
        // for (const item of exp) {
        //     if ((new RegExp(`^(${item.key.charAt(0)}|${item.key})$`, 'i')).test(command)) {
        //         item.func(command, args);
        //     }
        // }
        switch (command) {
            case 'n':
            case 'now': {
                const nowSongP = getAPI('https://cafe.kiite.jp/api/cafe/now_playing');
                const cafeNowP = getAPI('https://cafe.kiite.jp/api/cafe/user_count');
                message.channel.send(`${(_a = (yield nowSongP)) === null || _a === void 0 ? void 0 : _a.title}\nCafeには現在${yield cafeNowP}人います！`);
                break;
            }
            case 'h':
            case 'help': {
                message.channel.send('KiiteCafeであなたの好きな曲が流れそうな時通知してくれるbotです\nコマンドは全て半角で入力してください\n`k!help` この文章を表示します\n`k!now` 現在Cafeで流れている曲とCafe内の人数を表示します');
                break;
            }
            case 's': {
                // nanika
                break;
            }
            case 'start': {
                notificFlag = true;
                notificUserId = message.author.id;
                notificChannel = message.channel;
                message.channel.send(`<@${message.author.id}> 通知リストの曲が選曲される直前に通知します！`);
                break;
            }
            case 'stop': {
                // nanika
                break;
            }
            case 'a':
            case 'add': {
                const pushList = yield getAPI('https://cafe.kiite.jp/api/songs/by_video_ids', { video_ids: args.join(',') });
                const pushListTitles = '\n' + pushList.map((v) => v.title).join('\n');
                notificList.push(...args);
                message.channel.send('以下の曲を通知リストに追加しました！' + pushListTitles);
                break;
            }
            case 'r':
            case 'remove': {
                // nanika
                break;
            }
            case 'l':
            case 'list': {
                // nanika
                break;
            }
            case 'c':
            case 'clear': {
                // nanika
                break;
            }
        }
    }
}));
function observeNextSong() {
    return __awaiter(this, void 0, void 0, function* () {
        const nextSong = yield getAPI('https://cafe.kiite.jp/api/cafe/next_song');
        const nowTime = new Date().getTime();
        const startTime = new Date(nextSong.start_time).getTime();
        const msecDuration = Math.min(nextSong.msec_duration, 480e3);
        if (notificFlag) {
            if (notificList.some(e => e === nextSong.video_id)) {
                notificChannel.send(`<@${notificUserId}> リストの曲が流れるよ！`);
            }
        }
        console.log(nextSong.start_time, nextSong.title);
        setTimeout(observeNextSong, Math.max(startTime + msecDuration - 30e3 - nowTime, 3e3));
    });
}
function getAPI(url, queryParam = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        const { response, body } = yield new Promise(resolve => (0, request_1.default)({ url: url, qs: queryParam, json: true }, (error, response, body) => {
            resolve(Object.assign({}, { error: error, response: response, body: body }));
        }));
        if (response.statusCode === 200) {
            console.log('APIを呼び出しました');
            return body;
        }
        else {
            console.log('APIの読み込みに失敗しました');
            return null;
        }
    });
}
client.login(process.env.TOKEN);
observeNextSong();
