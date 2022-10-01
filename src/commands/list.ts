import { ApplicationCommandOptionType } from 'discord.js';
import BookMaker from '../BookMaker';
import { userData } from '../database';
import { formatLastPlayed, formatListDataEmbed, subdivision } from '../embedsUtil';
import getKiiteAPI from '../getKiiteAPI';
import SlashCommand from '../SlashCommand';

const LIMIT = 10;
const OPTIONS = {
    SORT: 'sort'
};
const CHOICE = {
    DEFAULT: 'default',
    COOLTIME: 'cooltime'
} as const;
const EMBED_DESCRIPTION_LIMIT = 4096;

const list: SlashCommand = {
    name: 'list',
    description: '登録されているリストの情報を表示します',
    options: [
        {
            type: ApplicationCommandOptionType.String,
            name: OPTIONS.SORT,
            description: '表示順',
            choices: [
                { name: 'default', value: CHOICE.DEFAULT },
                { name: 'cooltime', value: CHOICE.COOLTIME }
            ]
        }
    ],
    execute: async (client, interaction) => {
        const sortType = interaction.options.getString(OPTIONS.SORT) ?? CHOICE.DEFAULT;
        const { registeredList } = await userData.get(interaction.user.id) ?? {};
        if (registeredList === undefined) throw Error('リストが登録されていません！`/register`コマンドを使ってリストを登録しましょう！');

        const videoIds = registeredList.songs.map(v => v.video_id).join(',');
        const details = await getKiiteAPI('/api/songs/by_video_ids', { video_ids: videoIds });
        const playeds = await getKiiteAPI('/api/cafe/played', { video_ids: videoIds });

        const playlistDataPage = formatListDataEmbed(registeredList);

        const displayDataList = registeredList.songs.map(item => ({
            videoId: item.video_id,
            title: details.find(v => v.video_id === item.video_id)?.title,
            lastStartTime: playeds.find(v => v.video_id === item.video_id)?.start_time,
            order: item.order_num
        }));

        if (sortType === CHOICE.COOLTIME) {
            displayDataList.sort((a, b) => {
                if (a.lastStartTime === b.lastStartTime === undefined) return a.order - b.order;
                if (a.lastStartTime === undefined) return -1;
                if (b.lastStartTime === undefined) return 1;
                return Date.parse(a.lastStartTime) - Date.parse(b.lastStartTime);
            });
        }

        const playedLines = displayDataList.map((item, i) => {
            const title = `[${item.title}](https://www.nicovideo.jp/watch/${item.videoId})`;
            const lastPlayed = formatLastPlayed(item.lastStartTime);

            return `**${i + 1}.**${title}\n└${lastPlayed ? lastPlayed + 'に選曲されました' : '__選曲可能です__'}`;
        });

        const songDataPages = subdivision(playedLines, LIMIT).map(v => ({
            title: `${registeredList.list_title}`,
            url: `https://kiite.jp/playlist/${registeredList.list_id}`,
            description: `**全${registeredList.songs.length}曲**\n` + v.join('\n')
        }));

        if (songDataPages.some(v => v.description.length > EMBED_DESCRIPTION_LIMIT)) {
            throw Error('文字数制限で表示できませんでした');
        }

        const book = new BookMaker(interaction, [playlistDataPage, ...songDataPages], true);
        await book.send();
    }
};

export { list };
