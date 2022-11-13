import fetch, { Response } from 'node-fetch';

import { FuncAPI } from './apiTypes';
import { timer } from './embedsUtil';

const API_CALL_MAX_PER_SECOND = 4;
const FETCH_INIT = {
    timeout: 15e3,
    retry: 3
};

const apiURL = new URL(process.env.API_ENDPOINT ?? 'https://cafe.kiite.jp');
const apiCallHist: number[] = new Array(API_CALL_MAX_PER_SECOND).fill(0);

const fetchCafeAPI: FuncAPI = async (pathname, queryParam = {}) => {
    const nowTime = Date.now();
    const waitTime = Math.max(apiCallHist[0] + 1e3 - nowTime, 0);
    apiCallHist.shift();
    apiCallHist.push(nowTime + waitTime);
    if (waitTime > 0) await timer(waitTime);
    const formated = getDateString(new Date());

    const search = new URLSearchParams(queryParam as any).toString();
    Object.assign(apiURL, { pathname, search });
    try {
        const response = await attemptFetch(apiURL, FETCH_INIT);
        console.log(`[${formated}] ${pathname}`);
        return await response.json() as any;
    } catch (e) {
        if (e instanceof Error) {
            throw new Error(`${e.name}: ${e.message}`);
        }
    }
};

const attemptFetch = (url: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1] & { retry?: number }): Promise<Response> =>
    new Promise<Response>((resolve, reject) =>
        fetch(url, init).then(response =>
            response.ok
                ? resolve(response)
                : init?.retry
                    ? resolve(attemptFetch(url, { ...init, retry: init.retry - 1 }))
                    : reject(Error(`${response.status} ${response.statusText}`))
        )
    );

const getDateString = (date: Date) =>
    `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;

export default fetchCafeAPI;
