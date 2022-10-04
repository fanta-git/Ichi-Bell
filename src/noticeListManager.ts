import getKiiteAPI from './getKiiteAPI';
import { noticeList, userData } from './database';
import { PlaylistContents } from './apiTypes';

const registerNoticeList = async (userId: string, channelId: string, playlistData: PlaylistContents) => {
    for (const song of playlistData.songs) {
        const item = await noticeList.get(song.video_id) ?? [];
        if (!item.includes(userId)) item.push(userId);
        await noticeList.set(song.video_id, item);
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

    await userData.set(userId, {
        userId,
        channelId,
        registeredList: songListData
    });

    const removeSongs = registeredList.songs.filter(v => !songListData.songs.includes(v));
    const addSongs = songListData.songs.filter(v => !registeredList.songs.includes(v));

    for (const song of removeSongs) {
        const list = await noticeList.get(song.video_id) ?? [];
        const newList = list.filter(v => v !== song.video_id);
        if (newList.length === 0) {
            await noticeList.delete(song.video_id);
        } else {
            await noticeList.set(song.video_id, newList);
        }
    }

    for (const song of addSongs) {
        const list = await noticeList.get(song.video_id) ?? [];
        list.push(song.video_id);
        await noticeList.set(song.video_id, list);
    }

    return songListData;
};

const unregisterNoticeList = async (userId: string) => {
    const { registeredList } = await userData.get(userId) ?? {};
    if (registeredList === undefined) throw Error('リストが登録されていません！');
    await userData.delete(userId);
    for (const songData of registeredList.songs) {
        const item = await noticeList.get(songData.video_id) ?? [];
        const filted = item.filter(v => v !== userId);
        if (filted.length) {
            await noticeList.set(songData.video_id, filted);
        } else {
            await noticeList.delete(songData.video_id);
        }
    }
    return registeredList;
};

export { registerNoticeList, updateNoticeList, unregisterNoticeList };
