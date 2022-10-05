import * as discord from 'discord.js';

import getKiiteAPI from './getKiiteAPI';
import NoticeSender from './NoticeSender';

const NOTICE_AGO = 60e3;
const GET_NEXTSONG_INTERVAL = 30e3;
const API_UPDATE_WAIT = 3e3;
const API_ERROR_WAIT = 10e3;

const observeNextSong = async (client: discord.Client) => {
    while (true) {
        try {
            const nowSong = await getKiiteAPI('/api/cafe/now_playing');
            client.user!.setActivity({
                name: nowSong.title,
                type: discord.ActivityType.Listening
            });

            const nextSong = await getNextSong();
            const noticeSender = new NoticeSender(client, nextSong);
            noticeSender.sendNotice();

            await timer(duration(nextSong.start_time));
            noticeSender.updateNotice();

            await timer(API_UPDATE_WAIT);
        } catch (e) {
            console.error(e);
            await timer(API_ERROR_WAIT);
        }
    }
};

const getNextSong = async () => {
    while (true) {
        const nextSong = await getKiiteAPI('/api/cafe/next_song');
        const noticeRemaind = duration(nextSong.start_time) - NOTICE_AGO;
        if (noticeRemaind < GET_NEXTSONG_INTERVAL) {
            await timer(noticeRemaind);
            return nextSong;
        }
        await timer(GET_NEXTSONG_INTERVAL);
    }
};

const timer = (waitTimeMS: number) => new Promise(
    resolve => waitTimeMS > 0 ? setTimeout(() => resolve(true), waitTimeMS) : resolve(false)
);
const duration = (iso: string) => Date.parse(iso) - Date.now();

export default observeNextSong;
