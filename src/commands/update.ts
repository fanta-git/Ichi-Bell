import { userData, registerData } from '../database';
import { formatListDataEmbed, sendWarning } from '../embedsUtil';
import fetchCafeAPI from '../fetchCafeAPI';
import SlashCommand from '../SlashCommand';

const update: SlashCommand = {
    name: 'update',
    description: '登録されているリストの情報を再登録し、Kiiteのプレイリストの更新を反映させます',
    execute: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const { registeredList, channelId: registedChannelId } = await userData.get(interaction.user.id) ?? {};
        if (registeredList === undefined) return sendWarning(interaction, 'NOTEXIST_LIST');
        const songListData = await fetchCafeAPI('/api/playlists/contents/detail', { list_id: registeredList.list_id });
        if (songListData.status === 'failed') return sendWarning(interaction, 'FAILD_FETCH_LIST_REGISTED');
        if (registedChannelId === interaction.channelId && songListData.updated_at === registeredList.updated_at) throw Error('プレイリストは最新の状態です！');

        await registerData({
            userId: interaction.user.id,
            channelId: interaction.channelId,
            registeredList: songListData
        });

        await interaction.editReply({
            content: '以下のリストから通知リストを更新しました！',
            embeds: [formatListDataEmbed(songListData)]
        });
    }
};

export { update };
