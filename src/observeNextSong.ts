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
            getKiiteAPI('/api/cafe/now_playing')
                .then(ret => client.user?.setActivity({
                    name: ret.title,
                    type: discord.ActivityType.Listening
                }))
                .catch(e => console.error(e));

            const nextSong = await getNextSong();
            const noticeSender = new NoticeSender(client, nextSong);
            noticeSender.sendNotice();

            await timer(Date.parse(nextSong.start_time) - Date.now());
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
        const noticeRemaind = ISOtoMS(nextSong.start_time) - NOTICE_AGO - Date.now();
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
const ISOtoMS = (iso: string) => new Date(iso).getTime();

export default observeNextSong;
