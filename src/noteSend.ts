import { APIEmbed, ActionRowBuilder, ButtonBuilder, ButtonStyle, CommandInteraction, ComponentType, StringSelectMenuBuilder } from 'discord.js';
import { customReply } from './embedsUtil';

const TIMEOUT = 60e3;

const CUSTOM_ID = {
    PREV: 'prev',
    NEXT: 'next',
    JUMP: 'jump',
    SELECT: 'select'
} as const;

const noteSend = async (interaction: CommandInteraction, embeds: APIEmbed[]) => {
    let currentPage = 0;
    const sendMessage = createMessage(embeds, currentPage);
    const reply = await customReply(interaction, sendMessage);

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
            if (item.isStringSelectMenu()) currentPage = Number(item.values[0]);
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

const createMessage = (embeds: APIEmbed[], currentPage: number, displayJump = false) => ({
    embeds: [embeds[currentPage]],
    components: [
        new ActionRowBuilder<ButtonBuilder | StringSelectMenuBuilder>({
            components: displayJump
                ? createJumpComponent(currentPage, embeds.length)
                : createMoveComponent(currentPage, embeds.length)
        })
    ],
    ephemeral: true
});

const createJumpComponent = (currentPage: number, maxPage: number) => [
    new StringSelectMenuBuilder({
        custom_id: CUSTOM_ID.SELECT,
        type: ComponentType.StringSelect,
        options: Array(maxPage).fill(undefined).map((_, i) => ({
            label: `${i + 1}ページ目`,
            value: String(i),
            default: i === currentPage
        }))
    })
];

const createMoveComponent = (currentPage: number, maxPage: number) => [
    new ButtonBuilder({
        customId: CUSTOM_ID.PREV,
        style: ButtonStyle.Secondary,
        emoji: '◀️',
        disabled: currentPage === 0
    }),
    new ButtonBuilder({
        customId: CUSTOM_ID.JUMP,
        style: ButtonStyle.Primary,
        label: `${currentPage + 1}/${maxPage}`
    }),
    new ButtonBuilder({
        customId: CUSTOM_ID.NEXT,
        style: ButtonStyle.Secondary,
        emoji: '▶️',
        disabled: currentPage === maxPage - 1
    })
];

export default noteSend;
