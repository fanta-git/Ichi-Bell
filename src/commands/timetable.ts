import getKiiteAPI from '../getKiiteAPI';
import SlashCommand from '../SlashCommand';

const timetable: SlashCommand = {
    name: 'timetable',
    description: 'Cafeの選曲履歴を表示します',
    execute: async (client, interaction) => {
        const data = await getKiiteAPI('/api/cafe/timetable', { limit: 100 });
        const selectionIds = data.map(v => v.id);
        const rotates = await getKiiteAPI('/api/cafe/rotate_users', { ids: selectionIds.join(',') });

        console.log(data[0]);
        console.log(rotates[data[0].id]);
    }
};

export { timetable };
