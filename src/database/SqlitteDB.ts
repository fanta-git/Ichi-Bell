/* eslint-disable no-dupe-class-members */
import Keyv from 'keyv';
import { PlaylistContents, ReturnCafeSong } from '../apiTypes';
import ListDatabase, { user } from './ListDatabase';

const LEATEST_RING = 'leatestRing';

type oldUser = {
    userId: string,
    channelId: string,
    registeredList: PlaylistContents
}

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

const userUpgrade = (user: oldUser | undefined): user | undefined => (user && {
    userId: user.userId,
    channelId: user.channelId,
    playlist: user.registeredList
});

const userDowngrade = (user: user | undefined): oldUser | undefined => (user && {
    userId: user.userId,
    channelId: user.channelId,
    registeredList: user.playlist
});

class SqliteDB implements ListDatabase {
    #noticeList: ExpKeyv<string[]>
    #users: ExpKeyv<oldUser>
    #utilData: ExpKeyv<ReturnCafeSong>

    constructor () {
        this.#noticeList = new ExpKeyv<string[]>('sqlite://db.sqlite', { table: 'noticeList' });
        this.#users = new ExpKeyv<oldUser>('sqlite://db.sqlite', { table: 'userData' });
        this.#utilData = new ExpKeyv<ReturnCafeSong>('sqlite://db.sqlite', { table: 'utilData' });

        this.#validateList();
    }

    async #validateList () {
        for await (const [, user] of this.#users.iterator()) {
            for (const song of user.registeredList.songs) {
                const targets = await this.#noticeList.get(song.video_id) ?? [];
                if (targets.includes(user.userId)) continue;
                targets.push(user.userId);
                await this.#noticeList.set(song.video_id, targets);
            }
        }
    }

    async setUser (data: user): Promise<boolean> {
        await this.deleateUser(data.userId);

        for (const song of data.playlist.songs) {
            await this.#noticeList.update(song.video_id, (list = []) => {
                const index = list.findIndex(v => v === data.userId);
                if (index === -1) list.push(data.userId);
                return list.length ? list : undefined;
            });
        }

        await this.#users.set(data.userId, userDowngrade(data)!);

        return true;
    };

    async getUser (userId: string): Promise<user | undefined> {
        return userUpgrade(await this.#users.get(userId));
    }

    async deleateUser (userId: string): Promise<boolean> {
        const data = userUpgrade(await this.#users.get(userId));
        if (data === undefined) return false;
        await this.#users.delete(userId);

        for (const song of data.playlist.songs) {
            await this.#noticeList.update(song.video_id, (list = []) => {
                const index = list.findIndex(v => v === userId);
                if (index !== -1) list.splice(index, 1);
                return list.length ? list : undefined;
            });
        }

        return true;
    }

    async getTargetUsers (songId: string): Promise<user[]> {
        const targetIds = await this.#noticeList.get(songId) ?? [];
        const targetUsers: user[] = [];

        for (const id of targetIds) {
            const user = await this.#users.get(id);
            if (user) targetUsers.push(userUpgrade(user)!);
        };

        return targetUsers;
    }

    setLeatestRing (song: ReturnCafeSong): boolean | Promise<boolean> {
        return this.#utilData.set(LEATEST_RING, song);
    }

    getLeatestRing (): ReturnCafeSong | Promise<ReturnCafeSong | undefined> | undefined {
        return this.#utilData.get(LEATEST_RING);
    }
}

export default SqliteDB;
