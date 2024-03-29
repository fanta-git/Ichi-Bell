import { APIEmbed, ApplicationCommandOptionType, escapeMarkdown, hyperlink, time } from 'discord.js';
import { CommandsWarn } from '../customErrors';
import db from '../database/db';
import { WARN_MESSAGES, formatListDataEmbed, formatTitle, subdivision } from '../embedsUtil';
import fetchCafeAPI from '../fetchCafeAPI';
import sendNote from '../noteSend';
import SlashCommand from './SlashCommand';
import { sort } from 'fast-sort';

type DisplayDataList = {
    videoId: string;
    title: string;
    lastStartTime: Date | undefined;
    order: number;
}[];

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

const sorter: Record<string, ((arr: DisplayDataList) => DisplayDataList) | undefined> = {
    [CHOICE.DEFAULT]: arr => sort(arr).asc(v => v.order),
    [CHOICE.COOLTIME]: arr => sort(arr).by([
        { desc: v => v.lastStartTime?.getTime() },
        { asc: v => v.order }
    ])
};

const list: SlashCommand = {
    data: {
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
        ]
    },
    execute: async interaction => {
        await interaction.deferReply({ ephemeral: true });

        const sortType = interaction.options.getString(OPTIONS.SORT) ?? CHOICE.DEFAULT;
        const limit = interaction.options.getInteger(OPTIONS.LIMIT) ?? LIMIT;
        const user = await db.getUser(interaction.user.id);
        if (user === undefined) throw new CommandsWarn(WARN_MESSAGES.NOTEXIST_LIST);
        const { playlist, channelId } = user;

        const details = await fetchCafeAPI('/api/songs/by_video_ids', { video_ids: playlist.songIds });
        const playeds = await fetchCafeAPI('/api/cafe/played', { video_ids: playlist.songIds });

        const playlistDataPage = formatListDataEmbed(playlist, channelId);

        const dateOrUndefined = (time: string | undefined) => time === undefined ? undefined : new Date(time);
        const displayDataList: DisplayDataList = details.map((item) => ({
            videoId: item.video_id,
            title: item.title,
            lastStartTime: dateOrUndefined(playeds.find(v => v.video_id === item.video_id)?.start_time),
            order: playlist.songIds.indexOf(item.video_id)
        }));

        const sorted = sorter[sortType]?.(displayDataList);
        if (sorted === undefined) throw new Error(`不適切なオプション値（${sortType}）`);

        const playedLines = sorted.map((item) => {
            const title = hyperlink(escapeMarkdown(item.title), `https://www.nicovideo.jp/watch/${item.videoId}`);
            const lastStart = item.lastStartTime ? time(item.lastStartTime, 'R') : '⭕';

            return `${lastStart} ${title}`;
        });

        const songDataPages = subdivision(playedLines, limit).map(v => ({
            ...formatTitle(playlist),
            description: v.join('\n')
        } satisfies APIEmbed));

        if (songDataPages.some(v => v.description.length > EMBED_DESCRIPTION_LIMIT)) {
            throw new CommandsWarn(WARN_MESSAGES.OVER_CHARLENGTH);
        }

        await sendNote(interaction, [playlistDataPage, ...songDataPages]);
    }
};

export { list };
