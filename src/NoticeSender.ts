import * as discord from 'discord.js';

import { ReturnCafeSong } from './apiTypes';
import { noticeList, userData, utilData, unregisterData } from './database';

const NOTICE_MSG = 'リストの曲が流れるよ！';
const ALLOW_ERROR = ['Missing Access', 'Unknown Channel'];

type recipientData = {
    channel: discord.TextBasedChannel,
    userIds: string[],
    message?: Promise<discord.Message>
};

class NoticeSender {
    #client: discord.Client;
    #songData: ReturnCafeSong;
    #recipients: recipientData[];

    constructor (client: discord.Client, songData: ReturnCafeSong) {
        this.#client = client;
        this.#songData = songData;
        this.#recipients = [];
    }

    async sendNotice () {
        const lastSendSong = await utilData.get('lastSendSong');
        if (lastSendSong && lastSendSong.id === this.#songData.id) return;
        utilData.set('lastSendSong', this.#songData);

        const userIds = await noticeList.get(this.#songData.video_id) ?? [];
        const excludUserIds: string[] = [];

        for (const userId of userIds) {
            try {
                const data = await userData.get(userId);
                if (data === undefined || !data.registeredList.songs.some(v => v.video_id === this.#songData.video_id)) {
                    excludUserIds.push(userId);
                    continue;
                }
                const recipient = this.#recipients.find(v => v.channel.id === data.channelId);
                if (recipient === undefined) {
                    const channel = await this.#client.channels.fetch(data.channelId);
                    if (channel === null || !channel.isTextBased()) {
                        unregisterData(userId);
                        continue;
                    }
                    this.#recipients.push({ userIds: [userId], channel });
                } else {
                    recipient.userIds.push(userId);
                }
            } catch (error) {
                if (error instanceof Error && ALLOW_ERROR.includes(error.message)) {
                    unregisterData(userId);
                } else {
                    console.error(error);
                }
            }
        }

        if (excludUserIds.length > 0) {
            const excluded = userIds.filter(v => !excludUserIds.includes(v));
            await noticeList.set(this.#songData.video_id, excluded);
        }

        for (const recipient of this.#recipients) {
            try {
                const mention = recipient.channel.isDMBased() ? '' : recipient.userIds.map(v => `<@${v}>`).join('');
                const msg = recipient.channel.send(mention + NOTICE_MSG);
                recipient.message = msg;
            } catch (error) {
                if (error instanceof Error && ALLOW_ERROR.includes(error.message)) {
                    for (const userId of recipient.userIds) unregisterData(userId);
                } else {
                    console.error(error);
                }
            }
        }
        return userIds;
    }

    async updateNotice () {
        for (const recipient of this.#recipients) {
            const msg = await recipient.message;
            if (msg === undefined) continue;
            msg.edit(msg.content.replace(NOTICE_MSG, `__${this.#songData.title}__が流れたよ！`));
        }
    }
}

export default NoticeSender;
