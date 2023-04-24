import axios from 'axios';
import { FuncAPI } from './apiTypes';
import { timer } from './embedsUtil';
import { API_ENDPOINT } from './envs';

const API_CALL_MAX_PER_SECOND = 4;
const apiCallHist: number[] = new Array(API_CALL_MAX_PER_SECOND).fill(0);
const axiosBase = axios.create({
    baseURL: API_ENDPOINT
});

const fetchCafeAPI: FuncAPI = async (pathname, params = {}) => {
    const nowTime = Date.now();
    const waitTime = Math.max(apiCallHist[0] + 1e3 - nowTime, 0);
    apiCallHist.shift();
    apiCallHist.push(nowTime + waitTime);
    if (waitTime > 0) await timer(waitTime);
    const formated = getDateString(new Date());

    try {
        const response = await axiosBase.get(pathname, { params });
        console.log(`[${formated}] ${pathname}`);
        return response.data;
    } catch (e) {
        if (e instanceof Error) {
            throw new Error(`${e.name}: ${e.message}`);
        }
    }
};

const getDateString = (date: Date) =>
    `${date.getMonth() + 1}/${date.getDate()} ${date.getHours().toString().padStart(2, '0')}:${date.getMinutes().toString().padStart(2, '0')}:${date.getSeconds().toString().padStart(2, '0')}.${date.getMilliseconds().toString().padStart(3, '0')}`;

export default fetchCafeAPI;
