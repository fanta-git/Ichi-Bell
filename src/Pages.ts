import discord, { MessageActionRow } from 'discord.js';

const CUSTOM_ID = {
    BACK: 'back',
    FORWARD: 'forward',
    SELECT: 'select'
} as const;

class Pages {
    interaction: discord.CommandInteraction;
    embeds: discord.MessageEmbed[] | discord.MessageEmbedOptions[];
    currentPage: number;
    button: Record<'back' | 'forward', discord.MessageButton>;

    constructor (interaction: discord.CommandInteraction, embeds: discord.MessageEmbed[] | discord.MessageEmbedOptions[]) {
        this.interaction = interaction;
        this.embeds = embeds;
        this.currentPage = 0;
        this.button = {
            back: new discord.MessageButton({
                customId: CUSTOM_ID.BACK,
                style: 'SECONDARY',
                emoji: '◀️'
            }),
            forward: new discord.MessageButton({
                customId: CUSTOM_ID.FORWARD,
                style: 'SECONDARY',
                label: '▶️'
            })
        };
    }

    async send (): Promise<void> {
        await this.interaction.reply(this.getMessage());

        const reply = await this.interaction.fetchReply() as discord.Message;
        const collector = reply.createMessageComponentCollector({
            filter: ({ user }) => user.id === this.interaction.user.id
        });

        collector.on('collect', (inter) => {
            if (inter.customId === CUSTOM_ID.BACK && this.currentPage > 0) {
                this.currentPage--;
            }

            if (inter.customId === CUSTOM_ID.FORWARD && this.currentPage < this.embeds.length - 1) {
                this.currentPage++;
            }

            if (inter.customId === CUSTOM_ID.SELECT && inter.isSelectMenu()) {
                this.currentPage = Number(inter.values[0]);
            }

            inter.update(this.getMessage());
        });
    }

    private getMessage () {
        const select = new discord.MessageSelectMenu({
            custom_id: CUSTOM_ID.SELECT,
            type: 'SELECT_MENU',
            options: Array(this.embeds.length).fill(undefined).map((_, i) => ({
                label: `${i + 1}ページ目`,
                value: String(i),
                default: i === this.currentPage
            }))
        });
        let turnPage: discord.MessageActionRowComponent[];

        if (this.embeds.length === 0) {
            turnPage = [];
        } else if (this.currentPage === 0) {
            turnPage = [Object.assign({}, this.button.back, { disabled: true }), this.button.forward];
        } else if (this.currentPage === this.embeds.length - 1) {
            turnPage = [this.button.back, Object.assign({}, this.button.forward, { disabled: true })];
        } else {
            turnPage = [this.button.back, this.button.forward];
        }

        return {
            embeds: [this.embeds[this.currentPage]],
            components: [
                new MessageActionRow({ components: turnPage }),
                new MessageActionRow({ components: [select] })
            ]
        };
    }
}

export default Pages;
