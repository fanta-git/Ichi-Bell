import * as discord from 'discord.js';

import getKiiteAPI from './getKiiteAPI';
import NoticeSender from './NoticeSender';

const DURATION_MAX = 8 * 60e3;
const RUN_LIMIT = Number(process.env.REBOOT_HOUR) * 3600e3 || Infinity;
const REBOOT_NEED_SONGDURATION = 3 * 60e3;
const NOTICE_AGO = 60e3;
const API_UPDATE_WAIT = 3e3;
const API_ERROR_WAIT = 5e3;

const observeNextSong = async (client: discord.Client) => {
    const launchedTime = Date.now();
    let nowSongSender: NoticeSender | undefined;
    while (true) {
        try {
            const nowSong = await getKiiteAPI('/api/cafe/now_playing');
            const nowSongEndTime = ISOtoMS(nowSong.start_time) + Math.min(nowSong.msec_duration, DURATION_MAX);
            client.user?.setActivity({ name: nowSong.title, type: 'LISTENING' });
            await timer(nowSongEndTime - NOTICE_AGO - Date.now());

            const nextSong = await getKiiteAPI('/api/cafe/next_song');
            const nextSongEndTime = ISOtoMS(nextSong.start_time) + Math.min(nextSong.msec_duration, DURATION_MAX);
            const noticeSender = new NoticeSender(client, nextSong);
            const senderStatePromise = noticeSender.sendNotice();

            await timer(nowSongEndTime - Date.now());

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

const timer = (waitTimeMs: number) => new Promise(resolve => waitTimeMs > 0 ? setTimeout(resolve, waitTimeMs) : resolve(-1));
const ISOtoMS = (iso: string) => new Date(iso).getTime();

export default observeNextSong;
