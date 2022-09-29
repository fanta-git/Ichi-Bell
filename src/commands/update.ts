import { formatListDataEmbed } from '../embedsUtil';
import { updateNoticeList } from '../noticeListManager';
import SlashCommand from '../SlashCommand';

const update: SlashCommand = {
    name: 'update',
    description: '登録されているリストの情報を再登録し、Kiiteのプレイリストの更新を反映させます',
    execute: async (client, interaction) => {
        const songListData = await updateNoticeList(interaction.user.id, interaction.channelId);

        await interaction.reply({
            content: '以下のリストから通知リストを更新しました！',
            embeds: [formatListDataEmbed(songListData)]
        });
    }
};

export { update };
