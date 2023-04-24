import fetchCafeAPI from '../fetchCafeAPI';
import SlashCommand from './SlashCommand';

const now: SlashCommand = {
    name: 'now',
    description: 'Cafeで今流れている曲やCafeにいる人数などを表示します',
    execute: async (client, interaction) => {
        await interaction.deferReply({ ephemeral: true });

        const userCount = await fetchCafeAPI('/api/cafe/user_count');
        const nowSong = await fetchCafeAPI('/api/cafe/now_playing');
        const rotateData = await fetchCafeAPI('/api/cafe/rotate_users', { ids: [nowSong.id] });
        const artistData = await fetchCafeAPI('/api/artist/id', { artist_id: nowSong.artist_id });
        await interaction.editReply({
            embeds: [{
                title: nowSong.title,
                url: 'https://www.nicovideo.jp/watch/' + nowSong.baseinfo.video_id,
                author: {
                    name: nowSong.baseinfo.user_nickname,
                    icon_url: nowSong.baseinfo.user_icon_url,
                    url: 'https://kiite.jp/creator/' + artistData?.creator_id ?? ''
                },
                thumbnail: { url: nowSong.thumbnail },
                color: parseInt(nowSong.colors[0].slice(1), 16),
                fields: [
                    {
                        name: formatStatusbar(Date.now() - Date.parse(nowSong.start_time), nowSong.msec_duration, 12),
                        value: `${msTommss(Date.now() - Date.parse(nowSong.start_time))} / ${msTommss(nowSong.msec_duration)}`,
                        inline: false
                    },
                    {
                        name: ':arrow_forward:再生数',
                        value: Number(nowSong.baseinfo.view_counter).toLocaleString('ja'),
                        inline: true
                    },
                    {
                        name: ':busts_in_silhouette:Cafe内の人数',
                        value: userCount.toLocaleString('ja'),
                        inline: true
                    },
                    {
                        name: ':arrows_counterclockwise:回転数',
                        value: (rotateData[nowSong.id]?.length ?? 0).toLocaleString('ja'),
                        inline: true
                    }
                ]
            }]
        });
    }
};

const formatStatusbar = (nowVal: number, maxVal: number, barLength: number) => {
    const nowLength = nowVal * (barLength - 1) / maxVal | 0;
    const statusbarArr: string[] = new Array(barLength).fill('').map((_, i) => {
        if (i === 0) return (nowLength > 0) ? '┣' : '┠';
        if (i === barLength - 1) return (barLength - 1 <= nowLength) ? '┫' : '┤';
        if (i === nowLength) return '╉';
        return (i < nowLength) ? '━' : '─';
    });
    return statusbarArr.join('');
};

const msTommss = (ms: number) => `${ms / 60e3 | 0}:${((ms / 1e3 | 0) % 60).toString().padStart(2, '0')}`;

export { now };
