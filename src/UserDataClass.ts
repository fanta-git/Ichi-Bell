import getAPI from './KiiteAPI';
import { PlaylistContents, ReturnCafeSong } from './global';
import * as discord from 'discord.js';
import Keyv from 'keyv';

type userDataContents = {
    registeredList: PlaylistContents | undefined,
    userId: string | undefined,
    dm: boolean | undefined,
    channelId: string | undefined
};

export default class UserDataClass {
    static #noticeList: Keyv<Record<string, string> | undefined> = new Keyv('sqlite://db.sqlite', { table: 'noticeList' });
    static #userData: Keyv<userDataContents> = new Keyv('sqlite://db.sqlite', { table: 'userData' });

    #userId: string;

    constructor (userId: string) {
        this.#userId = userId;
    }

    static async noticeSong (client: discord.Client, songData: ReturnCafeSong): Promise<discord.Message<boolean>[] | undefined> {
        const userIds = await UserDataClass.#noticeList.get(songData.video_id);
        const forChannels: Record<string, { channel: discord.TextChannel, userIds: string[] }> = {};
        const forDMs: discord.User[] = [];
        if (!userIds) return;

        for (const userId of Object.keys(userIds)) {
            const userData = new UserDataClass(userId);
            const { channelId, dm } = await userData.getData();
            if (dm) {
                const user = client.users.cache.get(userId) ?? await client.users.fetch(userId);
                if (user === undefined) throw Error('DMの取得に失敗しました');
                forDMs.push(user);
            } else {
                if (channelId === undefined) {
                    userData.unregisterNoticeList();
                    console.log('deleate', userId);
                } else {
                    const channel = (client.channels.cache.get(channelId) ?? client.channels.fetch(channelId)) as discord.TextChannel | undefined;
                    if (channel === undefined) throw Error('チャンネルの取得に失敗しました');
                    channel.guild.members.fetch(userId).catch(_ => {
                        userData.unregisterNoticeList();
                        console.log('delete', userId);
                    });
                    forChannels[channel.id] ??= { channel: channel, userIds: [] };
                    forChannels[channel.id].userIds.push(userId);
                }
            }
        }

        const messages: Promise<discord.Message<boolean>>[] = [];
        const noticeMessage = 'リストの曲が流れるよ！';
        for (const user of forDMs) {
            const msg = user.send(noticeMessage);
            messages.push(msg);
        }
        for (const key of Object.keys(forChannels)) {
            const msg = forChannels[key].channel.send(forChannels[key].userIds.map(e => `<@${e}>`).join('') + noticeMessage);
            messages.push(msg);
        }

        setTimeout(async () => {
            for await (const msg of messages) {
                msg.edit(msg.content.replace(noticeMessage, `__${songData.title}__が流れたよ！`));
            }
        }, new Date(songData.start_time).getTime() + Number(songData.msec_duration) - Date.now());

        return Promise.all(messages);
    }

    async registerNoticeList (playlistData: PlaylistContents, channelId: string, dm: boolean) {
        const { userId } = await this.getData();
        if (userId) await this.unregisterNoticeList();
        for (const song of playlistData.songs) {
            UserDataClass.#noticeList.get(song.video_id).then((item = {}) => {
                item[this.#userId] = this.#userId;
                UserDataClass.#noticeList.set(song.video_id, item);
            });
        }
        UserDataClass.#userData.set(this.#userId, {
            userId: this.#userId,
            channelId: channelId,
            dm: dm,
            registeredList: playlistData
        });
        return true;
    }

    async updateNoticeList (channelId: string, dm: boolean) {
        const { registeredList, channelId: registedChannelId } = await this.getData();
        if (registeredList === undefined) throw Error('リストが登録されていません！`/ib register`コマンドを使ってリストを登録しましょう！');
        const songListData = await getAPI('/api/playlists/contents/detail', { list_id: registeredList.list_id });
        if (songListData.status === 'failed') throw Error(`プレイリストの取得に失敗しました！登録されていたリスト（${registeredList.list_title}）は存在していますか？\n存在している場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。`);
        if (registedChannelId === channelId && songListData.updated_at === registeredList.updated_at) throw Error('プレイリストは最新の状態です！');
        this.registerNoticeList(songListData, channelId, dm);
        return songListData;
    }

    async unregisterNoticeList () {
        const { registeredList } = await this.getData();
        if (registeredList === undefined) throw Error('リストが登録されていません！');
        UserDataClass.#userData.delete(this.#userId);
        for (const songData of registeredList.songs) {
            UserDataClass.#noticeList.get(songData.video_id).then((item = {}) => {
                delete item[this.#userId];
                if (Object.keys(item).length) {
                    UserDataClass.#noticeList.set(songData.video_id, item);
                } else {
                    UserDataClass.#noticeList.delete(songData.video_id);
                }
            });
        }
        return registeredList;
    }

    async getData () {
        return await UserDataClass.#userData.get(this.#userId).then(item => item ?? {} as userDataContents);
    }
}
