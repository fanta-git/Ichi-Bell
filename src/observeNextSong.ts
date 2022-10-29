import * as discord from 'discord.js';

import { ReturnCafeSong } from './apiTypes';
import * as db from './database';
import { timeDuration, timer } from './embedsUtil';
import getKiiteAPI from './getKiiteAPI';

const NOTICE_AGO = 60e3;
const GET_NEXTSONG_INTERVAL = 30e3;
const API_UPDATE_WAIT = 3e3;
const API_ERROR_WAIT = 10e3;
const NOTICE_MSG = 'リストの曲が流れるよ！';
const ALLOW_ERROR = ['Missing Access', 'Unknown Channel'];

type recipientData = {
    channel: discord.TextBasedChannel,
    userIds: string[],
    message?: Promise<discord.Message>
};

const observeNextSong = async (client: discord.Client) => {
    while (true) {
        try {
            const nowSong = await getKiiteAPI('/api/cafe/now_playing');
            client.user!.setActivity({
                name: nowSong.title,
                type: discord.ActivityType.Listening
            });

            const nextSong = await waitRingAt();
            const lastSendSong = await db.utilData.get('lastSendSong');
            const isRinged = lastSendSong && lastSendSong.id === nextSong.id;
            if (!isRinged) {
                db.utilData.set('lastSendSong', nextSong);
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
        const nextSong = await getKiiteAPI('/api/cafe/next_song');
        const noticeRemaind = timeDuration(nextSong.start_time) - NOTICE_AGO;
        if (noticeRemaind < GET_NEXTSONG_INTERVAL) {
            await timer(noticeRemaind);
            return nextSong;
        }
        await timer(GET_NEXTSONG_INTERVAL);
    }
};

const ringBell = async (client: discord.Client, songData: ReturnCafeSong) => {
    const recipients: recipientData[] = [];
    const userIds = await db.noticeList.get(songData.video_id) ?? [];
    const excludUserIds: string[] = [];

    for (const userId of userIds) {
        try {
            const data = await db.userData.get(userId);
            if (data === undefined || !data.registeredList.songs.some(v => v.video_id === songData.video_id)) {
                excludUserIds.push(userId);
                continue;
            }
            const recipient = recipients.find(v => v.channel.id === data.channelId);
            if (recipient === undefined) {
                const channel = await client.channels.fetch(data.channelId);
                if (channel === null || !channel.isTextBased()) {
                    db.unregisterData(userId);
                    continue;
                }
                recipients.push({ userIds: [userId], channel });
            } else {
                recipient.userIds.push(userId);
            }
        } catch (error) {
            if (error instanceof Error && ALLOW_ERROR.includes(error.message)) {
                db.unregisterData(userId);
            } else {
                console.error(error);
            }
        }
    }

    if (excludUserIds.length > 0) {
        const excluded = userIds.filter(v => !excludUserIds.includes(v));
        await db.noticeList.set(songData.video_id, excluded);
    }

    for (const recipient of recipients) {
        try {
            const mention = recipient.channel.isDMBased() ? '' : recipient.userIds.map(v => `<@${v}>`).join('');
            const msg = recipient.channel.send(mention + NOTICE_MSG);
            recipient.message = msg;
        } catch (error) {
            if (error instanceof Error && ALLOW_ERROR.includes(error.message)) {
                for (const userId of recipient.userIds) db.unregisterData(userId);
            } else {
                console.error(error);
            }
        }
    }

    await timer(timeDuration(songData.start_time));

    for (const recipient of recipients) {
        const msg = await recipient.message;
        if (msg === undefined) continue;
        msg.edit(msg.content.replace(NOTICE_MSG, `__${songData.title}__が流れたよ！`));
    }
};

export default observeNextSong;
