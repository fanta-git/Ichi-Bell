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
    #targets: Map<string, Set<string>>
    #usersKeyv: Keyv<oldUser>
    #utilDataKeyv: Keyv<ReturnCafeSong>

    constructor () {
        this.#targets = new Map();
        this.#usersKeyv = new Keyv<oldUser>('sqlite://db.sqlite', { table: 'userData' });
        this.#utilDataKeyv = new Keyv<ReturnCafeSong>('sqlite://db.sqlite', { table: 'utilData' });

        this.#listInit();
    }

    async #listInit () {
        for await (const [, user] of this.#usersKeyv.iterator() as AsyncGenerator<[string, oldUser], void, any>) {
            for (const song of user.registeredList.songs) {
                this.#addTarget(song.video_id, user.userId);
            }
        }
    }

    #addTarget (songId: string, userId: string) {
        const targets = this.#targets.get(songId);
        if (targets === undefined) {
            this.#targets.set(songId, new Set([userId]));
        } else {
            targets.add(userId);
        }
    }

    #removeTarget (songId: string, userId: string) {
        const noticeList = this.#targets.get(songId);
        if (noticeList === undefined) return;
        noticeList.delete(userId);
        if (noticeList.size === 0) this.#targets.delete(songId);
    }

    async setUser (data: user): Promise<boolean> {
        await this.deleateUser(data.userId);
        await this.#usersKeyv.set(data.userId, userDowngrade(data)!);

        for (const song of data.playlist.songs) {
            this.#addTarget(song.video_id, data.userId);
        }

        return true;
    };

    async getUser (userId: string): Promise<user | undefined> {
        return userUpgrade(await this.#usersKeyv.get(userId));
    }

    async deleateUser (userId: string): Promise<boolean> {
        const data = userUpgrade(await this.#usersKeyv.get(userId));
        if (data === undefined) return false;
        await this.#usersKeyv.delete(userId);

        for (const song of data.playlist.songs) {
            this.#removeTarget(song.video_id, userId);
        }

        return true;
    }

    async getTargetUsers (songId: string): Promise<user[]> {
        const targetIds = this.#targets.get(songId) ?? [];
        const targetUsers: user[] = [];

        for (const id of targetIds) {
            const user = await this.#usersKeyv.get(id);
            if (user) targetUsers.push(userUpgrade(user)!);
        };

        return targetUsers;
    }

    setLeatestRing (song: ReturnCafeSong): boolean | Promise<boolean> {
        return this.#utilDataKeyv.set(LEATEST_RING, song);
    }

    getLeatestRing (): ReturnCafeSong | Promise<ReturnCafeSong | undefined> | undefined {
        return this.#utilDataKeyv.get(LEATEST_RING);
    }
}

export default SqliteDB;
