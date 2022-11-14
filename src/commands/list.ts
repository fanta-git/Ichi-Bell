import { ApplicationCommandOptionType } from 'discord.js';
import sendNote from '../noteSend';
import { formatLastPlayed, formatListDataEmbed, sendWarning, subdivision } from '../embedsUtil';
import fetchCafeAPI from '../fetchCafeAPI';
import SlashCommand from '../SlashCommand';
import db from '../database/db';

const LIMIT = 10;
const OPTIONS = {
    SORT: 'sort',
    LIMIT: 'limit'
};
const CHOICE = {
    DEFAULT: 'default',
    COOLTIME: 'cooltime'
} as const;
const EMBED_DESCRIPTION_LIMIT = 4096;

const list: SlashCommand = {
    name: 'list',
    description: '登録されているリストの情報を表示します',
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: OPTIONS.SORT,
            description: '表示順',
            choices: [
                { name: 'default', value: CHOICE.DEFAULT },
                { name: 'cooltime', value: CHOICE.COOLTIME }
            ]
        },
        {
            type: ApplicationCommandOptionType.Integer,
            name: OPTIONS.LIMIT,
            description: '1ページに表示する曲数',
            maxValue: 25
        }
    ],
    execute: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const sortType = interaction.options.getString(OPTIONS.SORT) ?? CHOICE.DEFAULT;
        const limit = interaction.options.getInteger(OPTIONS.LIMIT) ?? LIMIT;
        const { playlist } = await db.getUser(interaction.user.id) ?? {};
        if (playlist === undefined) return sendWarning(interaction, 'NOTEXIST_LIST');

        const videoIds = playlist.songs.map(v => v.video_id);
        const details = await fetchCafeAPI('/api/songs/by_video_ids', { video_ids: videoIds });
        const playeds = await fetchCafeAPI('/api/cafe/played', { video_ids: videoIds });

        const playlistDataPage = formatListDataEmbed(playlist);

        const displayDataList = playlist.songs.map(item => ({
            videoId: item.video_id,
            title: details.find(v => v.video_id === item.video_id)?.title,
            lastStartTime: playeds.find(v => v.video_id === item.video_id)?.start_time,
            order: item.order_num
        }));

        if (sortType === CHOICE.COOLTIME) {
            displayDataList.sort((a, b) => {
                if (a.lastStartTime === undefined && b.lastStartTime === undefined) return a.order - b.order;
                if (a.lastStartTime === undefined) return -1;
                if (b.lastStartTime === undefined) return 1;
                return Date.parse(a.lastStartTime) - Date.parse(b.lastStartTime);
            });
        }

        const playedLines = displayDataList.map((item, i) => {
            const title = `[${item.title}](https://www.nicovideo.jp/watch/${item.videoId})`;
            const lastPlayed = formatLastPlayed(item.lastStartTime);

            return `**${i + 1}.**${title}\n└${lastPlayed ? lastPlayed + 'に選曲されました' : '__選曲可能です__'}`;
        });

        const songDataPages = subdivision(playedLines, limit).map(v => ({
            title: `${playlist.list_title}`,
            url: `https://kiite.jp/playlist/${playlist.list_id}`,
            description: `**全${playlist.songs.length}曲**\n` + v.join('\n')
        }));

        if (songDataPages.some(v => v.description.length > EMBED_DESCRIPTION_LIMIT)) {
            return sendWarning(interaction, 'OVER_CHARLENGTH');
        }

        await sendNote(interaction, [playlistDataPage, ...songDataPages]);
    }
};

export { list };
