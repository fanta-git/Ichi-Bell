import { ApplicationCommandOptionType, PermissionFlagsBits } from 'discord.js';
import SlashCommand from './SlashCommand';
import db from '../database/db';
import { CommandsWarn } from '../customErrors';
import { WARN_MESSAGES } from '../embedsUtil';

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

        const data = await db.getUser(target.id);
        if (data === undefined) throw new CommandsWarn(WARN_MESSAGES.NOTEXIST_LIST);
        if (!isMyself && interaction.channelId !== data.channelId) throw new CommandsWarn(WARN_MESSAGES.INVAILD_CHANNEL);

        if (!isMyself && !interaction.memberPermissions?.has(PermissionFlagsBits.ManageChannels)) {
            throw new CommandsWarn(WARN_MESSAGES.PERMISSION_MISSING);
        }

        await db.deleateUser(target.id);

        await interaction.editReply({
            content: isMyself ? 'リストの登録を解除しました！' : `<@${target.id}>のリストの登録を解除しました！`
        });
    }
};

export { unregister };
