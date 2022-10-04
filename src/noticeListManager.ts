import { noticeList, updateDatabase, userData, userDataContents } from './database';

const registerNoticeList = async (data: userDataContents) => {
    await unregisterNoticeList(data.userId);

    for (const song of data.registeredList.songs) {
        await updateDatabase(noticeList, song.video_id, (list = []) => {
            const index = list.findIndex(v => v === data.userId);
            if (index === -1) list.push(data.userId);
            return list.length ? list : undefined;
        });
    }

    await userData.set(data.userId, data);

    return data;
};

const unregisterNoticeList = async (userId: string) => {
    const data = await userData.get(userId);
    if (data === undefined) throw Error('リストが登録されていません！');
    await userData.delete(userId);

    for (const song of data.registeredList.songs) {
        await updateDatabase(noticeList, song.video_id, (list = []) => {
            const index = list.findIndex(v => v === userId);
            if (index !== -1) list.splice(index, 1);
            return list.length ? list : undefined;
        });
    }

    return data;
};

export { registerNoticeList, unregisterNoticeList };
