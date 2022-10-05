import * as discord from 'discord.js';
import dotenv from 'dotenv';
import http from 'http';

import * as commands from './commands';
import observeNextSong from './observeNextSong';
import { noticelistCheck } from './database';

dotenv.config();
if (process.env.TOKEN === undefined) throw Error('トークンが設定されていません！');

const client = new discord.Client({ intents: [discord.GatewayIntentBits.Guilds] });
const commandsMap = new Map([...Object.entries(commands)]);
const listCheckPromise = noticelistCheck();
const server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('Bot is online!');
}).listen(3000);

client.once('ready', async () => {
    await listCheckPromise;
    console.log(`${client.user?.tag} Ready!`);

    observeNextSong(client).then(() => {
        server.close();
        client.destroy();
    });

    if (process.env.TEST_SERVER_ID === undefined) {
        client.application?.commands.set([...commandsMap.values()]);
    } else {
        client.application?.commands.set([]);
        client.application?.commands.set([...commandsMap.values()], process.env.TEST_SERVER_ID);
    }
});

client.on('interactionCreate', (interaction) => {
    if (!interaction.isChatInputCommand()) return;
    const calledCommand = commandsMap.get(interaction.commandName);
    if (calledCommand === undefined) return;

    calledCommand.execute(client, interaction)
        .catch(e => {
            console.error(e);
            if (e instanceof Error) {
                const sendMessage = {
                    embeds: [{
                        title: e.name,
                        description: e.message,
                        color: 0xff0000
                    }]
                };

                if (interaction.deferred || interaction.replied) {
                    interaction.editReply(sendMessage).catch();
                } else {
                    interaction.reply(sendMessage).catch();
                }
            }
        });
});

client.login(process.env.TOKEN);
