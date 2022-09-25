import Keyv from 'keyv';

import { PlaylistContents, ReturnCafeSong } from './apiTypes';

type userDataContents = {
    registeredList: PlaylistContents,
    userId: string,
    channelId: string
};

export type iteratorType<T extends Keyv> = T extends Keyv<infer U, Record<infer V, unknown>>
    ? AsyncGenerator<[V, U]>
    : never;

export const noticeList: Keyv<string[]> = new Keyv('sqlite://db.sqlite', { table: 'noticeList' });
export const userData: Keyv<userDataContents> = new Keyv('sqlite://db.sqlite', { table: 'userData' });
export const utilData: Keyv<ReturnCafeSong> = new Keyv('sqlite://db.sqlite', { table: 'utilData' });
