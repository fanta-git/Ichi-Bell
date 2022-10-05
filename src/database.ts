/* eslint-disable no-dupe-class-members */
import Keyv from 'keyv';

import { PlaylistContents, ReturnCafeSong } from './apiTypes';

type userDataContents = {
    registeredList: PlaylistContents,
    userId: string,
    channelId: string
};

class ExpKeyv<Value = any, Options extends Record<string, any> = Record<string, unknown>> extends Keyv<Value, Options> {
    iterator (namespace?: string | undefined): AsyncGenerator<[string, Value], void, any> {
        return super.iterator(namespace);
    }

    update (key: string, updateFunc: (data: Value | undefined) => Value | undefined): Promise<Value | undefined>
    update (key: string, updateFunc: (data: Value | undefined) => Promise<Value | undefined>): Promise<Value | undefined>

    async update (key: string, updateFunc: any): Promise<any> {
        const data = await this.get(key);
        const newData = await updateFunc(data);
        if (newData === undefined) {
            await this.delete(key);
            return undefined;
        } else {
            await this.set(key, newData);
            return newData;
        }
    }
}

export const noticeList = new ExpKeyv<string[]>('sqlite://db.sqlite', { table: 'noticeList' });
export const userData = new ExpKeyv<userDataContents>('sqlite://db.sqlite', { table: 'userData' });
export const utilData = new ExpKeyv<ReturnCafeSong>('sqlite://db.sqlite', { table: 'utilData' });

export const registerData = async (data: userDataContents) => {
    await unregisterData(data.userId);

    for (const song of data.registeredList.songs) {
        await noticeList.update(song.video_id, (list = []) => {
            const index = list.findIndex(v => v === data.userId);
            if (index === -1) list.push(data.userId);
            return list.length ? list : undefined;
        });
    }

    await userData.set(data.userId, data);

    return data;
};

export const unregisterData = async (userId: string) => {
    const data = await userData.get(userId);
    if (data === undefined) throw Error('リストが登録されていません！');
    await userData.delete(userId);

    for (const song of data.registeredList.songs) {
        await noticeList.update(song.video_id, (list = []) => {
            const index = list.findIndex(v => v === userId);
            if (index !== -1) list.splice(index, 1);
            return list.length ? list : undefined;
        });
    }

    return data;
};

export const noticelistCheck = async () => {
    for await (const [, user] of userData.iterator()) {
        for (const song of user.registeredList.songs) {
            const targets = await noticeList.get(song.video_id) ?? [];
            if (targets.includes(user.userId)) continue;
            await noticeList.set(song.video_id, targets.concat(user.userId));
        }
    }
};
