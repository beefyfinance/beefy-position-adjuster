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
Object.defineProperty(exports, "__esModule", { value: true });
exports.RateLimitedOneInchApi = void 0;
const OneInchApi_1 = require("./OneInchApi");
class RateLimitedOneInchApi extends OneInchApi_1.OneInchApi {
    constructor(baseUrl, queue) {
        super(baseUrl);
        this.queue = queue;
    }
    get(path, request) {
        const _super = Object.create(null, {
            get: { get: () => super.get }
        });
        return __awaiter(this, void 0, void 0, function* () {
            return (yield this.queue.add(() => _super.get.call(this, path, request)));
        });
    }
}
exports.RateLimitedOneInchApi = RateLimitedOneInchApi;
