import fetchCafeAPI from '../fetchCafeAPI';
import SlashCommand from '../SlashCommand';
import { registerData } from '../database';
import { formatListDataEmbed, sendWarning } from '../embedsUtil';
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
        if (!listId) return sendWarning(interaction, 'INVALID_LISTURL');
        const songListData = await fetchCafeAPI('/api/playlists/contents/detail', { list_id: listId });
        if (songListData.status === 'failed') return sendWarning(interaction, 'FAILD_FETCH_LIST_URL');

        await registerData({
            userId: interaction.user.id,
            channelId: interaction.channelId,
            registeredList: songListData
        });

        await interaction.editReply({
            content: '以下のリストを通知リストとして登録しました！',
            embeds: [formatListDataEmbed(songListData)]
        });
    }
};

export { register };
