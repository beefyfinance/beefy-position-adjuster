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
exports.getConfigFromEnv = void 0;
function getConfigFromEnv() {
    return __awaiter(this, void 0, void 0, function* () {
        if (!process.env.PRIVATE_KEY)
            throw new Error('Missing env PRIVATE_KEY');
        const privateKey = process.env.PRIVATE_KEY;
        if (!process.env.PROVIDER_URL)
            throw new Error('Missing env PROVIDER_URL');
        const providerUrl = process.env.PROVIDER_URL;
        if (!process.env.CHAIN_ID)
            throw new Error('Missing env CHAIN_ID');
        const chainId = Number(process.env.CHAIN_ID);
        if (!process.env.SWAPPER)
            throw new Error('Missing env SWAPPER');
        const swapper = process.env.SWAPPER;
        return {
            chainId,
            providerUrl,
            privateKey,
            swapper
        };
    });
}
exports.getConfigFromEnv = getConfigFromEnv;
