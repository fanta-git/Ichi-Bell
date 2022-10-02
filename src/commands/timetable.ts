import { ApplicationCommandOptionType, EmbedBuilder } from 'discord.js';
import BookMaker from '../BookMaker';
import { formatLastPlayed, subdivision } from '../embedsUtil';
import getKiiteAPI from '../getKiiteAPI';
import SlashCommand from '../SlashCommand';

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
        const limit = interaction.options.getInteger(OPTIONS.LIMIT) ?? 10;
        const data = await getKiiteAPI('/api/cafe/timetable', { limit: 100 });
        const selectionIds = data.map(v => v.id);
        const rotates = await getKiiteAPI('/api/cafe/rotate_users', { ids: selectionIds.join(',') });
        const songLines = data.map((v, i) => {
            const played = i ? `[${formatLastPlayed(v.start_time)}]` : '**[ON AIR]**';
            const title = `[${v.title}](https://www.nicovideo.jp/watch/${v.video_id})`;
            const newFav = `:heartpulse:${v.new_fav_user_ids?.length ?? 0}`;
            const rotate = `:arrows_counterclockwise:${rotates[v.id]?.length ?? 0}`;

            return `**${i + 1}.**${title}\n└${played}${newFav}${rotate}`;
        });

        const pages = subdivision(songLines, limit).map(v => new EmbedBuilder({
            title: '選曲履歴100',
            description: v.join('\n')
        }));

        if (pages.some(v => v.data.description!.length > EMBED_DESCRIPTION_LIMIT)) {
            throw Error('文字数制限で表示できませんでした。limitオプションにもっと少ない数を指定してください。');
        }

        const book = new BookMaker(interaction, pages, true);
        await book.send();
    }
};

export { timetable };
