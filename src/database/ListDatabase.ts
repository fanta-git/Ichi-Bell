import { PlaylistContents, ReturnCafeSong } from '../apiTypes';

export type user = {
    playlist: PlaylistContents,
    userId: string,
    channelId: string
};

type awaitable<T> = T | Promise<T>;

interface ListDatabase {
    setUser (data: user): awaitable<boolean>
    getUser (userId: string): awaitable<user | undefined>
    deleateUser (userId: string): awaitable<boolean>
    getTargetUsers (songId: string): awaitable<user[]>

    setLeatestRing (song: ReturnCafeSong): awaitable<boolean>
    getLeatestRing (): awaitable<ReturnCafeSong | undefined>
}

export default ListDatabase;
