import * as discord from 'discord.js';
import * as commands from './commands';
import { CommandsWarn } from './customErrors';

const commandsMap = new Map([...Object.entries(commands)]);

const executeCommand = async (client: discord.Client<boolean>, interaction: discord.Interaction<discord.CacheType>) => {
    if (!interaction.isChatInputCommand()) return;
    const calledCommand = commandsMap.get(interaction.commandName);

    if (calledCommand === undefined) return;

    try {
        await calledCommand.execute(client, interaction);
    } catch (e) {
        if (e instanceof CommandsWarn) {
            customReply(interaction, {
                embeds: [{
                    description: e.message,
                    color: 0xffff00
                }]
            });
        } else if (e instanceof Error) {
            customReply(interaction, {
                embeds: [{
                    description: '不明なエラー',
                    color: 0xff0000
                }]
            });
            console.error(e);
        }
    }
};

const customReply = (interaction: discord.ChatInputCommandInteraction<discord.CacheType>, message: string | discord.MessagePayload | (discord.InteractionEditReplyOptions & discord.InteractionReplyOptions)) => {
    if (interaction.deferred || interaction.replied) {
        interaction.editReply(message);
    } else {
        interaction.reply(message);
    }
};

export default executeCommand;
