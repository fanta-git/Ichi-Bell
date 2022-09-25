import discord, { MessageActionRow } from 'discord.js';

const CUSTOM_ID = {
    BACK: 'back',
    FORWARD: 'forward'
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

            inter.update(this.getMessage());
        });
    }

    private getMessage (): discord.InteractionReplyOptions {
        const select = new discord.MessageSelectMenu({
            custom_id: 's',
            type: 'SELECT_MENU',
            options: Array(10).fill(undefined).map((_, i) => ({ label: String(i), value: String(i), default: i === 3 }))
        });
        let components: discord.MessageActionRowComponent[];

        if (this.embeds.length === 0) {
            components = [];
        } else if (this.currentPage === 0) {
            components = [Object.assign({ disabled: true }, this.button.back), this.button.forward];
        } else if (this.currentPage === this.embeds.length - 1) {
            components = [this.button.back, Object.assign({ disabled: true }, this.button.forward)];
        } else {
            components = [this.button.back, this.button.forward];
        }

        return {
            embeds: [this.embeds[this.currentPage]],
            components: [
                new MessageActionRow({ components }),
                new MessageActionRow({ components: [select] })
            ]
        };
    }
}

export default Pages;
