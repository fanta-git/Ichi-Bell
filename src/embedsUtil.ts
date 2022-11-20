import { ChatInputCommandInteraction } from 'discord.js';
import { PlaylistContents } from './apiTypes';
import { playlist } from './database/ListDatabase';

export const formatPlaylist = (playlist: PlaylistContents): playlist => ({
    listId: playlist.list_id,
    title: playlist.list_title,
    updatedAt: playlist.updated_at,
    description: playlist.description,
    songIds: playlist.songs.map(v => v.video_id)
});

export const formatListDataEmbed = (list: playlist) => ({
    title: `${list.title}`,
    url: `https://kiite.jp/playlist/${list.listId}`,
    description: `**全${list.songIds.length}曲**\n${list.description}`,
    footer: { text: `最終更新: ${list.updatedAt}` }
});

export const subdivision = <T>(array: T[], number: number):T[][] => {
    const length = Math.ceil(array.length / number);
    return new Array(length).fill(undefined).map((_, i) =>
        array.slice(i * number, (i + 1) * number)
    );
};

export const formatLastPlayed = (lastStartTime: string | undefined) => {
    if (lastStartTime === undefined) return undefined;
    const durationMs = Date.now() - Date.parse(lastStartTime);
    if (durationMs >= 24 * 60 * 60e3) return `${durationMs / (24 * 60 * 60e3) | 0}日前`;
    if (durationMs >= 60 * 60e3) return `${durationMs / (60 * 60e3) | 0}時間前`;
    if (durationMs >= 60e3) return `${durationMs / 60e3 | 0}分前`;
    return `${durationMs / 1e3 | 0}秒前`;
};

export const timer = (waitTimeMS: number) => new Promise(
    resolve => waitTimeMS > 0 ? setTimeout(() => resolve(true), waitTimeMS) : resolve(false)
);
export const timeDuration = (isoString: string) => Date.parse(isoString) - Date.now();

const WARN_MESSAGES = {
    NOTEXIST_LIST: { title: 'リストが未登録です', description: '`/register`コマンドを使ってリストを登録しましょう！' },
    OVER_CHARLENGTH: { title: '文字数制限で表示できませんでした', description: 'limitオプションにもっと少ない数を指定してください！' },
    INVALID_LISTURL: { title: 'URLが正しくありません', description: '`https://kiite.jp/playlist/`で始まるURLを入力してください！' },
    FAILD_FETCH_LIST_URL: { title: 'プレイリストの取得に失敗しました', description: 'URLが間違っていませんか？\nURLが正しい場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。' },
    FAILD_FETCH_LIST_REGISTED: { title: 'プレイリストの取得に失敗しました', description: '登録されていたリストは存在していますか？\n存在している場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。' },
    INVAILD_CHANNEL: { title: 'チャンネルが間違っています', description: '指定ユーザーのリスト登録解除は通知先として設定されているチャンネル内で行う必要があります！' },
    PERMISSION_MISSING: { title: '権限がありません', description: '指定ユーザーのリスト登録解除にはチャンネルの管理権限が必要です！' },
    LIST_IS_LATEST: { title: 'プレイリストは最新の状態です！', description: '通知するチャンネルを変更するときは変更先のチャンネルでコマンドを実行してください！' }
} as const;

export const sendWarning = async (interaction: ChatInputCommandInteraction, name: keyof typeof WARN_MESSAGES) => {
    const msg = { embeds: [{ ...WARN_MESSAGES[name], color: 0xffff00 }] };
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(msg);
    } else {
        await interaction.reply(msg);
    }
};
