import { ApplicationCommandOptionType, EmbedBuilder, escapeMarkdown, hyperlink, time, underscore } from 'discord.js';
import { CommandsWarn } from '../customErrors';
import db from '../database/db';
import { WARN_MESSAGES, subdivision } from '../embedsUtil';
import fetchCafeAPI from '../fetchCafeAPI';
import noteSend from '../noteSend';
import SlashCommand from './SlashCommand';

const LIMIT = 10;
const OPTIONS = {
    LIMIT: 'limit'
} as const;

const EMBED_DESCRIPTION_LIMIT = 4096;

const timetable: SlashCommand = {
    name: 'timetable',
    description: 'Cafeの選曲履歴を表示します',
    options: [
        {
            type: ApplicationCommandOptionType.Integer,
            name: OPTIONS.LIMIT,
            description: '1ページに表示する曲数',
            maxValue: 25
        }
    ],
    execute: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const limit = interaction.options.getInteger(OPTIONS.LIMIT) ?? LIMIT;

        const { playlist } = await db.getUser(interaction.user.id) ?? {};
        const data = await fetchCafeAPI('/api/cafe/timetable', { limit: 100 });
        const selectionIds = data.map(v => v.id);
        const rotates = await fetchCafeAPI('/api/cafe/rotate_users', { ids: selectionIds });
        const songLines = data.map(v => {
            const played = time(new Date(v.start_time), 'R');
            const title = hyperlink(escapeMarkdown(v.title), `https://www.nicovideo.jp/watch/${v.video_id}`);
            const decorated = playlist?.songIds.includes(v.video_id) ? underscore(title) : title;
            const newFav = `:heartpulse:${v.new_fav_user_ids?.length ?? 0}`;
            const rotate = `:arrows_counterclockwise:${rotates[v.id]?.length ?? 0}`;

            return `${played} ${decorated}\n└${newFav}${rotate}`;
        });

        const pages = subdivision(songLines, limit).map(v => new EmbedBuilder({
            title: '選曲履歴100',
            description: v.join('\n')
        }));

        if (pages.some(v => v.data.description && v.data.description.length > EMBED_DESCRIPTION_LIMIT)) throw new CommandsWarn(WARN_MESSAGES.OVER_CHARLENGTH);

        await noteSend(interaction, pages);
    }
};

export { timetable };
