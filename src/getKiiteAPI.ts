import request from 'request';

import { FuncAPI } from './apiTypes';
require('dotenv').config();

const port = Number(process.env.POOT) ?? 5000;

const getKiiteAPI: FuncAPI = async (url, queryParam = {}) => {
    const now = new Date();
    const stc = getKiiteAPI.staticVariable ??= { apiCallHist: new Array<number>(4).fill(0) };
    const waitTime = Math.max(stc.apiCallHist[0] + 1e3 - now.getTime(), 0);
    stc.apiCallHist.shift();
    stc.apiCallHist.push(now.getTime() + waitTime);
    if (waitTime) await new Promise(resolve => setTimeout(resolve, waitTime));
    console.log(`[${getDateString(new Date())}] ${url}`);

    const { response, body } = await new Promise(resolve =>
        request(
            { url: 'https://cafe.kiite.jp' + url, qs: queryParam, json: true, port: port },
            (error, response, body) => {
                resolve(Object.assign({}, { error: error, response: response, body: body }));
            }
        )
    );

    if (response?.statusCode === 200) {
        return body;
    } else {
        console.error(response);
        throw new Error(`[${response.statusCode}]${response.statusMessage}`);
    }
};

const getDateString = (date: Date) =>
    `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;

export default getKiiteAPI;
