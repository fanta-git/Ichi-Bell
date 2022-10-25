import discord from 'discord.js';

interface SlashCommand extends discord.ChatInputApplicationCommandData {
    execute: (client: discord.Client, interaction: discord.ChatInputCommandInteraction<discord.CacheType>) => Promise<void>;
};

export default SlashCommand;
