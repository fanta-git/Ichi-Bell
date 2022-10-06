import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import { userData, unregisterData } from '../database';
import SlashCommand from '../SlashCommand';

const OPTIONS = {
    TARGET: 'target'
} as const;

const unregister: SlashCommand = {
    name: 'unregister',
    description: 'リストの登録を解除し、選曲通知を停止します',
    options: [{
        type: ApplicationCommandOptionType.User,
        name: OPTIONS.TARGET,
        description: '登録を解除させたいユーザー（ユーザー指定にはチャンネルの管理権限が必要です）',
        required: false
    }],
    execute: async (client, interaction) => {
        const target = interaction.options.getUser(OPTIONS.TARGET) ?? interaction.user;
        const isMyself = target.id === interaction.user.id;

        await interaction.deferReply({ ephemeral: isMyself });

        const { channelId } = await userData.get(interaction.user.id) ?? {};
        if (!isMyself && interaction.channelId !== channelId) return ['チャンネルが間違っています', '指定ユーザーのリスト登録解除は通知先として設定されているチャンネル内で行う必要があります！'];

        if (!isMyself && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
            return ['権限がありません', '指定ユーザーのリスト登録解除にはチャンネルの管理権限が必要です！'];
        }

        const unregistedList = await unregisterData(interaction.user.id);
        if (unregistedList === undefined) return ['リストが登録されていません', '`register`コマンドでリストを登録しましょう！'];

        await interaction.editReply({
            content: isMyself ? 'リストの登録を解除しました！' : `<@${target.id}>のリストの登録を解除しました！`
        });
    }
};

export { unregister };
