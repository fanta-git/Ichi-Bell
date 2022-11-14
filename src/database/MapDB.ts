import { ReturnCafeSong } from '../apiTypes';
import ListDatabase, { user } from './ListDatabase';

class MapDB implements ListDatabase {
    users: Map<string, user>;
    leatestRing: ReturnCafeSong | undefined;

    constructor () {
        this.users = new Map();
    }

    setUser (data: user): boolean {
        this.users.set(data.userId, data);
        return true;
    }

    getUser (userId: string): user | undefined {
        return this.users.get(userId);
    }

    deleateUser (userId: string): boolean {
        return this.users.delete(userId);
    }

    getTargetUsers (songId: string): user[] {
        const targetUsers: user[] = [];
        for (const user of this.users.values()) {
            if (user.playlist.songs.some(v => v.video_id === songId)) {
                targetUsers.push(user);
            }
        }
        return targetUsers;
    }

    setLeatestRing (song: ReturnCafeSong): boolean {
        this.leatestRing = song;
        return true;
    }

    getLeatestRing (): ReturnCafeSong | undefined {
        return this.leatestRing;
    }
}

export default MapDB;
