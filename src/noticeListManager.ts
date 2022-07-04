import getKiiteAPI from './getKiiteAPI';
import { noticeList, userData } from './database';
import { PlaylistContents } from './apiTypes';

const registerNoticeList = async (userId: string, channelId: string, playlistData: PlaylistContents) => {
    for (const song of playlistData.songs) {
        noticeList.get(song.video_id).then((item = []) => {
            if (!item.includes(userId)) item.push(userId);
            noticeList.set(song.video_id, item);
        });
    }

    await userData.set(userId, {
        userId: userId,
        channelId: channelId,
        registeredList: playlistData
    });

    return playlistData;
};

const updateNoticeList = async (userId: string, channelId: string) => {
    const { registeredList, channelId: registedChannelId } = await userData.get(userId) ?? {};
    if (registeredList === undefined) throw Error('リストが登録されていません！`/register`コマンドを使ってリストを登録しましょう！');
    const songListData = await getKiiteAPI('/api/playlists/contents/detail', { list_id: registeredList.list_id });
    if (songListData.status === 'failed') throw Error(`プレイリストの取得に失敗しました！登録されていたリスト（${registeredList.list_title}）は存在していますか？\n存在している場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。`);
    if (registedChannelId === channelId && songListData.updated_at === registeredList.updated_at) throw Error('プレイリストは最新の状態です！');
    await unregisterNoticeList(userId);
    await registerNoticeList(userId, channelId, songListData);
    return songListData;
};

const unregisterNoticeList = async (userId: string) => {
    const { registeredList } = await userData.get(userId) ?? {};
    if (registeredList === undefined) throw Error('リストが登録されていません！');
    userData.delete(userId);
    for (const songData of registeredList.songs) {
        noticeList.get(songData.video_id).then((item = []) => {
            const filted = item.filter(v => v !== userId);
            if (filted.length) {
                noticeList.set(songData.video_id, filted);
            } else {
                noticeList.delete(songData.video_id);
            }
        });
    }
    return registeredList;
};

export { registerNoticeList, updateNoticeList, unregisterNoticeList };
