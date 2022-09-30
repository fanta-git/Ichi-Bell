import discord, { ButtonBuilder, SelectMenuBuilder } from 'discord.js';

const CUSTOM_ID = {
    PREV: 'prev',
    NEXT: 'next',
    JUMP: 'jump',
    SELECT: 'select'
} as const;

class BookMaker {
    interaction: discord.CommandInteraction;
    embeds: discord.APIEmbed[];
    ephemeral: boolean;
    currentPage: number;

    constructor (interaction: discord.CommandInteraction, embeds: discord.APIEmbed[], ephemeral: boolean = false) {
        this.interaction = interaction;
        this.embeds = embeds;
        this.ephemeral = ephemeral;
        this.currentPage = 0;
    }

    async send (): Promise<void> {
        await this.interaction.reply(this.getMessage());

        const reply = await this.interaction.fetchReply();
        const collector = reply.createMessageComponentCollector({
            filter: v => v.user.id === this.interaction.user.id
        });

        collector.on('collect', (inter) => {
            const displayJump = inter.customId === CUSTOM_ID.JUMP;

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
            new discord.ButtonBuilder({
                customId: CUSTOM_ID.PREV,
                style: discord.ButtonStyle.Secondary,
                emoji: '◀️',
                disabled: isHead
            }),
            new discord.ButtonBuilder({
                customId: CUSTOM_ID.JUMP,
                style: discord.ButtonStyle.Primary,
                label: `${this.currentPage + 1}/${this.embeds.length}`
            }),
            new discord.ButtonBuilder({
                customId: CUSTOM_ID.NEXT,
                style: discord.ButtonStyle.Secondary,
                emoji: '▶️',
                disabled: isTail
            })
        ];

        const jumpMenu = [new discord.SelectMenuBuilder({
            custom_id: CUSTOM_ID.SELECT,
            type: discord.ComponentType.SelectMenu,
            options: Array(this.embeds.length).fill(undefined).map((_, i) => ({
                label: `${i + 1}ページ目`,
                value: String(i),
                default: i === this.currentPage
            }))
        })];

        return {
            embeds: [this.embeds[this.currentPage]],
            components: [
                new discord.ActionRowBuilder<ButtonBuilder | SelectMenuBuilder>({
                    components: displayJump ? jumpMenu : buttons
                })
            ],
            ephemeral: this.ephemeral
        };
    }
}

export default BookMaker;
