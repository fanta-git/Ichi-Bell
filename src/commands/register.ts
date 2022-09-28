import { PlaylistContents } from '../apiTypes';
import getKiiteAPI from '../getKiiteAPI';
import SlashCommand from './commandUtil/SlashCommand';
import { registerNoticeList } from '../noticeListManager';

const register: SlashCommand = {
    name: 'register',
    description: '通知する曲のリストとしてKiiteのプレイリストを登録します',
    options: [{
        type: 'STRING',
        name: 'url',
        description: '追加するプレイリストのURL',
        required: true
    }],
    execute: async (client, interaction) => {
        const url = interaction.options.getString('url') as string;
        const [listId] = url.match(/(?<=https:\/\/kiite.jp\/playlist\/)\w+/) ?? [];
        if (!listId) throw Error('URLが正しくありません！`https://kiite.jp/playlist/`で始まるURLを入力してください！');
        const songListData = await getKiiteAPI('/api/playlists/contents/detail', { list_id: listId });
        if (songListData.status === 'failed') throw Error('プレイリストの取得に失敗しました！URLが間違っていませんか？\nURLが正しい場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。');

        await registerNoticeList(interaction.user.id, interaction.channelId, songListData);

        await interaction.reply({
            content: '以下のリストを通知リストとして登録しました！',
            embeds: makePlaylistEmbeds(songListData),
            ephemeral: true
        });
    }
};

const makePlaylistEmbeds = (playlist: PlaylistContents) => [{
    title: `${playlist.list_title}`,
    url: `https://kiite.jp/playlist/${playlist.list_id}`,
    description: `**全${playlist.songs.length}曲**\n${playlist.description}`,
    footer: { text: `最終更新: ${playlist.updated_at}` }
}];

export { register };
