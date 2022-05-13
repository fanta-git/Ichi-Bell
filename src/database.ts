import Keyv from 'keyv';

import { PlaylistContents } from './apiTypes';

type userDataContents = {
    registeredList: PlaylistContents,
    userId: string,
    channelId: string
};

const noticeList: Keyv<string[]> = new Keyv('sqlite://db.sqlite', { table: 'noticeList' });
const userData: Keyv<userDataContents> = new Keyv('sqlite://db.sqlite', { table: 'userData' });

export { noticeList, userData };
