import discord, { MessageActionRow } from 'discord.js';

const CUSTOM_ID = {
    HEAD: 'head',
    TAIL: 'tail',
    PREV: 'prev',
    NEXT: 'next',
    JUMP: 'jump',
    SELECT: 'select'
} as const;

class Pages {
    interaction: discord.CommandInteraction;
    embeds: discord.MessageEmbed[] | discord.MessageEmbedOptions[];
    currentPage: number;

    constructor (interaction: discord.CommandInteraction, embeds: discord.MessageEmbed[] | discord.MessageEmbedOptions[]) {
        this.interaction = interaction;
        this.embeds = embeds;
        this.currentPage = 0;
    }

    async send (): Promise<void> {
        await this.interaction.reply(this.getMessage());

        const reply = await this.interaction.fetchReply() as discord.Message;
        const collector = reply.createMessageComponentCollector({
            filter: ({ user }) => user.id === this.interaction.user.id
        });

        collector.on('collect', (inter) => {
            const displayJump = inter.customId === CUSTOM_ID.JUMP;

            if (inter.customId === CUSTOM_ID.HEAD) {
                this.currentPage = 0;
            }

            if (inter.customId === CUSTOM_ID.TAIL) {
                this.currentPage = this.embeds.length - 1;
            }

            if (inter.customId === CUSTOM_ID.PREV) {
                this.currentPage--;
            }

            if (inter.customId === CUSTOM_ID.NEXT) {
                this.currentPage++;
            }

            if (inter.customId === CUSTOM_ID.SELECT && inter.isSelectMenu()) {
                this.currentPage = Number(inter.values[0]);
            }

            inter.update(this.getMessage(displayJump));
        });
    }

    private getMessage (displayJump: boolean = false) {
        const isHead = this.currentPage === 0;
        const isTail = this.currentPage === this.embeds.length - 1;

        const buttons = [
            new discord.MessageButton({
                customId: CUSTOM_ID.HEAD,
                style: 'SECONDARY',
                emoji: '⏪',
                disabled: isHead
            }),
            new discord.MessageButton({
                customId: CUSTOM_ID.PREV,
                style: 'SECONDARY',
                emoji: '◀️',
                disabled: isHead
            }),
            new discord.MessageButton({
                customId: CUSTOM_ID.JUMP,
                style: 'SECONDARY',
                emoji: '#️⃣'
            }),
            new discord.MessageButton({
                customId: CUSTOM_ID.NEXT,
                style: 'SECONDARY',
                emoji: '▶️',
                disabled: isTail
            }),
            new discord.MessageButton({
                customId: CUSTOM_ID.TAIL,
                style: 'SECONDARY',
                emoji: '⏩',
                disabled: isTail
            })
        ];

        const jumpMenu = [new discord.MessageSelectMenu({
            custom_id: CUSTOM_ID.SELECT,
            type: 'SELECT_MENU',
            options: Array(this.embeds.length).fill(undefined).map((_, i) => ({
                label: `${i + 1}ページ目`,
                value: String(i),
                default: i === this.currentPage
            }))
        })];

        return {
            embeds: [this.embeds[this.currentPage]],
            components: [
                new MessageActionRow({
                    components: displayJump ? jumpMenu : buttons
                })
            ]
        };
    }
}

export default Pages;
