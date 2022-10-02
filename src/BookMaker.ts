import discord, { ButtonBuilder, SelectMenuBuilder } from 'discord.js';

const TIMEOUT = 60e3;

const CUSTOM_ID = {
    PREV: 'prev',
    NEXT: 'next',
    JUMP: 'jump',
    SELECT: 'select'
} as const;

type embed = discord.JSONEncodable<discord.APIEmbed> | discord.APIEmbed;

class BookMaker {
    interaction: discord.CommandInteraction;
    embeds: embed[];
    ephemeral: boolean;
    currentPage: number;

    constructor (interaction: discord.CommandInteraction, embeds: embed[], ephemeral: boolean = false) {
        this.interaction = interaction;
        this.embeds = embeds;
        this.ephemeral = ephemeral;
        this.currentPage = 0;
    }

    async send (): Promise<void> {
        await this.interaction.reply(this.getMessage());

        const reply = await this.interaction.fetchReply();
        const collector = reply.createMessageComponentCollector({
            filter: v => v.user.id === this.interaction.user.id,
            idle: TIMEOUT
        });

        collector.on('collect', (item) => {
            const displayJump = item.customId === CUSTOM_ID.JUMP;

            if (item.customId === CUSTOM_ID.PREV) {
                this.currentPage--;
            }

            if (item.customId === CUSTOM_ID.NEXT) {
                this.currentPage++;
            }

            if (item.customId === CUSTOM_ID.SELECT && item.isSelectMenu()) {
                this.currentPage = Number(item.values[0]);
            }

            item.update(this.getMessage(displayJump));
        });

        collector.on('end', (item, reason) => {
            this.interaction.editReply({
                embeds: [
                    this.embeds[this.currentPage],
                    {
                        title: 'タイムアウト',
                        description: 'このメッセージはタイムアウトしました。再度コマンドを送信してください。',
                        color: 0xff0000
                    }
                ],
                components: []
            });
        });
    }

    private getMessage (displayJump: boolean = false) {
        const isHead = this.currentPage === 0;
        const isTail = this.currentPage === this.embeds.length - 1;

        const components = displayJump
            ? [
                new discord.SelectMenuBuilder({
                    custom_id: CUSTOM_ID.SELECT,
                    type: discord.ComponentType.SelectMenu,
                    options: Array(this.embeds.length).fill(undefined).map((_, i) => ({
                        label: `${i + 1}ページ目`,
                        value: String(i),
                        default: i === this.currentPage
                    }))
                })
            ]
            : [
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

        return {
            embeds: [this.embeds[this.currentPage]],
            components: [new discord.ActionRowBuilder<ButtonBuilder | SelectMenuBuilder>({ components })],
            ephemeral: this.ephemeral
        };
    }
}

export default BookMaker;
