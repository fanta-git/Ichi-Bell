import * as discord from 'discord.js';
import dotenv from 'dotenv';

import commandExecuter from './commandExecuter';
import commandData from './commandData';
import observeNextSong from './observeNextSong';
import createServer from './createServer';

const server = createServer();
const client = new discord.Client({ intents: ['GUILDS'] });
dotenv.config();

client.once('ready', () => {
    observeNextSong(client).then(() => {
        server.close();
        client.destroy();
    });

    if (process.env.TEST_SERVER_ID === undefined) {
        client.application?.commands.set(commandData);
    } else {
        client.application?.commands.set(commandData, process.env.TEST_SERVER_ID);
    }
});

client.on('interactionCreate', commandExecuter);

if (process.env.TOKEN === undefined) throw Error('トークンが設定されていません！');
client.login(process.env.TOKEN);
