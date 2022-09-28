import discord, { MessageActionRow } from 'discord.js';

const CUSTOM_ID = {
    PREV: 'prev',
    NEXT: 'next',
    JUMP: 'jump',
    SELECT: 'select'
} as const;

class Pages {
    interaction: discord.CommandInteraction;
    embeds: discord.MessageEmbed[] | discord.MessageEmbedOptions[];
    ephemeral: boolean;
    currentPage: number;

    constructor (interaction: discord.CommandInteraction, embeds: discord.MessageEmbed[] | discord.MessageEmbedOptions[], ephemeral: boolean = false) {
        this.interaction = interaction;
        this.embeds = embeds;
        this.ephemeral = ephemeral;
        this.currentPage = 0;
    }

    async send (): Promise<void> {
        await this.interaction.reply(this.getMessage());

        const reply = await this.interaction.fetchReply() as discord.Message;
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
            new discord.MessageButton({
                customId: CUSTOM_ID.PREV,
                style: 'SECONDARY',
                emoji: '◀️',
                disabled: isHead
            }),
            new discord.MessageButton({
                customId: CUSTOM_ID.JUMP,
                style: 'PRIMARY',
                label: `${this.currentPage + 1}/${this.embeds.length}`
            }),
            new discord.MessageButton({
                customId: CUSTOM_ID.NEXT,
                style: 'SECONDARY',
                emoji: '▶️',
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
            ],
            ephemeral: this.ephemeral
        };
    }
}

export default Pages;
