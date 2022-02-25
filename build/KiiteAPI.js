"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAPI = void 0;
/* eslint-disable camelcase */
const request_1 = __importDefault(require("request"));
const log4js_1 = __importDefault(require("log4js"));
const logger = log4js_1.default.getLogger('KiiteAPI');
const errlog = log4js_1.default.getLogger('error');
log4js_1.default.configure('./log-config.json');
const getAPI = (url, queryParam = {}) => __awaiter(void 0, void 0, void 0, function* () {
    var _a;
    const now = new Date();
    const stc = (_a = exports.getAPI.staticVariable) !== null && _a !== void 0 ? _a : (exports.getAPI.staticVariable = { apiCallHist: new Array(4).fill(0) });
    const waitTime = Math.max(stc.apiCallHist[0] + 1e3 - now.getTime(), 0);
    stc.apiCallHist.shift();
    stc.apiCallHist.push(now.getTime() + waitTime);
    if (waitTime)
        yield new Promise(resolve => setTimeout(resolve, waitTime));
    logger.info('APIを呼び出しました');
    const { error, response, body } = yield new Promise(resolve => (0, request_1.default)({ url: 'https://cafe.kiite.jp' + url, qs: queryParam, json: true }, (error, response, body) => {
        resolve(Object.assign({}, { error: error, response: response, body: body }));
    }));
    if (response.statusCode === 200) {
        return body;
    }
    else {
        errlog.error(response);
        throw new Error(error);
    }
});
exports.getAPI = getAPI;
