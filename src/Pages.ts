import discord, { MessageActionRow } from 'discord.js';

class Pages {
    interaction: discord.CommandInteraction;
    currentPage: number;
    embedFunc: (page: number) => discord.MessageEmbed | discord.MessageEmbedOptions
    button: Record<'back' | 'forward', discord.MessageButton>;

    constructor (interaction: discord.CommandInteraction, embedFunc: (page: number) => discord.MessageEmbed | discord.MessageEmbedOptions) {
        this.interaction = interaction;
        this.currentPage = 0;
        this.embedFunc = embedFunc;
        this.button = {
            back: new discord.MessageButton({
                customId: 'back',
                style: 'DANGER',
                label: 'back'
            }),
            forward: new discord.MessageButton({
                customId: 'forward',
                style: 'PRIMARY',
                label: 'forward'
            })
        };
    }

    async send () {
        await this.interaction.reply({
            embeds: [this.embedFunc(this.currentPage)],
            components: [new MessageActionRow({ components: [this.button.back, this.button.forward] })]
        });

        const reply = await this.interaction.fetchReply() as discord.Message;
        const collector = reply.createMessageComponentCollector({
            filter: ({ user }) => user.id === this.interaction.user.id
        });

        collector.on('collect', (inter) => {
            if (inter.customId === 'back') {
                this.currentPage -= 1;
            } else {
                this.currentPage += 1;
            }
            if (this.currentPage < 0) this.currentPage = 0;
            if (this.currentPage >= 10) this.currentPage = 9;
            inter.update({
                embeds: [this.embedFunc(this.currentPage)],
                components: [new MessageActionRow({ components: [this.button.back, this.button.forward] })]
            });
        });
    }
}

export default Pages;
