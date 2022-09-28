import * as discord from 'discord.js';

import getAPI from './getKiiteAPI';
import InteractionReplyer from './ResponseInteraction';
import { PlaylistContents } from './apiTypes';
import * as noticeListManager from './noticeListManager';
import { userData } from './database';
import BookMaker from './BookMaker';

type InteractionFuncs = {
    (interactionReplyer: InteractionReplyer, interaction: discord.CommandInteraction): Promise<void>
};

const commandExecuter = async (interaction: discord.Interaction) => {
    if (!interaction.isCommand()) return;
    const isKey = <T extends object>(target: any, obj: T): target is keyof T => target in obj;
    const interactionReplyer = new InteractionReplyer(interaction);
    try {
        const command = interaction.commandName;
        if (!isKey(command, adaptCommands)) return;
        await adaptCommands[command](interactionReplyer, interaction);
    } catch (e) {
        if (e instanceof Error) {
            interactionReplyer.reply({
                embeds: [{
                    title: e.name,
                    description: e.message,
                    color: '#ff0000'
                }]
            }).catch(e => console.error(e));
        } else {
            console.error(e);
        }
    }
};

const makePlaylistEmbeds = (playlist: PlaylistContents) => [{
    title: `${playlist.list_title}`,
    url: `https://kiite.jp/playlist/${playlist.list_id}`,
    description: `**全${playlist.songs.length}曲**\n${playlist.description}`,
    footer: { text: `最終更新: ${playlist.updated_at}` }
}];

const sliceByNumber = <T>(array: T[], number: number):T[][] => {
    const length = Math.ceil(array.length / number);
    return new Array(length).fill(undefined).map((_, i) =>
        array.slice(i * number, (i + 1) * number)
    );
};

const adaptCommands: Record<string, InteractionFuncs> = {
    now: async (replyManager) => {
        const makeStatusbar = (nowVal: number, maxVal: number, barLength: number) => {
            const nowLength = nowVal * (barLength - 1) / maxVal | 0;
            const statusbarArr: string[] = new Array(barLength).fill('').map((_, i) => {
                if (i === 0) return (nowLength > 0) ? '┣' : '┠';
                if (i === barLength - 1) return (barLength - 1 <= nowLength) ? '┫' : '┤';
                if (i === nowLength) return '╉';
                return (i < nowLength) ? '━' : '─';
            });
            return statusbarArr.join('');
        };

        const msTommss = (ms: number) => `${ms / 60e3 | 0}:${((ms / 1e3 | 0) % 60).toString().padStart(2, '0')}`;

        replyManager.standby({ ephemeral: true });
        const cafeNowP = getAPI('/api/cafe/user_count');
        const nowSong = await getAPI('/api/cafe/now_playing');
        const rotateData = await getAPI('/api/cafe/rotate_users', { ids: nowSong.id.toString() });
        const artistData = await getAPI('/api/artist/id', { artist_id: nowSong.artist_id });
        await replyManager.reply({
            embeds: [{
                title: nowSong.title,
                url: 'https://www.nicovideo.jp/watch/' + nowSong.baseinfo.video_id,
                author: {
                    name: nowSong.baseinfo.user_nickname,
                    icon_url: nowSong.baseinfo.user_icon_url,
                    url: 'https://kiite.jp/creator/' + artistData?.creator_id ?? ''
                },
                thumbnail: { url: nowSong.thumbnail },
                color: nowSong.colors[0],
                fields: [
                    {
                        name: makeStatusbar(Date.now() - Date.parse(nowSong.start_time), nowSong.msec_duration, 12),
                        value: `${msTommss(Date.now() - Date.parse(nowSong.start_time))} / ${msTommss(nowSong.msec_duration)}`,
                        inline: false
                    },
                    {
                        name: ':arrow_forward:再生数',
                        value: Number(nowSong.baseinfo.view_counter).toLocaleString('ja'),
                        inline: true
                    },
                    {
                        name: ':busts_in_silhouette:Cafe内の人数',
                        value: (await cafeNowP).toLocaleString('ja'),
                        inline: true
                    },
                    {
                        name: ':arrows_counterclockwise:回転数',
                        value: (rotateData[nowSong.id]?.length ?? 0).toLocaleString('ja'),
                        inline: true
                    }
                ]
            }]
        });
    },
    register: async (replyManager, interaction) => {
        replyManager.standby({ ephemeral: true });
        const url = interaction.options.getString('url') as string;
        const [listId] = url.match(/(?<=https:\/\/kiite.jp\/playlist\/)\w+/) ?? [];
        if (!listId) throw Error('URLが正しくありません！`https://kiite.jp/playlist/`で始まるURLを入力してください！');
        const songListData = await getAPI('/api/playlists/contents/detail', { list_id: listId });
        if (songListData.status === 'failed') throw Error('プレイリストの取得に失敗しました！URLが間違っていませんか？\nURLが正しい場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。');

        await noticeListManager.registerNoticeList(interaction.user.id, interaction.channelId, songListData);

        await replyManager.reply({
            content: '以下のリストを通知リストとして登録しました！',
            embeds: makePlaylistEmbeds(songListData)
        });
    },
    list: async (replyManager, interaction) => {
        const limit = interaction.options.getNumber('limit') ?? 5;
        const sortType = interaction.options.getString('sort') ?? 'default';
        const { registeredList } = await userData.get(interaction.user.id) ?? {};
        if (registeredList === undefined) throw Error('リストが登録されていません！`/register`コマンドを使ってリストを登録しましょう！');

        const videoIds = registeredList.songs.map(v => v.video_id).join(',');
        const details = await getAPI('/api/songs/by_video_ids', { video_ids: videoIds });
        const playeds = await getAPI('/api/cafe/played', { video_ids: videoIds });

        const playlistDataPage = {
            title: `${registeredList.list_title}`,
            url: `https://kiite.jp/playlist/${registeredList.list_id}`,
            description: `**全${registeredList.songs.length}曲**\n${registeredList.description}`,
            footer: { text: `最終更新: ${registeredList.updated_at}` }
        };

        const getLastPlayed = (lastStartTime: string | undefined) => {
            if (lastStartTime === undefined) return '__選曲可能です__';
            const durationMs = Date.now() - Date.parse(lastStartTime);
            if (durationMs < 60e3) return `${durationMs / 1e3 | 0}秒前に選曲されました`;
            if (durationMs < 60 * 60e3) return `${durationMs / (60e3) | 0}分前に選曲されました`;
            if (durationMs < 24 * 60 * 60e3) return `${durationMs / (60 * 60e3) | 0}時間前に選曲されました`;
            return `${durationMs / (24 * 60 * 60e3) | 0}日前に選曲されました`;
        };

        const displayDataList = registeredList.songs.map(item => ({
            videoId: item.video_id,
            title: details.find(v => v.video_id === item.video_id)?.title,
            lastStartTime: playeds.find(v => v.video_id === item.video_id)?.start_time,
            order: item.order_num
        }));

        if (sortType === 'remaining') {
            displayDataList.sort((a, b) => {
                if (a.lastStartTime === b.lastStartTime === undefined) return a.order - b.order;
                if (a.lastStartTime === undefined) return -1;
                if (b.lastStartTime === undefined) return 1;
                return Date.parse(a.lastStartTime) - Date.parse(b.lastStartTime);
            });
        }

        const playedLines = displayDataList.map((item, i) => {
            const title = `[${item.title}](https://www.nicovideo.jp/watch/${item.videoId})`;
            const lastPlayed = getLastPlayed(item.lastStartTime);

            return `**${i + 1}**.${title}\n└${lastPlayed}`;
        });

        const songDataPages = sliceByNumber(playedLines, limit).map((v, i) => ({
            title: `${registeredList.list_title}`,
            url: `https://kiite.jp/playlist/${registeredList.list_id}`,
            fields: [{
                name: `全${registeredList.songs.length}曲`,
                value: v.join('\n')
            }]
        }));

        const p = new BookMaker(interaction, [playlistDataPage, ...songDataPages], true);
        p.send();
    },
    update: async (replyManager, interaction) => {
        replyManager.standby({ ephemeral: true });
        const songListData = await noticeListManager.updateNoticeList(interaction.user.id, interaction.channelId);

        await replyManager.reply({
            content: '以下のリストから通知リストを更新しました！',
            embeds: makePlaylistEmbeds(songListData)
        });
    },
    unregister: async (replyManager, interaction) => {
        const target = interaction.options.getUser('target') ?? interaction.user;
        const isMyself = target.id === interaction.user.id;
        const { channelId } = await userData.get(interaction.user.id) ?? {};
        if (!isMyself && interaction.channelId !== channelId) throw Error('指定ユーザーのリスト登録解除は通知先として設定されているチャンネル内で行う必要があります！');

        if (!isMyself && !interaction.memberPermissions?.has('MANAGE_CHANNELS')) {
            replyManager.standby({ ephemeral: true });
            throw Error('指定ユーザーのリスト登録解除にはチャンネルの管理権限が必要です！');
        }
        replyManager.standby({ ephemeral: isMyself });

        await noticeListManager.unregisterNoticeList(interaction.user.id);

        await replyManager.reply({
            content: isMyself ? 'リストの登録を解除しました！' : `<@${target.id}>のリストの登録を解除しました！`
        });
    }
};

export default commandExecuter;
