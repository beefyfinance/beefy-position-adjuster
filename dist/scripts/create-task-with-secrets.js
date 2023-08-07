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
const builder_1 = require("@gelatonetwork/web3-functions-sdk/builder");
const secrets_1 = require("./common/secrets");
const config_1 = require("./common/config");
const abi_1 = require("../web3-functions/beefy-swapper/abi");
function main() {
    return __awaiter(this, void 0, void 0, function* () {
        // Instantiate provider & signer
        const { chainId, providerUrl, privateKey, swapper } = yield (0, config_1.getConfigFromEnv)();
        const provider = new ethers_1.ethers.providers.JsonRpcProvider(providerUrl);
        const wallet = new ethers_1.ethers.Wallet(privateKey, provider);
        const opsSdk = new ops_sdk_1.GelatoOpsSDK(chainId, wallet);
        // Deploy Web3Function on IPFS
        console.log('Deploying Web3Function on IPFS...');
        const web3Function = './src/web3-functions/beefy-swapper/index.ts';
        const cid = yield builder_1.Web3FunctionBuilder.deploy(web3Function);
        console.log(`Web3Function IPFS CID: ${cid}`);
        // Create task using ops-sdk
        console.log('Creating automate task...');
        const oracleInterface = new ethers_1.ethers.utils.Interface(abi_1.swapperAbi);
        const { taskId, tx } = yield opsSdk.createTask({
            name: 'BeefyFeeSwapper V1.10',
            execAddress: swapper,
            execSelector: oracleInterface.getSighash('swap'),
            dedicatedMsgSender: true,
            web3FunctionHash: cid,
            web3FunctionArgs: {
                swapper: swapper,
                targetToken: 'USDC',
            },
        });
        yield tx.wait();
        console.log(`Task created, taskId: ${taskId} (tx hash: ${tx.hash})`);
        console.log(`> https://beta.app.gelato.network/task/${taskId}?chainId=${chainId}`);
        yield (0, secrets_1.setSecretsFromEnv)(new ops_sdk_1.Web3Function(chainId, wallet));
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
