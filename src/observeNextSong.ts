import * as discord from 'discord.js';

import getKiiteAPI from './getKiiteAPI';
import UserDataManager from './UserDataManager';

const DURATION_MAX = 8 * 60e3;
const RUN_LIMIT = Number(process.env.REBOOT_HOUR) * 3600e3 || Infinity;
const REBOOT_NEED_SONGDURATION = 3 * 60e3;
const NOTICE_AGO = 60e3;
const API_UPDATE_WAIT = 3e3;
const API_ERROR_WAIT = 15e3;

const observeNextSong = async (client: discord.Client) => {
    const launchedTime = Date.now();
    let isGetNext = false;
    while (true) {
        try {
            const apiUrl = isGetNext ? '/api/cafe/next_song' : '/api/cafe/now_playing';
            const cafeSongData = await getKiiteAPI(apiUrl);
            const startTime = new Date(cafeSongData.start_time).getTime();
            const endTime = startTime + Math.min(cafeSongData.msec_duration, DURATION_MAX);

            if (isGetNext) UserDataManager.noticeSong(client, cafeSongData);

            await timer(Math.max(startTime - Date.now(), 0));

            const isOverLimit = Date.now() - launchedTime > RUN_LIMIT;
            const haveAllowance = endTime - Date.now() > REBOOT_NEED_SONGDURATION;
            if (isOverLimit && haveAllowance) break;
            client.user?.setActivity({ name: cafeSongData.title, type: 'LISTENING' });

            await timer(Math.max(endTime - NOTICE_AGO - Date.now(), isGetNext ? API_UPDATE_WAIT : 0));
            isGetNext = Date.now() < endTime as boolean;
        } catch (e) {
            console.error(e);
            await timer(API_ERROR_WAIT);
        }
    }
};

const timer = (waitTimeMs: number) => new Promise(resolve => setTimeout(resolve, waitTimeMs));

export default observeNextSong;
