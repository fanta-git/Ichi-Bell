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

    setLeatestRing (selectionId: number): awaitable<boolean>
    getLeatestRing (): awaitable<number | undefined>
}

export default ListDatabase;
