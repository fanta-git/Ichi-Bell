import http from 'http';

const server = () => {
    http.createServer((request, response) => {
        response.writeHead(200, { 'Content-Type': 'text/plain' });
        response.end('Bot is online!');
    }).listen(3000);
};

export default server;
