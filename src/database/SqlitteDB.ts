import Keyv from 'keyv';
import { ReturnCafeSong } from '../apiTypes';
import ListDatabase, { user } from './ListDatabase';

const RINGED = 'ringed';
const SQLITE = 'sqlite://db.sqlite';

class SqliteDB implements ListDatabase {
    #targets = new Keyv(SQLITE, { table: 'noticeList' });
    #usersKeyv = new Keyv(SQLITE, { table: 'userData' });
    #utilDataKeyv = new Keyv(SQLITE, { table: 'utilData' });

    constructor () {
        this.#listInit();
    }

    async #listInit () {
        for await (const [, user] of this.#usersKeyv.iterator() as AsyncGenerator<[string, user], never, void>) {
            for (const songId of user.playlist.songIds) {
                this.#addTarget(songId, user.userId);
            }
        }
    }

    async #addTarget (songId: string, userId: string) {
        const targets = await this.#targets.get(songId);
        if (targets === undefined) {
            await this.#targets.set(songId, [userId]);
        } else {
            if (targets.includes(userId)) return;
            targets.push(userId);
            await this.#targets.set(songId, targets);
        }
    }

    async #removeTarget (songId: string, userId: string) {
        const noticeList = await this.#targets.get(songId);
        if (noticeList === undefined) return;
        const userIndex = noticeList.indexOf(userId);
        if (userIndex === -1) return;
        noticeList.splice(userIndex, 1);
        if (noticeList.length === 0) {
            await this.#targets.delete(songId);
        } else {
            await this.#targets.set(songId, noticeList);
        }
    }

    async setUser (data: user): Promise<boolean> {
        await this.deleateUser(data.userId);
        await this.#usersKeyv.set(data.userId, data);

        for (const songId of data.playlist.songIds) {
            await this.#addTarget(songId, data.userId);
        }

        return true;
    }

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
        const targetIds = await this.#targets.get(songId) ?? [];
        const targetUsers: user[] = [];

        for (const id of targetIds) {
            const user = await this.#usersKeyv.get(id);
            if (user && user.playlist.songIds.includes(songId)) targetUsers.push(user);
        }

        return targetUsers;
    }

    setRinged (ringed: ReturnCafeSong): boolean | Promise<boolean> {
        return this.#utilDataKeyv.set(RINGED, ringed);
    }

    getRinged (): Promise<ReturnCafeSong | undefined> {
        return this.#utilDataKeyv.get(RINGED);
    }
}

export default SqliteDB;
