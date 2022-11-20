import db from '../database/db';
import { formatListDataEmbed, formatPlaylist, sendWarning } from '../embedsUtil';
import fetchCafeAPI from '../fetchCafeAPI';
import SlashCommand from '../SlashCommand';

const update: SlashCommand = {
    name: 'update',
    description: '登録されているリストの情報を再登録し、Kiiteのプレイリストの更新を反映させます',
    execute: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const { playlist, channelId } = await db.getUser(interaction.user.id) ?? {};
        if (playlist === undefined) return sendWarning(interaction, 'NOTEXIST_LIST');
        const newPlaylist = await fetchCafeAPI('/api/playlists/contents/detail', { list_id: playlist.listId });
        if (newPlaylist.status === 'failed') return sendWarning(interaction, 'FAILD_FETCH_LIST_REGISTED');
        if (channelId === interaction.channelId && newPlaylist.updated_at === playlist.updatedAt) throw Error('プレイリストは最新の状態です！');
        const formated = formatPlaylist(newPlaylist);

        await db.setUser({
            userId: interaction.user.id,
            channelId: interaction.channelId,
            playlist: formated
        });

        await interaction.editReply({
            content: '以下のリストから通知リストを更新しました！',
            embeds: [formatListDataEmbed(formated)]
        });
    }
};

export { update };
