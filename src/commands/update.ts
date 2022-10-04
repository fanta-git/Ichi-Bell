import { userData } from '../database';
import { formatListDataEmbed } from '../embedsUtil';
import getKiiteAPI from '../getKiiteAPI';
import { registerNoticeList } from '../noticeListManager';
import SlashCommand from '../SlashCommand';

const update: SlashCommand = {
    name: 'update',
    description: '登録されているリストの情報を再登録し、Kiiteのプレイリストの更新を反映させます',
    execute: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const { registeredList, channelId: registedChannelId } = await userData.get(interaction.user.id) ?? {};
        if (registeredList === undefined) throw Error('リストが登録されていません！`/register`コマンドを使ってリストを登録しましょう！');
        const songListData = await getKiiteAPI('/api/playlists/contents/detail', { list_id: registeredList.list_id });
        if (songListData.status === 'failed') throw Error(`プレイリストの取得に失敗しました！登録されていたリスト（${registeredList.list_title}）は存在していますか？\n存在している場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。`);
        if (registedChannelId === interaction.channelId && songListData.updated_at === registeredList.updated_at) throw Error('プレイリストは最新の状態です！');

        await registerNoticeList({
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
