/* eslint-disable no-dupe-class-members */
import Keyv from 'keyv';
import ListDatabase, { user } from './ListDatabase';

const LEATEST_RING = 'leatestRing';

class SqliteDB implements ListDatabase {
    #targets: Map<string, Set<string>>
    #usersKeyv: Keyv<user>
    #utilDataKeyv: Keyv<{ id: number }>

    constructor () {
        this.#targets = new Map();
        this.#usersKeyv = new Keyv<user>('sqlite://db.sqlite', { table: 'userData' });
        this.#utilDataKeyv = new Keyv<{ id: number }>('sqlite://db.sqlite', { table: 'utilData' });

        this.#listInit();
    }

    async #listInit () {
        for await (const [, user] of this.#usersKeyv.iterator() as AsyncGenerator<[string, user], void, any>) {
            for (const songId of user.playlist.songIds) {
                this.#addTarget(songId, user.userId);
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
        await this.#usersKeyv.set(data.userId, data);

        for (const songId of data.playlist.songIds) {
            this.#addTarget(songId, data.userId);
        }

        return true;
    };

    async getUser (userId: string): Promise<user | undefined> {
        return await this.#usersKeyv.get(userId);
    }

    async deleateUser (userId: string): Promise<boolean> {
        const data = await this.#usersKeyv.get(userId);
        if (data === undefined) return false;
        await this.#usersKeyv.delete(userId);

        for (const songId of data.playlist.songIds) {
            this.#removeTarget(songId, userId);
        }

        return true;
    }

    async getTargetUsers (songId: string): Promise<user[]> {
        const targetIds = this.#targets.get(songId) ?? [];
        const targetUsers: user[] = [];

        for (const id of targetIds) {
            const user = await this.#usersKeyv.get(id);
            if (user) targetUsers.push(user);
        };

        return targetUsers;
    }

    setLeatestRing (selectionId: number): boolean | Promise<boolean> {
        return this.#utilDataKeyv.set(LEATEST_RING, { id: selectionId });
    }

    async getLeatestRing (): Promise<number | undefined> {
        return (await this.#utilDataKeyv.get(LEATEST_RING))?.id;
    }
}

export default SqliteDB;
