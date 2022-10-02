import getKiiteAPI from '../getKiiteAPI';
import SlashCommand from '../SlashCommand';
import { registerNoticeList } from '../noticeListManager';
import { formatListDataEmbed } from '../embedsUtil';
import { ApplicationCommandOptionType } from 'discord.js';

const OPTIONS = {
    URL: 'url'
} as const;

const register: SlashCommand = {
    name: 'register',
    description: '通知する曲のリストとしてKiiteのプレイリストを登録します',
    options: [{
        type: ApplicationCommandOptionType.String,
        name: OPTIONS.URL,
        description: '追加するプレイリストのURL',
        required: true
    }],
    execute: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const url = interaction.options.getString(OPTIONS.URL) as string;
        const [listId] = url.match(/(?<=https:\/\/kiite.jp\/playlist\/)\w+/) ?? [];
        if (!listId) throw Error('URLが正しくありません！`https://kiite.jp/playlist/`で始まるURLを入力してください！');
        const songListData = await getKiiteAPI('/api/playlists/contents/detail', { list_id: listId });
        if (songListData.status === 'failed') throw Error('プレイリストの取得に失敗しました！URLが間違っていませんか？\nURLが正しい場合、Kiiteが混み合っている可能性があるので時間を置いてもう一度試してみてください。');

        await registerNoticeList(interaction.user.id, interaction.channelId, songListData);

        await interaction.editReply({
            content: '以下のリストを通知リストとして登録しました！',
            embeds: [formatListDataEmbed(songListData)]
        });
    }
};

export { register };
