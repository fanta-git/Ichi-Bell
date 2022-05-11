import getKiiteAPI from './getKiiteAPI';
import { noticeList, userData } from './database';
import { PlaylistContents } from './apiTypes';

class UserDataManager {
    #userId: string;

    constructor (userId: string) {
        this.#userId = userId;
    }

    async registerNoticeList (playlistData: PlaylistContents, channelId: string, dm: boolean) {
        const { userId } = await userData.get(this.#userId) ?? {};
        if (userId) await this.unregisterNoticeList();
        for (const song of playlistData.songs) {
            noticeList.get(song.video_id).then((item = []) => {
                if (!item.includes(this.#userId)) item.push(this.#userId);
                noticeList.set(song.video_id, item);
            });
        }
        userData.set(this.#userId, {
            userId: this.#userId,
            channelId: channelId,
            dm: dm,
            registeredList: playlistData
        });
        return true;
    }

    async updateNoticeList (channelId: string, dm: boolean) {
        const { registeredList, channelId: registedChannelId } = await userData.get(this.#userId) ?? {};
        if (registeredList === undefined) throw Error('リストが登録されていません！`/ib register`コマンドを使ってリストを登録しましょう！');
        const songListData = await getKiiteAPI('/api/playlists/contents/detail', { list_id: registeredList.list_id });
        if (songListData.status === 'failed') throw Error(`プレイリストの取得に失敗しました！登録されていたリスト（${registeredList.list_title}）は存在していますか？\n存在している場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。`);
        if (registedChannelId === channelId && songListData.updated_at === registeredList.updated_at) throw Error('プレイリストは最新の状態です！');
        this.registerNoticeList(songListData, channelId, dm);
        return songListData;
    }

    async unregisterNoticeList () {
        const { registeredList } = await userData.get(this.#userId) ?? {};
        if (registeredList === undefined) throw Error('リストが登録されていません！');
        userData.delete(this.#userId);
        for (const songData of registeredList.songs) {
            noticeList.get(songData.video_id).then((item = []) => {
                const filted = item.filter(v => v !== this.#userId);
                if (filted.length) {
                    noticeList.set(songData.video_id, filted);
                } else {
                    noticeList.delete(songData.video_id);
                }
            });
        }
        return registeredList;
    }
}

export default UserDataManager;
