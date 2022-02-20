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
Object.defineProperty(exports, "__esModule", { value: true });
const discord = __importStar(require("discord.js"));
const KiiteAPI_1 = require("./KiiteAPI");
require('dotenv').config();
const notificList = {};
const client = new discord.Client({ intents: [discord.Intents.FLAGS.GUILDS] });
const listSongFormat = (title) => title.map((v, k) => `**${k + 1}. **${v}`);
client.once('ready', () => {
    var _a, _b, _c;
    console.log('Ready!');
    console.log((_a = client.user) === null || _a === void 0 ? void 0 : _a.tag);
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
                }
            ]
        }];
    (_b = client.application) === null || _b === void 0 ? void 0 : _b.commands.set(data, (_c = process.env.TEST_SERVER_ID) !== null && _c !== void 0 ? _c : '');
});
client.on('interactionCreate', (interaction) => __awaiter(void 0, void 0, void 0, function* () {
    var _a, _b, _c;
    var _d;
    if (!interaction.isCommand() || interaction.commandName !== 'kcns')
        return;
    switch (interaction.options.getSubcommand()) {
        case 'now': {
            const nowSongP = (0, KiiteAPI_1.getAPI)('https://cafe.kiite.jp/api/cafe/now_playing');
            const cafeNowP = (0, KiiteAPI_1.getAPI)('https://cafe.kiite.jp/api/cafe/user_count');
            interaction.reply({
                content: `${(_a = (yield nowSongP)) === null || _a === void 0 ? void 0 : _a.title}\nCafeには現在${yield cafeNowP}人います！`,
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
            const args = (_b = interaction.options.getString('music_id')) === null || _b === void 0 ? void 0 : _b.split(',');
            if (args) {
                (_c = notificList[_d = interaction.user.id]) !== null && _c !== void 0 ? _c : (notificList[_d] = {
                    flag: false,
                    channel: interaction.channel,
                    userId: interaction.user.id,
                    songList: []
                });
                const pushList = yield (0, KiiteAPI_1.getAPI)('https://cafe.kiite.jp/api/songs/by_video_ids', { video_ids: args.join(',') });
                console.log('pushList: ', pushList);
                const pushListTitles = pushList.map((v) => v.title);
                notificList[interaction.user.id].songList.push(...args);
                interaction.reply({
                    embeds: [{
                            fields: [
                                {
                                    name: '以下の曲を通知リストに追加しました！',
                                    value: listSongFormat(pushListTitles).join('\n')
                                }
                            ]
                        }],
                    ephemeral: true
                });
            }
            break;
        }
        // case 'r':
        // case 'remove': {
        //     // nanika
        //     break;
        // }
        case 'list': {
            const pushList = yield (0, KiiteAPI_1.getAPI)('https://cafe.kiite.jp/api/songs/by_video_ids', { video_ids: notificList[interaction.user.id].songList.join(',') });
            interaction.reply({
                embeds: [{
                        fields: [
                            {
                                name: `全${pushList.length}曲`,
                                value: listSongFormat(pushList.map((v) => v.title)).join('\n')
                            }
                        ]
                    }],
                ephemeral: true
            });
            break;
        }
        // case 'c':
        // case 'clear': {
        //     // nanika
        //     break;
        // }
    }
}));
function observeNextSong(apiUrl) {
    var _a;
    return __awaiter(this, void 0, void 0, function* () {
        const nextSong = yield (0, KiiteAPI_1.getAPI)(apiUrl);
        const nowTime = new Date().getTime();
        const startTime = new Date(nextSong.start_time).getTime();
        const msecDuration = Math.min(nextSong.msec_duration, 480e3);
        for (const key in notificList) {
            if (notificList.flag && notificList[key].songList.some(e => e === nextSong.video_id)) {
                (_a = notificList[key].channel) === null || _a === void 0 ? void 0 : _a.send(`<@${notificList[key].userId}> リストの曲が流れるよ！`);
            }
        }
        setTimeout(observeNextSong.bind(null, 'https://cafe.kiite.jp/api/cafe/next_song'), Math.max(startTime + msecDuration - 30e3 - nowTime, 3e3));
    });
}
client.login(process.env.TOKEN);
observeNextSong('https://cafe.kiite.jp/api/cafe/now_playing');
