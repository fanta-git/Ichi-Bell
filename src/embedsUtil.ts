import { APIEmbed, CommandInteraction, InteractionEditReplyOptions, InteractionReplyOptions, MessagePayload, bold, channelLink, escapeMarkdown, inlineCode, quote } from 'discord.js';
import { PlaylistContents } from './apiTypes';
import { playlist } from './database/ListDatabase';

export const formatPlaylist = (playlist: PlaylistContents): playlist => ({
    listId: playlist.list_id,
    title: playlist.list_title,
    updatedAt: playlist.updated_at,
    description: playlist.description,
    songIds: playlist.songs.map(v => v.video_id)
});

const MAX_LINES = 5;
const abbreviate = (str: string) => {
    const lines = str.split('\n');
    const abbreviated = lines.length <= MAX_LINES ? lines : lines.splice(0, MAX_LINES - 1).concat('…');
    return abbreviated.map(quote).join('\n');
};

export const formatListDataEmbed = (list: playlist, noticeChannelId: string) => ({
    ...formatTitle(list),
    description: `${abbreviate(escapeMarkdown(list.description))}\n:loudspeaker:通知場所：${channelLink(noticeChannelId)}`,
    footer: { text: '最終更新' },
    timestamp: list.updatedAt
} satisfies APIEmbed);

export const formatTitle = (list: playlist) => ({
    title: `${bold(escapeMarkdown(list.title))}${inlineCode(`（全${list.songIds.length}曲）`)}`,
    url: `https://kiite.jp/playlist/${list.listId}`
} satisfies APIEmbed);

export const subdivision = <T>(array: T[], number: number):T[][] => {
    const length = Math.ceil(array.length / number);
    return new Array(length).fill(undefined).map((_, i) =>
        array.slice(i * number, (i + 1) * number)
    );
};

export const timer = (waitTimeMS: number) => new Promise(
    resolve => waitTimeMS > 0 ? setTimeout(() => resolve(true), waitTimeMS) : resolve(false)
);
export const timeDuration = (isoString: string) => Date.parse(isoString) - Date.now();

export const WARN_MESSAGES = {
    NOTEXIST_LIST: 'リストが未登録です\n`/register`コマンドを使ってリストを登録しましょう！',
    OVER_CHARLENGTH: '文字数制限で表示できませんでした\nlimitオプションにもっと少ない数を指定してください！',
    INVALID_LISTURL: 'URLが正しくありません\n`https://kiite.jp/playlist/`で始まるURLを入力してください！',
    FAILD_FETCH_LIST_URL: 'プレイリストの取得に失敗しました\nURLが間違っていませんか？\nURLが正しい場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。',
    FAILD_FETCH_LIST_REGISTED: 'プレイリストの取得に失敗しました\n登録されていたリストは存在していますか？\n存在している場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。',
    INVAILD_CHANNEL: 'チャンネルが間違っています\n指定ユーザーのリスト登録解除は通知先として設定されているチャンネル内で行う必要があります！',
    PERMISSION_MISSING: '権限がありません\n指定ユーザーのリスト登録解除にはチャンネルの管理権限が必要です！',
    LIST_IS_LATEST: 'プレイリストは最新の状態です！\n通知するチャンネルを変更するときは変更先のチャンネルでコマンドを実行してください！'
} as const;

export const customReply = async (interaction: CommandInteraction, message: string | MessagePayload | (InteractionEditReplyOptions & InteractionReplyOptions)) => {
    if (interaction.deferred || interaction.replied) return interaction.editReply(message);
    const reply = await interaction.reply(message);
    return reply.fetch();
};
