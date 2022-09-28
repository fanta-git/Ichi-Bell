import { userData } from '../database';
import { unregisterNoticeList } from '../noticeListManager';
import SlashCommand from './commandUtil/SlashCommand';

const unregister: SlashCommand = {
    name: 'unregister',
    description: 'リストの登録を解除し、選曲通知を停止します',
    options: [{
        type: 'USER',
        name: 'target',
        description: '登録を解除させたいユーザー（ユーザー指定にはチャンネルの管理権限が必要です）',
        required: false
    }],
    execute: async (client, interaction) => {
        const target = interaction.options.getUser('target') ?? interaction.user;
        const isMyself = target.id === interaction.user.id;
        const { channelId } = await userData.get(interaction.user.id) ?? {};
        if (!isMyself && interaction.channelId !== channelId) throw Error('指定ユーザーのリスト登録解除は通知先として設定されているチャンネル内で行う必要があります！');

        if (!isMyself && !interaction.memberPermissions?.has('MANAGE_CHANNELS')) {
            throw Error('指定ユーザーのリスト登録解除にはチャンネルの管理権限が必要です！');
        }

        await unregisterNoticeList(interaction.user.id);

        await interaction.reply({
            content: isMyself ? 'リストの登録を解除しました！' : `<@${target.id}>のリストの登録を解除しました！`,
            ephemeral: isMyself
        });
    }
};

export { unregister };
