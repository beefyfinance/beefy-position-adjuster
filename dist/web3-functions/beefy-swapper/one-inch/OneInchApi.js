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
exports.OneInchApi = void 0;
const ky_1 = __importDefault(require("ky"));
class OneInchApi {
    constructor(baseUrl) {
        this.baseUrl = baseUrl;
    }
    buildUrl(path, request) {
        const url = `${this.baseUrl}${path}`;
        const params = request ? new URLSearchParams(request).toString() : '';
        return params ? `${url}?${params}` : url;
    }
    get(path, request) {
        return __awaiter(this, void 0, void 0, function* () {
            const url = this.buildUrl(path, request);
            return yield ky_1.default
                .get(url, {
                timeout: 5000,
                retry: 0,
                headers: { Accept: 'application/json' },
            })
                .json();
        });
    }
    getSwap(request) {
        return __awaiter(this, void 0, void 0, function* () {
            return yield this.get('/swap', request);
        });
    }
}
exports.OneInchApi = OneInchApi;
