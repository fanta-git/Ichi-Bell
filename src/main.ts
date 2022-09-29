import * as discord from 'discord.js';
import dotenv from 'dotenv';

import * as commands from './commands';
import observeNextSong from './observeNextSong';
import createServer from './createServer';
import noticelistCheck from './noticelistCheck';

const server = createServer();
const client = new discord.Client({ intents: ['GUILDS'] });

const commandsMap = new Map([...Object.entries(commands)]);
dotenv.config();

client.once('ready', () => {
    console.log(`${client.user?.tag} Ready!`);

    observeNextSong(client).then(() => {
        server.close();
        client.destroy();
    });

    if (process.env.TEST_SERVER_ID === undefined) {
        client.application?.commands.set([...commandsMap.values()]);
    } else {
        client.application?.commands.set([...commandsMap.values()], process.env.TEST_SERVER_ID);
    }
});

client.on('interactionCreate', (interaction) => {
    if (!interaction.isCommand()) return;
    const calledCommand = commandsMap.get(interaction.commandName);
    if (calledCommand === undefined) return;

    calledCommand.execute(client, interaction)
        .catch(e => {
            if (e instanceof Error) {
                interaction.reply({
                    embeds: [{
                        title: e.name,
                        description: e.message,
                        color: '#ff0000'
                    }]
                }).catch(e => console.error(e));
            } else {
                console.error(e);
            }
        });
});

noticelistCheck().then(() => {
    if (process.env.TOKEN === undefined) throw Error('トークンが設定されていません！');
    client.login(process.env.TOKEN);
});
