import Keyv from 'keyv';

import { PlaylistContents } from './apiTypes';

type userDataContents = {
    registeredList: PlaylistContents | undefined,
    userId: string | undefined,
    dm: boolean | undefined,
    channelId: string | undefined
};

const noticeList: Keyv<string[]> = new Keyv('sqlite://db.sqlite', { table: 'noticeList' });
const userData: Keyv<userDataContents> = new Keyv('sqlite://db.sqlite', { table: 'userData' });

export { noticeList, userData };
