import fetch, { Response } from 'node-fetch';

import { FuncAPI } from './apiTypes';
import { timer } from './embedsUtil';

const API_CALL_MAX_PER_SECOND = 4;
const API_TIMEOUT = 15e3;
const API_RETRY = 3;
const API_ENDPOINT = process.env.API_ENDPOINT ?? 'https://cafe.kiite.jp';

const apiCallHist: number[] = new Array(API_CALL_MAX_PER_SECOND).fill(0);

const getKiiteAPI: FuncAPI = async (url, queryParam = {}) => {
    const nowTime = Date.now();
    const waitTime = Math.max(apiCallHist[0] + 1e3 - nowTime, 0);
    apiCallHist.shift();
    apiCallHist.push(nowTime + waitTime);
    if (waitTime > 0) await timer(waitTime);
    const formated = getDateString(new Date());

    const query = Array.from(Object.entries(queryParam), ([key, val]) => `${key}=${val}`).join(',');
    try {
        const response = await attemptFetch(
            API_ENDPOINT + url + '?' + query,
            { timeout: API_TIMEOUT, retry: API_RETRY }
        );
        console.log(`[${formated}] ${url}`);
        return await response.json() as any;
    } catch (e) {
        if (e instanceof Error) {
            throw new Error(`${e.name}: ${e.message}`);
        }
    }
};

type AttemptFetch = (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1] & { retry?: number }) => Promise<Response>;
const attemptFetch: AttemptFetch = (url, init) =>
    new Promise<Response>((resolve, reject) =>
        fetch(url, init).then(response => {
            if (response.ok) {
                resolve(response);
            } else {
                if (init?.retry && init.retry > 0) {
                    Object.assign(init, { retry: init.retry - 1 });
                    resolve(attemptFetch(url, init));
                } else {
                    reject(Error(`${response.status} ${response.statusText}`));
                }
            }
        })
    );

const getDateString = (date: Date) =>
    `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;

export default getKiiteAPI;
