import Keyv from 'keyv';

import { PlaylistContents, ReturnCafeSong } from './apiTypes';

export type userDataContents = {
    registeredList: PlaylistContents,
    userId: string,
    channelId: string
};

export type iteratorType<T extends Keyv> = T extends Keyv<infer U, Record<infer V, unknown>>
    ? AsyncGenerator<[V, U]>
    : never;

type UpdateDatabase = {
    <T>(keyvData: Keyv<T>, key: string, updateFunc: (data: T | undefined) => T | undefined): Promise<T | undefined>,
    <T>(keyvData: Keyv<T>, key: string, updateFunc: (data: T | undefined) => Promise<T | undefined>): Promise<T | undefined>
};

export const updateDatabase: UpdateDatabase = async (keyvData, key, updateFunc) => {
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
