import * as discord from 'discord.js';

import { ReturnCafeSong } from './apiTypes';
import db from './database/db';
import { timeDuration, timer } from './embedsUtil';
import fetchCafeAPI from './fetchCafeAPI';

const NOTICE_AGO = 60e3;
const GET_NEXTSONG_INTERVAL = 30e3;
const API_UPDATE_WAIT = 3e3;
const API_ERROR_WAIT = 10e3;
const NOTICE_MSG = 'リストの曲が流れるよ！';

const observeNextSong = async (client: discord.Client) => {
    while (true) {
        try {
            const nowSong = await fetchCafeAPI('/api/cafe/now_playing');
            client.user?.setActivity({
                name: nowSong.title,
                type: discord.ActivityType.Listening
            });

            const nextSong = await waitRingAt();
            const lastSendSong = await db.getRinged();
            if (lastSendSong === undefined || lastSendSong.id !== nextSong.id) {
                db.setRinged(nextSong);
                ringBell(client, nextSong);
            }

            await timer(timeDuration(nextSong.start_time) + API_UPDATE_WAIT);
        } catch (e) {
            console.error(e);
            await timer(API_ERROR_WAIT);
        }
    }
};

const waitRingAt = async () => {
    while (true) {
        const nextSong = await fetchCafeAPI('/api/cafe/next_song');
        const noticeRemaind = timeDuration(nextSong.start_time) - NOTICE_AGO;
        if (noticeRemaind < GET_NEXTSONG_INTERVAL) {
            await timer(noticeRemaind);
            return nextSong;
        }
        await timer(GET_NEXTSONG_INTERVAL);
    }
};

const ringBell = async (client: discord.Client, songData: ReturnCafeSong) => {
    const sendedMessages: discord.Message[] = [];
    const targetsAll = await db.getTargetUsers(songData.video_id);
    const targetsEachChannel = devide(targetsAll, v => v.channelId);

    for (const [channelId, targetsSameChannel] of Object.entries(targetsEachChannel)) {
        try {
            const channel = await client.channels.fetch(channelId);
            if (channel === null || !channel.isTextBased()) {
                for (const target of targetsSameChannel) db.deleateUser(target.userId);
                continue;
            }
            const mention = channel.isDMBased() ? '' : targetsSameChannel.map(v => `<@${v.userId}>`).join(' ');
            const msg = await channel.send(mention + NOTICE_MSG);
            sendedMessages.push(msg);
        } catch (error) {
            console.error(error);
        }
    }

    await timer(timeDuration(songData.start_time));

    for (const msg of sendedMessages) {
        msg.edit(msg.content.replace(NOTICE_MSG, `__${songData.title}__が流れたよ！`));
    }
};

const devide = <T, U extends string | number | symbol>(arr: T[], getLabel: (item: T) => U): Record<U, T[]> => {
    const result = {} as Record<U, T[]>;

    for (const item of arr) {
        const label = getLabel(item);
        result[label] ??= [];
        result[label].push(item);
    }

    return result;
};

export default observeNextSong;
