import fetch from 'node-fetch';

import { FuncAPI } from './apiTypes';

const API_CALL_MAX_PER_SECOND = 4;

const apiCallHist: number[] = new Array(API_CALL_MAX_PER_SECOND).fill(0);

const getKiiteAPI: FuncAPI = async (url, queryParam = {}) => {
    const nowTime = Date.now();
    const waitTime = Math.max(apiCallHist[0] + 1e3 - nowTime, 0);
    apiCallHist.shift();
    apiCallHist.push(nowTime + waitTime);
    if (waitTime > 0) await new Promise(resolve => setTimeout(resolve, waitTime));
    const formated = getDateString(new Date());
    console.log(`[${formated}] ${url}`);

    const query = Array.from(Object.entries(queryParam), ([key, val]) => `${key}=${val}`).join(',');
    const response = await fetch(`https://cafeapi.kiite.jp${url}?${query}`);

    if (response.ok) {
        return await response.json() as any;
    } else {
        const message = `${response.status}: ${response.statusText}`;
        console.error(message);
        throw new Error(message);
    }
};

const getDateString = (date: Date) =>
    `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;

export default getKiiteAPI;
