import * as discord from 'discord.js';

import { ReturnCafeSong } from './apiTypes';
import { noticeList, userData } from './database';
import { unregisterNoticeList } from './noticeListManager';

const NOTICE_MSG = 'リストの曲が流れるよ！';
const ALLOW_CHANNEL_TYPE = ['DM', 'GUILD_TEXT'] as const;
const ALLOW_ERROR = ['Missing Access', 'Unknown Channel'];

type arrowChannels = Extract<discord.AnyChannel, { type: typeof ALLOW_CHANNEL_TYPE[number] }>;
type recipientData = {
    channel: arrowChannels,
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
        if (!userIds) return false;

        for (const userId of userIds) {
            try {
                const { channelId } = await userData.get(userId) ?? {};
                if (channelId === undefined) continue;
                const user = await this.#client.users.fetch(userId);
                const channel = await this.#client.channels.fetch(channelId);
                if (channel === null) {
                    unregisterNoticeList(userId);
                    continue;
                }
                if (isChannelAllowed(channel)) {
                    const recipient = this.#recipients.find(v => v.channel.id === channel.id);
                    if (recipient === undefined) {
                        this.#recipients.push({ users: [user], channel: channel });
                    } else {
                        recipient.users.push(user);
                    }
                }
            } catch (error) {
                if (error instanceof Error && ALLOW_ERROR.includes(error.message)) {
                    unregisterNoticeList(userId);
                } else {
                    throw error;
                }
            }
        }

        for (const recipient of this.#recipients) {
            const mention = recipient.channel.type === 'DM' ? '' : recipient.users.map(v => `<@${v.id}>`).join('');
            const msg = recipient.channel.send(mention + NOTICE_MSG);
            recipient.message = msg;
        }
        return true;
    }

    async updateNotice () {
        for (const recipient of this.#recipients) {
            const msg = await recipient.message;
            if (msg === undefined) continue;
            msg.edit(msg.content.replace(NOTICE_MSG, `__${this.#songData.title}__が流れたよ！`));
        }
    }
}

const isChannelAllowed = (value: discord.AnyChannel): value is arrowChannels => ALLOW_CHANNEL_TYPE.some(v => value.type === v);

export default songNoticer;
