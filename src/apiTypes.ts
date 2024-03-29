/* eslint-disable camelcase */
export type User = {
    id: null,
    user_id: number,
    user_name: string,
    nickname: string,
    avatar_url: string
}

export type ArtistData = {
    artist_id: number,
    creator_id: string,
    name: string
}

export type ReasonPriority = {
    type: 'priority_playlist',
    user_id: number,
    list_title: string,
    list_id: string
}

export type ReasonPriorityWithComment = ReasonPriority & {
    playlist_comment: string,
    user: User
}

export type ReasonPlaylist = {
    type: 'add_playlist',
    user_id: number,
    list_id: number
}

export type ReasonFavorite = {
    type: 'favorite',
    user_id: number
}

export type SelectReasons = ReasonPriority | ReasonPlaylist | ReasonFavorite;

export type SelectReasonsWithComment = ReasonPriorityWithComment | ReasonPlaylist | ReasonFavorite;

export type NicovideoData = {
    video_id: string,
    title: string,
    first_retrieve: string,
    description: string,
    genre: string,
    length: string,
    tags: string[],
    thumbnail_url: string,
    view_counter: string,
    comment_num: string,
    mylist_counter: string,
    embeddable: string,
    no_live_play: string,
    user_id: string,
    user_icon_url: string,
    user_nickname: string
};

export type ReturnCafeSong = {
    id: number,
    video_id: string,
    title: string,
    artist_id: number,
    artist_name: string,
    start_time: string,
    msec_duration: number,
    published_at: string,
    request_user_ids: number[],
    created_at: string,
    updated_at: string,
    reasons: SelectReasons[],
    thumbnail: string,
    new_fav_user_ids: number[] | null,
    baseinfo: NicovideoData,
    colors: `#${string}`[],
    presenter_user_ids: number[] | null,
    belt_message: string | null,
    now_message: string | null,
    rotate_action: string | null,
    bpm: number,
    display_playlist_link: boolean
};

export type RetrunCafeSongWithComment = Omit<ReturnCafeSong, 'reasons'> & {
    reasons: SelectReasonsWithComment[]
};

export type ReturnSongData = {
    id: null,
    video_id: string,
    duration: number,
    artist_id: number,
    published_at: string,
    vocaloid_key: string,
    embeddable: boolean,
    title: string,
    video_thumbnail: string
};

export type ContentsSongs = {
    order_num: number,
    video_id: string,
    added_at: string,
    updated_at: string,
    track_description: string
};

export type ContentsOwner = {
    user_id: number,
    user_name: string,
    nickname: string,
    avatar_url: string,
    status: string
};

export type PlaylistContents = {
    status: 'succeeded',
    list_id: string,
    list_title: string,
    created_at: string,
    updated_at: string,
    description: string,
    owner: ContentsOwner,
    songs: ContentsSongs[]
};

export type FailedPlaylistContents = {
    status: 'failed',
    error: {
        message: string
    }
};

export type PlayedSongs = {
    id: null,
    video_id: string,
    start_time: string,
    reasons: SelectReasons[]
};

export type FuncAPI = {
    (url: '/api/cafe/now_playing' | '/api/cafe/next_song'): Promise<ReturnCafeSong>,
    (url: '/api/cafe/user_count'): Promise<number>,
    (url: '/api/songs/by_video_ids', queryParam: { video_ids: string[] }): Promise<ReturnSongData[]>
    (url: '/api/cafe/rotate_users', queryParam: { ids: number[] }): Promise<Record<string, number[]>>
    (url: '/api/cafe/timetable', queryParam: { limit: number, with_comment?: false }): Promise<ReturnCafeSong[]>
    (url: '/api/cafe/timetable', queryParam: { limit: number, with_comment: true }): Promise<RetrunCafeSongWithComment[]>
    (url: '/api/artist/id', queryParam: { artist_id: number | string }): Promise<ArtistData> | null
    (url: '/api/playlists/contents/detail', queryParam: { list_id: string }): Promise<PlaylistContents | FailedPlaylistContents>
    (url: '/api/cafe/played', queryParam: { video_ids: string[] }): Promise<PlayedSongs[]>
};
