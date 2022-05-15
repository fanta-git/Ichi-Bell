import * as discord from 'discord.js';

class InteractionReplyer {
    #interaction: discord.CommandInteraction<discord.CacheType>;
    #options: discord.InteractionDeferReplyOptions | undefined;
    #timeout: ReturnType<typeof setTimeout> | undefined;

    constructor (interaction: discord.CommandInteraction<discord.CacheType>) {
        this.#interaction = interaction;
    }

    standby (options?: discord.InteractionDeferReplyOptions) {
        this.#options = options;
        this.#timeout = setTimeout(() => this.#interaction.deferReply(options), 2e3);
    }

    reply (options: discord.WebhookEditMessageOptions) {
        if (this.#interaction.replied || this.#interaction.deferred) {
            return this.#interaction.editReply(options);
        } else {
            if (this.#timeout !== undefined) clearTimeout(this.#timeout);
            return this.#interaction.reply({ ...options, ...this.#options });
        }
    }
}

export default InteractionReplyer;
