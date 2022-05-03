import * as discord from 'discord.js';

import getAPI from './getKiiteAPI';
import ResponseIntetaction from './ResponseInteraction';
import { PlaylistContents } from './APITypes';
import UserDataClass from './UserDataManager';

type InteractionFuncs = {
    (replyManager: ResponseIntetaction, interaction: discord.CommandInteraction): Promise<void>
};

const commandExecuter = async (interaction: discord.Interaction) => {
    if (!interaction.isCommand() || interaction.commandName !== 'ib') return;
    const isKey = <T extends object>(target: any, obj: T): target is keyof T => target in obj;
    const replyManager = new ResponseIntetaction(interaction);
    try {
        const command = interaction.options.getSubcommand();
        const returns = commands;
        if (!isKey(command, returns)) return;
        await returns[command](replyManager, interaction);
    } catch (e) {
        if (e instanceof Error) {
            replyManager.reply({
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

const commands: Record<string, InteractionFuncs> = {
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

        const userData = new UserDataClass(interaction.user.id);
        await userData.registerNoticeList(songListData, interaction.channelId, !interaction.inGuild());

        await replyManager.reply({
            content: '以下のリストを通知リストとして登録しました！',
            embeds: makePlaylistEmbeds(songListData)
        });
    },
    list: async (replyManager, interaction) => {
        replyManager.standby({ ephemeral: true });
        const userData = new UserDataClass(interaction.user.id);
        const { registeredList } = await userData.getData();
        if (registeredList === undefined) throw Error('リストが登録されていません！`/ib register`コマンドを使ってリストを登録しましょう！');

        await replyManager.reply({
            content: '以下のリストが通知リストとして登録されています！',
            embeds: makePlaylistEmbeds(registeredList)
        });
    },
    update: async (replyManager, interaction) => {
        replyManager.standby({ ephemeral: true });
        const userData = new UserDataClass(interaction.user.id);
        const songListData = await userData.updateNoticeList(interaction.channelId, !interaction.inGuild());

        await replyManager.reply({
            content: '以下のリストから通知リストを更新しました！',
            embeds: makePlaylistEmbeds(songListData)
        });
    },
    unregister: async (replyManager, interaction) => {
        const target = interaction.options.getUser('target') ?? interaction.user;
        const isMyself = target.id === interaction.user.id;
        const userData = new UserDataClass(target.id);
        const { channelId } = await userData.getData();
        if (!isMyself && interaction.channelId !== channelId) throw Error('指定ユーザーのリスト登録解除は通知先として設定されているチャンネル内で行う必要があります！');

        if (!isMyself && !interaction.memberPermissions?.has('MANAGE_CHANNELS')) {
            replyManager.standby({ ephemeral: true });
            throw Error('指定ユーザーのリスト登録解除にはチャンネルの管理権限が必要です！');
        }
        replyManager.standby({ ephemeral: isMyself });

        await userData.unregisterNoticeList();

        await replyManager.reply({
            content: isMyself ? 'リストの登録を解除しました！' : `<@${target.id}>のリストの登録を解除しました！`
        });
    }
};

export default commandExecuter;
