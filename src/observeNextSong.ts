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
const ALLOW_ERROR = ['Missing Access', 'Unknown Channel'];

type recipientData = {
    channel: discord.TextBasedChannel,
    userIds: string[],
    message?: Promise<discord.Message>
};

const observeNextSong = async (client: discord.Client) => {
    while (true) {
        try {
            const nowSong = await fetchCafeAPI('/api/cafe/now_playing');
            client.user!.setActivity({
                name: nowSong.title,
                type: discord.ActivityType.Listening
            });

            const nextSong = await waitRingAt();
            const lastSendSong = await db.getLeatestRing();
            const isRinged = lastSendSong && lastSendSong.id === nextSong.id;
            if (!isRinged) {
                db.setLeatestRing(nextSong);
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
    const recipients: recipientData[] = [];
    const users = await db.getTargetUsers(songData.video_id);

    for (const user of users) {
        try {
            const recipient = recipients.find(v => v.channel.id === user.channelId);
            if (recipient === undefined) {
                const channel = await client.channels.fetch(user.channelId);
                if (channel === null || !channel.isTextBased()) {
                    db.deleateUser(user.userId);
                    continue;
                }
                recipients.push({ userIds: [user.userId], channel });
            } else {
                recipient.userIds.push(user.userId);
            }
        } catch (error) {
            if (error instanceof Error && ALLOW_ERROR.includes(error.message)) {
                db.deleateUser(user.userId);
            } else {
                console.error(error);
            }
        }
    }

    for (const recipient of recipients) {
        try {
            const mention = recipient.channel.isDMBased() ? '' : recipient.userIds.map(v => `<@${v}>`).join('');
            const msg = recipient.channel.send(mention + NOTICE_MSG);
            recipient.message = msg;
        } catch (error) {
            if (error instanceof Error && ALLOW_ERROR.includes(error.message)) {
                for (const userId of recipient.userIds) db.deleateUser(userId);
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
