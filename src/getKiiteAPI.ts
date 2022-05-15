import request from 'request';

import { FuncAPI } from './apiTypes';

const API_CALL_MAX_PER_SECOND = 4;

const port = Number(process.env.POOT) ?? 5000;
const apiCallHist: number[] = new Array(API_CALL_MAX_PER_SECOND).fill(0);

const getKiiteAPI: FuncAPI = async (url, queryParam = {}) => {
    const nowTime = Date.now();
    const waitTime = Math.max(apiCallHist[0] + 1e3 - nowTime, 0);
    apiCallHist.shift();
    apiCallHist.push(nowTime + waitTime);
    if (waitTime > 0) await new Promise(resolve => setTimeout(resolve, waitTime));
    const formated = getDateString(new Date());
    console.log(`[${formated}] ${url}`);

    const { error, response, body } = await new Promise(resolve =>
        request(
            { url: 'https://cafe.kiite.jp' + url, qs: queryParam, json: true, port: port },
            (error, response, body) => {
                resolve({ error: error, response: response, body: body });
            }
        )
    );

    if (response?.statusCode === 200) {
        return body;
    } else {
        console.error(response);
        console.error(error);
        throw new Error(`[${response.statusCode}]${response.statusMessage}`);
    }
};

const getDateString = (date: Date) =>
    `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;

export default getKiiteAPI;
