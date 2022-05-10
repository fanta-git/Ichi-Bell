import * as discord from 'discord.js';
import Keyv from 'keyv';

import { PlaylistContents, ReturnCafeSong } from './apiTypes';

const NOTICE_MSG = 'リストの曲が流れるよ！';

type userDataContents = {
    registeredList: PlaylistContents | undefined,
    userId: string | undefined,
    dm: boolean | undefined,
    channelId: string | undefined
};

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
    static #noticeList: Keyv<Record<string, string> | undefined> = new Keyv('sqlite://db.sqlite', { table: 'noticeList' });
    static #userData: Keyv<userDataContents> = new Keyv('sqlite://db.sqlite', { table: 'userData' });

    #client: discord.Client;
    #songData: ReturnCafeSong;
    #recipients: recipientData[];

    constructor (client: discord.Client, songData: ReturnCafeSong) {
        this.#client = client;
        this.#songData = songData;
        this.#recipients = [];
    }

    async sendNotice () {
        const userIds = await songNoticer.#noticeList.get(this.#songData.video_id);
        if (!userIds) return;

        for (const userId of Object.keys(userIds)) {
            const { channelId, dm } = await songNoticer.#userData.get(userId) ?? {};
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
                const channel = (this.#client.channels.cache.get(channelId) ?? this.#client.channels.fetch(channelId)) as discord.TextChannel | undefined;
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
