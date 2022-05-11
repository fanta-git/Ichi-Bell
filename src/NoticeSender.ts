import * as discord from 'discord.js';

import { ReturnCafeSong } from './apiTypes';
import { noticeList, userData } from './database';

const NOTICE_MSG = 'リストの曲が流れるよ！';

type recipientData = {
    isDM: true,
    user: discord.User,
    message?: Promise<discord.Message>
} | {
    isDM: false,
    channel: discord.TextChannel,
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
            const { channelId, dm } = await userData.get(userId) ?? {};
            const user = this.#client.users.cache.get(userId) ?? await this.#client.users.fetch(userId);
            if (dm) {
                if (user === undefined) throw Error('DMの取得に失敗しました');

                this.#recipients.push({
                    isDM: true,
                    user: user
                });
            } else {
                if (channelId === undefined) {
                    console.log('deleate', userId);
                    continue;
                }
                const channel = (this.#client.channels.cache.get(channelId) ?? await this.#client.channels.fetch(channelId)) as discord.TextChannel | undefined;
                if (channel?.guild === undefined) throw Error('チャンネルの取得に失敗しました');
                channel.guild.members.fetch(userId).catch(_ => {
                    console.log('delete', userId);
                });
                const existsData = this.#recipients.find(v => !v.isDM && v.channel.id === channel.id) as Extract<recipientData, { isDM: false }> | undefined;
                if (existsData) {
                    existsData.users.push(user);
                    continue;
                }
                this.#recipients.push({
                    isDM: false,
                    users: [user],
                    channel: channel
                });
            }
        }

        for (const recipient of this.#recipients) {
            if (recipient.isDM) {
                const msg = recipient.user.send(NOTICE_MSG);
                recipient.message = msg;
            } else {
                const mention = recipient.users.map(v => `<@${v.id}>`).join('');
                const msg = recipient.channel.send(mention + NOTICE_MSG);
                recipient.message = msg;
            }
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
