/* eslint-disable camelcase */
import request from 'request';

export type SelectReasons = {
    type: 'priority_playlist',
    user_id: number,
    list_title: string,
    list_id: string
}|{
    type: 'add_playlist',
    user_id: number,
    list_id: number
}|{
    type: 'favorite',
    user_id: number
};

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
    reasons: Array<SelectReasons>,
    thumbnail: string,
    new_fav_user_ids: number[],
    baseinfo: NicovideoData,
    colors: string[],
    presenter_user_ids: number[] | null,
    belt_message: string | null,
    now_message: string | null,
    rotate_action: string | null,
    bpm: number,
    display_playlist_link: boolean
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

export type FuncAPI = {
    (url: '/api/cafe/now_playing' | '/api/cafe/next_song', queryParam?: never): Promise<ReturnCafeSong>,
    (url: '/api/cafe/user_count', queryParam?: {}): Promise<number>,
    (url: '/api/songs/by_video_ids', queryParam: { video_ids: string }): Promise<ReturnSongData[]>
};

export const getAPI: FuncAPI = async (url, queryParam = {}) => {
    console.log(new Date(), 'APIを呼び出しました');
    const { error, response, body } = await new Promise(resolve =>
        request(
            { url: 'https://cafe.kiite.jp' + url, qs: queryParam, json: true },
            (error, response, body) => {
                resolve(Object.assign({}, { error: error, response: response, body: body }));
            }
        )
    );

    if (response.statusCode === 200) {
        return body;
    } else {
        console.error('APIの読み込みに失敗しました');
        console.error(new Error(error));
        throw new Error(error);
    }
};
