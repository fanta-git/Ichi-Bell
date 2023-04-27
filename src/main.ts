import { Client, GatewayIntentBits } from 'discord.js';
import http from 'http';

import * as commands from './commands';
import observeNextSong from './observeNextSong';
import { TEST_SERVER_ID, TOKEN } from './envs';
import executeCommand from './executeCommand';

const client = new Client({ intents: [GatewayIntentBits.Guilds] });
const server = http.createServer((request, response) => {
    response.writeHead(200, { 'Content-Type': 'text/plain' });
    response.end('Bot is online!');
}).listen(3000);

client.once('ready', async readyClient => {
    console.log(`${readyClient.user.tag} Ready!`);

    observeNextSong(readyClient).then(() => {
        server.close();
        readyClient.destroy();
    });

    const commandsData = Object.values(commands).map(v => v.data);
    if (TEST_SERVER_ID === undefined) {
        readyClient.application.commands.set(commandsData);
    } else {
        readyClient.application.commands.set([]);
        readyClient.application.commands.set(commandsData, TEST_SERVER_ID);
    }
});

client.on('interactionCreate', executeCommand);

client.login(TOKEN);
