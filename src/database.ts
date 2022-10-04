import Keyv from 'keyv';

import { PlaylistContents, ReturnCafeSong } from './apiTypes';

type userDataContents = {
    registeredList: PlaylistContents,
    userId: string,
    channelId: string
};

type iteratorType<T extends Keyv> = T extends Keyv<infer U, Record<infer V, unknown>>
    ? AsyncGenerator<[V, U]>
    : never;

type UpdateDatabase = {
    <T>(keyvData: Keyv<T>, key: string, updateFunc: (data: T | undefined) => T | undefined): Promise<T | undefined>,
    <T>(keyvData: Keyv<T>, key: string, updateFunc: (data: T | undefined) => Promise<T | undefined>): Promise<T | undefined>
};

const updateDatabase: UpdateDatabase = async (keyvData, key, updateFunc) => {
    const data = await keyvData.get(key);
    const newData = await updateFunc(data);
    if (newData === undefined) {
        await keyvData.delete(key);
        return undefined;
    } else {
        await keyvData.set(key, newData);
        return newData;
    }
};

export const noticeList: Keyv<string[]> = new Keyv('sqlite://db.sqlite', { table: 'noticeList' });
export const userData: Keyv<userDataContents> = new Keyv('sqlite://db.sqlite', { table: 'userData' });
export const utilData: Keyv<ReturnCafeSong> = new Keyv('sqlite://db.sqlite', { table: 'utilData' });

export const registerNoticeList = async (data: userDataContents) => {
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

export const unregisterNoticeList = async (userId: string) => {
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

export const noticelistCheck = async () => {
    for await (const [, user] of userData.iterator() as iteratorType<typeof userData>) {
        for (const song of user.registeredList.songs) {
            const targets = await noticeList.get(song.video_id) ?? [];
            if (targets.includes(user.userId)) continue;
            await noticeList.set(song.video_id, targets.concat(user.userId));
        }
    }
};
