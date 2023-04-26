import { ChatInputApplicationCommandData, ChatInputCommandInteraction, CacheType } from 'discord.js';

interface SlashCommand extends ChatInputApplicationCommandData {
    execute: (interaction: ChatInputCommandInteraction<CacheType>) => Promise<void>;
}

export default SlashCommand;
