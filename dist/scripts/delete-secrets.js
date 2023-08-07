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
const ethers_1 = require("ethers");
const ops_sdk_1 = require("@gelatonetwork/ops-sdk");
const config_1 = require("./common/config");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // Instantiate provider & signer
        const { chainId, providerUrl, privateKey } = yield (0, config_1.getConfigFromEnv)();
        const provider = new ethers_1.ethers.providers.JsonRpcProvider(providerUrl);
        const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
        const web3Function = new ops_sdk_1.Web3Function(chainId, wallet);
        // Remove each key passed as argument
        if (process.argv.length > 2) {
            const keys = process.argv.slice(2);
            for (const key of keys) {
                yield web3Function.secrets.delete(key.trim());
            }
        }
    });
}
main()
    .then(() => {
    process.exit();
})
    .catch(e => {
    console.error(e);
    process.exit(1);
});
