import { EmbedBuilder } from 'discord.js';
import BookMaker from '../BookMaker';
import { subdivision } from '../embedsUtil';
import getKiiteAPI from '../getKiiteAPI';
import SlashCommand from '../SlashCommand';

const timetable: SlashCommand = {
    name: 'timetable',
    description: 'Cafeの選曲履歴を表示します',
    execute: async (client, interaction) => {
        const data = await getKiiteAPI('/api/cafe/timetable', { limit: 100 });
        const selectionIds = data.map(v => v.id);
        const rotates = await getKiiteAPI('/api/cafe/rotate_users', { ids: selectionIds.join(',') });
        const songLines = data.map((v, i) =>
            `**${i + 1}.**[${v.title}](https://www.nicovideo.jp/watch/${v.video_id})\n└:heartpulse:${v.new_fav_user_ids?.length ?? 0}\t:arrows_counterclockwise:${rotates[v.id].length}`
        );

        const pages = subdivision(songLines, 10).map(v => new EmbedBuilder({
            title: '選曲履歴100',
            description: v.join('\n')
        }));

        const book = new BookMaker(interaction, pages, true);
        await book.send();
    }
};

export { timetable };
