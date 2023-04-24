import { ReturnCafeSong } from '../apiTypes';

export type playlist = {
    listId: string,
    title: string,
    updatedAt: string,
    description: string,
    songIds: string[]
};

export type user = {
    playlist: playlist,
    userId: string,
    channelId: string
};

type awaitable<T> = T | Promise<T>;

interface ListDatabase {
    setUser (user: user): awaitable<boolean>
    getUser (userId: string): awaitable<user | undefined>
    deleateUser (userId: string): awaitable<boolean>
    getTargetUsers (songId: string): awaitable<user[]>

    setRinged (selectionId: ReturnCafeSong): awaitable<boolean>
    getRinged (): awaitable<ReturnCafeSong | undefined>
}

export default ListDatabase;
