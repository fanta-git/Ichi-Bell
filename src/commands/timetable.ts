import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import noteSend from '../noteSend';
import { formatLastPlayed, sendWarning, subdivision } from '../embedsUtil';
import fetchCafeAPI from '../fetchCafeAPI';
import SlashCommand from '../SlashCommand';
import db from '../database/db';

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
        const songLines = data.map((v, i) => {
            const played = i ? `[${formatLastPlayed(v.start_time)}]` : '**[ON AIR]**';
            const title = `[${v.title}](https://www.nicovideo.jp/watch/${v.video_id})`;
            const registedUnder = playlist?.songs.some(item => item.video_id === v.video_id) ? '__' : '';
            const newFav = `:heartpulse:${v.new_fav_user_ids?.length ?? 0}`;
            const rotate = `:arrows_counterclockwise:${rotates[v.id]?.length ?? 0}`;

            return `**${i + 1}.**${registedUnder}${title}${registedUnder}\n└${played}${newFav}${rotate}`;
        });

        const pages = subdivision(songLines, limit).map(v => new EmbedBuilder({
            title: '選曲履歴100',
            description: v.join('\n')
        }));

        if (pages.some(v => v.data.description!.length > EMBED_DESCRIPTION_LIMIT)) return sendWarning(interaction, 'OVER_CHARLENGTH');

        await noteSend(interaction, pages);
    }
};

export { timetable };
