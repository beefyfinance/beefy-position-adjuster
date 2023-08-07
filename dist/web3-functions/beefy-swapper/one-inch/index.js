"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOneInchApi = void 0;
const p_queue_1 = __importDefault(require("p-queue"));
const RateLimitedOneInchApi_1 = require("./RateLimitedOneInchApi");
const DEFAULT_API_URL = 'https://api.1inch.io';
const API_QUEUE_CONFIG = {
    concurrency: 1,
    intervalCap: 1,
    interval: 3000,
    carryoverConcurrencyCount: true,
    autoStart: true,
    timeout: 10 * 1000,
    throwOnTimeout: true,
};
const API_QUEUE_CONFIG_CUSTOM = Object.assign(Object.assign({}, API_QUEUE_CONFIG), { concurrency: 30, intervalCap: 60, interval: 1000 });
const apiByChainId = {};
let apiQueue;
function getOneInchApi(apiUrl, chainId, rateLimitOptions) {
    if (!apiByChainId[chainId]) {
        if (!apiQueue) {
            apiQueue = new p_queue_1.default(rateLimitOptions !== null && rateLimitOptions !== void 0 ? rateLimitOptions : (apiUrl === DEFAULT_API_URL ? API_QUEUE_CONFIG : API_QUEUE_CONFIG_CUSTOM));
        }
        const baseUrl = `${apiUrl}/v5.0/${chainId}`;
        apiByChainId[chainId] = new RateLimitedOneInchApi_1.RateLimitedOneInchApi(baseUrl, apiQueue);
    }
    return apiByChainId[chainId];
}
exports.getOneInchApi = getOneInchApi;
