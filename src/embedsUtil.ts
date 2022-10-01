import { PlaylistContents } from './apiTypes';

export const formatListDataEmbed = (list: PlaylistContents) => ({
    title: `${list.list_title}`,
    url: `https://kiite.jp/playlist/${list.list_id}`,
    description: `**全${list.songs.length}曲**\n${list.description}`,
    footer: { text: `最終更新: ${list.updated_at}` }
});

export const subdivision = <T>(array: T[], number: number):T[][] => {
    const length = Math.ceil(array.length / number);
    return new Array(length).fill(undefined).map((_, i) =>
        array.slice(i * number, (i + 1) * number)
    );
};
