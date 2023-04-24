import discord from 'discord.js';

const TIMEOUT = 60e3;

const CUSTOM_ID = {
    PREV: 'prev',
    NEXT: 'next',
    JUMP: 'jump',
    SELECT: 'select'
} as const;

type embed = discord.JSONEncodable<discord.APIEmbed> | discord.APIEmbed;

const noteSend = async (interaction: discord.CommandInteraction, embeds: embed[]) => {
    let currentPage = 0;
    const sendMessage = createMessage(embeds, currentPage);
    if (interaction.deferred || interaction.replied) {
        await interaction.editReply(sendMessage);
    } else {
        await interaction.reply(sendMessage);
    }

    const reply = await interaction.fetchReply();
    const collector = reply.createMessageComponentCollector({
        filter: v => v.user.id === interaction.user.id,
        idle: TIMEOUT
    });

    collector.on('collect', (item) => {
        if (item.customId === CUSTOM_ID.PREV) {
            currentPage--;
        } else if (item.customId === CUSTOM_ID.NEXT) {
            currentPage++;
        } else if (item.customId === CUSTOM_ID.SELECT) {
            if (item.isSelectMenu()) currentPage = Number(item.values[0]);
        }

        const showJumpMenu = item.customId === CUSTOM_ID.JUMP;
        item.update(createMessage(embeds, currentPage, showJumpMenu));
    });

    collector.on('end', () => {
        interaction.editReply({
            embeds: [
                embeds[currentPage],
                {
                    description: 'このメッセージはタイムアウトしました。再度コマンドを送信してください。',
                    color: 0xff0000
                }
            ],
            components: []
        });
    });
};

const createMessage = (embeds: embed[], currentPage: number, displayJump = false) => ({
    embeds: [embeds[currentPage]],
    components: [
        new discord.ActionRowBuilder<discord.ButtonBuilder | discord.SelectMenuBuilder>({
            components: displayJump
                ? createJumpComponent(currentPage, embeds.length)
                : createMoveComponent(currentPage, embeds.length)
        })
    ],
    ephemeral: true
});

const createJumpComponent = (currentPage: number, maxPage: number) => [
    new discord.SelectMenuBuilder({
        custom_id: CUSTOM_ID.SELECT,
        type: discord.ComponentType.SelectMenu,
        options: Array(maxPage + 1).fill(undefined).map((_, i) => ({
            label: `${i + 1}ページ目`,
            value: String(i),
            default: i === currentPage
        }))
    })
];

const createMoveComponent = (currentPage: number, maxPage: number) => [
    new discord.ButtonBuilder({
        customId: CUSTOM_ID.PREV,
        style: discord.ButtonStyle.Secondary,
        emoji: '◀️',
        disabled: currentPage === 0
    }),
    new discord.ButtonBuilder({
        customId: CUSTOM_ID.JUMP,
        style: discord.ButtonStyle.Primary,
        label: `${currentPage + 1}/${maxPage}`
    }),
    new discord.ButtonBuilder({
        customId: CUSTOM_ID.NEXT,
        style: discord.ButtonStyle.Secondary,
        emoji: '▶️',
        disabled: currentPage === maxPage - 1
    })
];

export default noteSend;
