import * as discord from 'discord.js';

const commandData = [{
    name: 'ib',
    description: 'KiiteCafeでの選曲を通知します',
    options: [
        {
            name: 'now',
            description: 'Cafeで今流れている曲やCafeにいる人数などを表示します',
            type: 'SUB_COMMAND'
        },
        {
            name: 'register',
            description: '通知する曲のリストとしてKiiteのプレイリストを登録します',
            type: 'SUB_COMMAND',
            options: [{
                type: 'STRING',
                name: 'url',
                description: '追加するプレイリストのURL',
                required: true
            }]
        },
        {
            name: 'list',
            description: '登録されているリストの情報を表示します',
            type: 'SUB_COMMAND'
        },
        {
            name: 'update',
            description: '登録されているリストの情報を再登録し、Kiiteのプレイリストの更新を反映させます',
            type: 'SUB_COMMAND'
        },
        {
            name: 'unregister',
            description: 'リストの登録を解除し、選曲通知を停止します',
            type: 'SUB_COMMAND',
            options: [{
                type: 'USER',
                name: 'target',
                description: '登録を解除させたいユーザー（ユーザー指定にはチャンネルの管理権限が必要です）',
                required: false
            }]
        }
    ]
}] as discord.ApplicationCommandDataResolvable[];

export default commandData;
