import * as discord from 'discord.js';

import { ReturnCafeSong } from './apiTypes';
import { noticeList, userData } from './database';
import { unregisterNoticeList } from './noticeListManager';

const NOTICE_MSG = 'リストの曲が流れるよ！';

type recipientData = {
    channel: Extract<discord.AnyChannel, { type: 'DM' | 'GUILD_TEXT' }>,
    users: discord.User[],
    message?: Promise<discord.Message>
};

class songNoticer {
    #client: discord.Client;
    #songData: ReturnCafeSong;
    #recipients: recipientData[];

    constructor (client: discord.Client, songData: ReturnCafeSong) {
        this.#client = client;
        this.#songData = songData;
        this.#recipients = [];
    }

    async sendNotice () {
        const userIds = await noticeList.get(this.#songData.video_id);
        if (!userIds) return;

        for (const userId of userIds) {
            try {
                const { channelId } = await userData.get(userId) ?? {};
                if (channelId === undefined) return;
                const user = await this.#client.users.fetch(userId);
                const channel = await this.#client.channels.fetch(channelId);
                if (channel === null) return unregisterNoticeList(userId);
                if (channel.type === 'DM' || channel.type === 'GUILD_TEXT') {
                    const recipient = this.#recipients.find(v => v.channel.id === channel.id);
                    if (recipient === undefined) {
                        this.#recipients.push({ users: [user], channel: channel });
                    } else {
                        recipient.users.push(user);
                    }
                }
            } catch (error) {
                if (
                    error instanceof Error &&
                    ['Missing Access', 'Unknown Channel'].includes(error.message)
                ) return unregisterNoticeList(userId);
                throw error;
            }
        }

        for (const recipient of this.#recipients) {
            const mention = recipient.channel.type === 'DM' ? '' : recipient.users.map(v => `<@${v.id}>`).join('');
            const msg = recipient.channel.send(mention + NOTICE_MSG);
            recipient.message = msg;
        }
    }

    async updateNotice () {
        for (const recipient of this.#recipients) {
            const msg = await recipient.message;
            if (msg === undefined) continue;
            msg.edit(msg.content.replace(NOTICE_MSG, `__${this.#songData.title}__が流れたよ！`));
        }
    }
}

export default songNoticer;
