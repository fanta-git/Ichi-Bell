import * as discord from 'discord.js';

import getKiiteAPI from './getKiiteAPI';
import UserDataManager from './UserDataManager';

const exportDefault = async (client: discord.Client) => {
    let isGetNext: boolean = false;
    while (true) {
        try {
            const apiUrl = isGetNext ? '/api/cafe/next_song' : '/api/cafe/now_playing';
            const cafeSongData = await getKiiteAPI(apiUrl);
            const nowTime = new Date().getTime();
            const startTime = new Date(cafeSongData.start_time).getTime();
            const endTime = startTime + Math.min(cafeSongData.msec_duration, 480e3);

            if (isGetNext) UserDataManager.noticeSong(client, cafeSongData);
            setTimeout(() => client.user?.setActivity({ name: cafeSongData.title, type: 'LISTENING' }), Math.max(startTime - nowTime, 0));
            await new Promise(resolve => setTimeout(resolve, Math.max(endTime - 60e3 - nowTime, isGetNext ? 3e3 : 0)));
            isGetNext = new Date().getTime() < endTime as boolean;
        } catch (e) {
            console.error(e);
            await new Promise(resolve => setTimeout(resolve, 15e3));
        }
    }
};

export default exportDefault;
