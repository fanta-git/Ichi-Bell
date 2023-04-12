import axios from 'axios';
import { FuncAPI } from './apiTypes';
import { timer } from './embedsUtil';

const API_CALL_MAX_PER_SECOND = 4;
const apiCallHist: number[] = new Array(API_CALL_MAX_PER_SECOND).fill(0);

const fetchCafeAPI: FuncAPI = async (pathname, queryParam = {}) => {
    const axiosBase = axios.create({
        baseURL: process.env.API_ENDPOINT
    });

    const nowTime = Date.now();
    const waitTime = Math.max(apiCallHist[0] + 1e3 - nowTime, 0);
    apiCallHist.shift();
    apiCallHist.push(nowTime + waitTime);
    if (waitTime > 0) await timer(waitTime);
    const formated = getDateString(new Date());

    try {
        const response = await axiosBase.get(pathname, { params: queryParam });
        console.log(`[${formated}] ${pathname}`);
        return response.data as any;
    } catch (e) {
        if (e instanceof Error) {
            throw new Error(`${e.name}: ${e.message}`);
        }
    }
};

const getDateString = (date: Date) =>
    `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;

export default fetchCafeAPI;
