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
    console.log('APIを呼び出しました');

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

export default getKiiteAPI;
