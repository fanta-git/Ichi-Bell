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
const request_1 = __importDefault(require("request"));
function getAPI(url, queryParam = {}) {
    return __awaiter(this, void 0, void 0, function* () {
        console.log('APIを呼び出しました');
        const { response, body } = yield new Promise(resolve => (0, request_1.default)({ url: url, qs: queryParam, json: true }, (error, response, body) => {
            resolve(Object.assign({}, { error: error, response: response, body: body }));
        }));
        if (response.statusCode === 200) {
            return body;
        }
        else {
            console.log('APIの読み込みに失敗しました');
            return null;
        }
    });
}
exports.getAPI = getAPI;
