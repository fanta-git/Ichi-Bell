import discord from 'discord.js';

interface SlashCommand extends discord.ChatInputApplicationCommandData {
    execute: (client: discord.Client, interaction: discord.CommandInteraction) => Promise<void>;
};

export default SlashCommand;
