import BookMarker from '../BookMaker';
import { userData } from '../database';
import getKiiteAPI from '../getKiiteAPI';
import SlashCommand from './commandUtil/SlashCommand';

const list: SlashCommand = {
    name: 'list',
    description: '登録されているリストの情報を表示します',
    options: [
        {
            type: 'STRING',
            name: 'sort',
            description: '表示順',
            choices: [
                { name: 'default', value: 'default' },
                { name: 'cooltime', value: 'cooltime' }
            ]
        }
    ],
    execute: async (client, interaction) => {
        const LIMIT = 10;
        const sortType = interaction.options.getString('sort') ?? 'default';
        const { registeredList } = await userData.get(interaction.user.id) ?? {};
        if (registeredList === undefined) throw Error('リストが登録されていません！`/register`コマンドを使ってリストを登録しましょう！');

        const videoIds = registeredList.songs.map(v => v.video_id).join(',');
        const details = await getKiiteAPI('/api/songs/by_video_ids', { video_ids: videoIds });
        const playeds = await getKiiteAPI('/api/cafe/played', { video_ids: videoIds });

        const sliceByNumber = <T>(array: T[], number: number):T[][] => {
            const length = Math.ceil(array.length / number);
            return new Array(length).fill(undefined).map((_, i) =>
                array.slice(i * number, (i + 1) * number)
            );
        };

        const playlistDataPage = {
            title: `${registeredList.list_title}`,
            url: `https://kiite.jp/playlist/${registeredList.list_id}`,
            description: `**全${registeredList.songs.length}曲**\n${registeredList.description}`,
            footer: { text: `最終更新: ${registeredList.updated_at}` }
        };

        const getLastPlayed = (lastStartTime: string | undefined) => {
            if (lastStartTime === undefined) return '__選曲可能です__';
            const durationMs = Date.now() - Date.parse(lastStartTime);
            if (durationMs < 60e3) return `${durationMs / 1e3 | 0}秒前に選曲されました`;
            if (durationMs < 60 * 60e3) return `${durationMs / (60e3) | 0}分前に選曲されました`;
            if (durationMs < 24 * 60 * 60e3) return `${durationMs / (60 * 60e3) | 0}時間前に選曲されました`;
            return `${durationMs / (24 * 60 * 60e3) | 0}日前に選曲されました`;
        };

        const displayDataList = registeredList.songs.map(item => ({
            videoId: item.video_id,
            title: details.find(v => v.video_id === item.video_id)?.title,
            lastStartTime: playeds.find(v => v.video_id === item.video_id)?.start_time,
            order: item.order_num
        }));

        if (sortType === 'cooltime') {
            displayDataList.sort((a, b) => {
                if (a.lastStartTime === b.lastStartTime === undefined) return a.order - b.order;
                if (a.lastStartTime === undefined) return -1;
                if (b.lastStartTime === undefined) return 1;
                return Date.parse(a.lastStartTime) - Date.parse(b.lastStartTime);
            });
        }

        const playedLines = displayDataList.map((item, i) => {
            const title = `[${item.title}](https://www.nicovideo.jp/watch/${item.videoId})`;
            const lastPlayed = getLastPlayed(item.lastStartTime);

            return `**${i + 1}**.${title}\n└${lastPlayed}`;
        });

        const songDataPages = sliceByNumber(playedLines, LIMIT).map((v, i) => ({
            title: `${registeredList.list_title}`,
            url: `https://kiite.jp/playlist/${registeredList.list_id}`,
            fields: [{
                name: `全${registeredList.songs.length}曲`,
                value: v.join('\n')
            }]
        }));

        if (songDataPages.some(v => v.fields[0].value.length > 1024)) {
            interaction.reply({
                embeds: [{
                    title: 'Error',
                    description: '文字数制限で表示できませんでした',
                    color: '#ff0000'
                }],
                ephemeral: true
            }).catch(e => console.error(e));
        }

        const p = new BookMarker(interaction, [playlistDataPage, ...songDataPages], true);
        p.send();
    }
};

export { list };
