import * as discord from 'discord.js';
import { getAPI } from './KiiteAPI';
require('dotenv').config();

type NotificListItem = {
    flag: boolean;
    songList: string[];
    userId: string;
    channel: discord.TextBasedChannel | null;
};

const notificList: { [key: string]: NotificListItem } = {};

const client = new discord.Client({ intents: [discord.Intents.FLAGS.GUILDS] });

const listSongFormat = (title: string[]): string[] => title.map((v, k) => `**${k + 1}. **${v}`);

client.once('ready', () => {
    console.log('Ready!');
    console.log(client.user?.tag);

    const data: Array<discord.ApplicationCommandDataResolvable> = [{
        name: 'kcns',
        description: 'KiiteCafeでの選曲を通知します',
        type: 1,
        options: [
            {
                name: 'now',
                description: 'Cafeで今流れている曲とCafeにいる人数を表示します',
                type: 1
            },
            {
                name: 'start',
                description: '選曲通知をオンにします',
                type: 1
            },
            {
                name: 'stop',
                description: '選曲通知をオフにします',
                type: 1
            },
            {
                name: 'add',
                description: '通知する曲のリストに曲を追加します',
                type: 1,
                options: [{
                    type: 3,
                    name: 'music_id',
                    description: '追加する曲のID',
                    required: true
                }]
            },
            {
                name: 'list',
                description: '通知する曲のリストを表示します',
                type: 1
            }
        ]
    }];

    client.application?.commands.set(data, process.env.TEST_SERVER_ID ?? '');
});

client.on('interactionCreate', async (interaction) => {
    if (!interaction.isCommand() || interaction.commandName !== 'kcns') return;

    switch (interaction.options.getSubcommand()) {
    case 'now': {
        const nowSongP = getAPI('https://cafe.kiite.jp/api/cafe/now_playing');
        const cafeNowP = getAPI('https://cafe.kiite.jp/api/cafe/user_count');

        interaction.reply({
            content: `${(await nowSongP)?.title}\nCafeには現在${await cafeNowP}人います！`,
            ephemeral: true
        });
        break;
    }
    case 'start': {
        notificList[interaction.user.id].flag = true;
        interaction.reply({
            content: '通知リストの曲が選曲される直前に通知します！',
            ephemeral: true
        });
        break;
    }
    case 'stop': {
        notificList[interaction.user.id].flag = false;
        interaction.reply({
            content: '通知を停止しました！',
            ephemeral: true
        });
        break;
    }
    case 'add': {
        const args = interaction.options.getString('music_id')?.split(',');

        if (args) {
            notificList[interaction.user.id] ??= {
                flag: false,
                channel: interaction.channel,
                userId: interaction.user.id,
                songList: []
            };

            const pushList = await getAPI('https://cafe.kiite.jp/api/songs/by_video_ids', { video_ids: args.join(',') });
            console.log('pushList: ', pushList);
            const pushListTitles = pushList.map((v: any) => v.title);

            notificList[interaction.user.id].songList.push(...args);
            interaction.reply({
                embeds: [{
                    fields: [
                        {
                            name: '以下の曲を通知リストに追加しました！',
                            value: listSongFormat(pushListTitles).join('\n')
                        }
                    ]
                }],
                ephemeral: true
            });
        }
        break;
    }
    // case 'r':
    // case 'remove': {
    //     // nanika
    //     break;
    // }
    case 'list': {
        const pushList = await getAPI('https://cafe.kiite.jp/api/songs/by_video_ids', { video_ids: notificList[interaction.user.id].songList.join(',') });

        interaction.reply({
            embeds: [{
                fields: [
                    {
                        name: `全${pushList.length}曲`,
                        value: listSongFormat(pushList.map((v: any) => v.title)).join('\n')
                    }
                ]
            }],
            ephemeral: true
        });
        break;
    }
    // case 'c':
    // case 'clear': {
    //     // nanika
    //     break;
    // }
    }
});

async function observeNextSong (apiUrl: string) {
    const nextSong = await getAPI(apiUrl);
    const nowTime = new Date().getTime();
    const startTime = new Date(nextSong.start_time).getTime();
    const msecDuration = Math.min(nextSong.msec_duration, 480e3);

    for (const key in notificList) {
        if (notificList.flag && notificList[key].songList.some(e => e === nextSong.video_id)) {
            notificList[key].channel?.send(`<@${notificList[key].userId}> リストの曲が流れるよ！`);
        }
    }

    setTimeout(observeNextSong.bind(null, 'https://cafe.kiite.jp/api/cafe/next_song'), Math.max(startTime + msecDuration - 30e3 - nowTime, 3e3));
}

client.login(process.env.TOKEN);
observeNextSong('https://cafe.kiite.jp/api/cafe/now_playing');
