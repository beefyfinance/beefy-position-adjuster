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
        // Get updated list of secrets
        const secretsList = yield web3Function.secrets.list();
        console.log(`Secrets list: `);
        console.dir(secretsList);
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
