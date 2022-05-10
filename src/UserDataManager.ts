import Keyv from 'keyv';

import getKiiteAPI from './getKiiteAPI';
import { PlaylistContents } from './apiTypes';

type userDataContents = {
    registeredList: PlaylistContents | undefined,
    userId: string | undefined,
    dm: boolean | undefined,
    channelId: string | undefined
};

class UserDataManager {
    static #noticeList: Keyv<Record<string, string> | undefined> = new Keyv('sqlite://db.sqlite', { table: 'noticeList' });
    static #userData: Keyv<userDataContents> = new Keyv('sqlite://db.sqlite', { table: 'userData' });

    #userId: string;

    constructor (userId: string) {
        this.#userId = userId;
    }

    async registerNoticeList (playlistData: PlaylistContents, channelId: string, dm: boolean) {
        const { userId } = await this.getData();
        if (userId) await this.unregisterNoticeList();
        for (const song of playlistData.songs) {
            UserDataManager.#noticeList.get(song.video_id).then((item = {}) => {
                item[this.#userId] = this.#userId;
                UserDataManager.#noticeList.set(song.video_id, item);
            });
        }
        UserDataManager.#userData.set(this.#userId, {
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
        const songListData = await getKiiteAPI('/api/playlists/contents/detail', { list_id: registeredList.list_id });
        if (songListData.status === 'failed') throw Error(`プレイリストの取得に失敗しました！登録されていたリスト（${registeredList.list_title}）は存在していますか？\n存在している場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。`);
        if (registedChannelId === channelId && songListData.updated_at === registeredList.updated_at) throw Error('プレイリストは最新の状態です！');
        this.registerNoticeList(songListData, channelId, dm);
        return songListData;
    }

    async unregisterNoticeList () {
        const { registeredList } = await this.getData();
        if (registeredList === undefined) throw Error('リストが登録されていません！');
        UserDataManager.#userData.delete(this.#userId);
        for (const songData of registeredList.songs) {
            UserDataManager.#noticeList.get(songData.video_id).then((item = {}) => {
                delete item[this.#userId];
                if (Object.keys(item).length) {
                    UserDataManager.#noticeList.set(songData.video_id, item);
                } else {
                    UserDataManager.#noticeList.delete(songData.video_id);
                }
            });
        }
        return registeredList;
    }

    async getData () {
        return await UserDataManager.#userData.get(this.#userId).then(item => item ?? {} as userDataContents);
    }
}

export default UserDataManager;
