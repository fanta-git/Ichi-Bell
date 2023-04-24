import * as discord from 'discord.js';
import http from 'http';

import * as commands from './commands';
import observeNextSong from './observeNextSong';
import { TEST_SERVER_ID, TOKEN } from './envs';
import executeCommand from './executeCommand';

const client = new discord.Client({ intents: [discord.GatewayIntentBits.Guilds] });
const server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('Bot is online!');
}).listen(3000);

client.once('ready', async () => {
    console.log(`${client.user?.tag} Ready!`);

    observeNextSong(client).then(() => {
        server.close();
        client.destroy();
    });

    if (TEST_SERVER_ID === undefined) {
        client.application?.commands.set(Object.values(commands));
    } else {
        client.application?.commands.set([]);
        client.application?.commands.set(Object.values(commands), TEST_SERVER_ID);
    }
});

client.on('interactionCreate', (interaction) => {
    executeCommand(client, interaction);
});

client.login(TOKEN);
