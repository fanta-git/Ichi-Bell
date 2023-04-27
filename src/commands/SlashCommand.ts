import { ChatInputApplicationCommandData, ChatInputCommandInteraction, CacheType } from 'discord.js';

export type SlashCommand = {
    data: ChatInputApplicationCommandData,
    execute: (interaction: ChatInputCommandInteraction<CacheType>) => Promise<void>
};

export default SlashCommand;
