import * as discord from 'discord.js';

const commandData: discord.ApplicationCommandDataResolvable[] = [
    {
        name: 'now',
        description: 'Cafeで今流れている曲やCafeにいる人数などを表示します'
    },
    {
        name: 'register',
        description: '通知する曲のリストとしてKiiteのプレイリストを登録します',
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
        options: [
            {
                type: 'NUMBER',
                name: 'limit',
                description: '1ページに表示する曲数',
                min_value: 5
            },
            {
                type: 'STRING',
                name: 'sort',
                description: '表示順',
                choices: [
                    { name: 'default', value: 'default' },
                    { name: 'remaining', value: 'remaining' }
                ]
            }
        ]
    },
    {
        name: 'update',
        description: '登録されているリストの情報を再登録し、Kiiteのプレイリストの更新を反映させます'
    },
    {
        name: 'unregister',
        description: 'リストの登録を解除し、選曲通知を停止します',
        options: [{
            type: 'USER',
            name: 'target',
            description: '登録を解除させたいユーザー（ユーザー指定にはチャンネルの管理権限が必要です）',
            required: false
        }]
    }
];

export default commandData;
