import * as discord from 'discord.js';

import getKiiteAPI from './getKiiteAPI';
import NoticeSender from './NoticeSender';

const DURATION_MAX = 8 * 60e3;
const RUN_LIMIT = Number(process.env.REBOOT_HOUR) * 3600e3 || Infinity;
const REBOOT_NEED_SONGDURATION = 3 * 60e3;
const NOTICE_AGO = 60e3;
const GET_NEXTSONG_INTERVAL = 30e3;
const API_UPDATE_WAIT = 3e3;
const API_ERROR_WAIT = 5e3;

const observeNextSong = async (client: discord.Client) => {
    const launchedTime = Date.now();
    let nowSongSender: NoticeSender | undefined;
    while (true) {
        try {
            const nowSong = await getKiiteAPI('/api/cafe/now_playing');
            client.user?.setActivity({ name: nowSong.title, type: 'LISTENING' });

            const nextSong = await getNextSong();
            const nextSongStartTime = ISOtoMS(nextSong.start_time);
            const nextSongEndTime = nextSongStartTime + Math.min(nextSong.msec_duration, DURATION_MAX);
            const noticeSender = new NoticeSender(client, nextSong);
            const senderStatePromise = noticeSender.sendNotice();

            await timer(nextSongStartTime - Date.now());

            nowSongSender?.updateNotice();
            nowSongSender = noticeSender;

            const isOverLimit = Date.now() - launchedTime > RUN_LIMIT;
            const haveAllowance = nextSongEndTime - Date.now() > REBOOT_NEED_SONGDURATION;
            if (isOverLimit && haveAllowance && !(await senderStatePromise)) break;

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
        const nextSongEndTime = ISOtoMS(nextSong.start_time) - Date.now();
        if (nextSongEndTime < NOTICE_AGO + GET_NEXTSONG_INTERVAL) {
            await timer(nextSongEndTime - NOTICE_AGO);
            return nextSong;
        }
        await timer(GET_NEXTSONG_INTERVAL);
    }
};

const timer = (waitTimeMs: number) => new Promise(resolve => waitTimeMs > 0 ? setTimeout(resolve, waitTimeMs) : resolve(-1));
const ISOtoMS = (iso: string) => new Date(iso).getTime();

export default observeNextSong;
