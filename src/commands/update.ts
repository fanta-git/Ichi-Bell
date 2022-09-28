import { PlaylistContents } from '../apiTypes';
import { updateNoticeList } from '../noticeListManager';
import SlashCommand from './commandUtil/SlashCommand';

const update: SlashCommand = {
    name: 'update',
    description: '登録されているリストの情報を再登録し、Kiiteのプレイリストの更新を反映させます',
    execute: async (client, interaction) => {
        const songListData = await updateNoticeList(interaction.user.id, interaction.channelId);

        await interaction.reply({
            content: '以下のリストから通知リストを更新しました！',
            embeds: makePlaylistEmbeds(songListData)
        });
    }
};

const makePlaylistEmbeds = (playlist: PlaylistContents) => [{
    title: `${playlist.list_title}`,
    url: `https://kiite.jp/playlist/${playlist.list_id}`,
    description: `**全${playlist.songs.length}曲**\n${playlist.description}`,
    footer: { text: `最終更新: ${playlist.updated_at}` }
}];

export { update };
