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
const web3_functions_sdk_1 = require("@gelatonetwork/web3-functions-sdk");
const ethers_1 = require("ethers");
const blockchain_addressbook_1 = require("blockchain-addressbook");
const ethers_multicall_1 = require("@kargakis/ethers-multicall");
const abi_1 = require("./abi");
const one_inch_1 = require("./one-inch");
const lodash_1 = require("lodash");
const utils_1 = require("./utils");
const console_1 = require("./console");
const SWAP_MIN_INPUT_AMOUNT = 1000;
const SWAP_LEAVE = 1;
const SWAP_SLIPPAGE = 1;
const MAX_SWAPS_PER_TX = 3;
const BALANCE_BATCH_SiZE = 256;
web3_functions_sdk_1.Web3Function.onRun((context) => __awaiter(void 0, void 0, void 0, function* () {
    const secrets = yield (0, utils_1.getSecrets)(context);
    (0, console_1.installConsoleSanitizer)(secrets);
    try {
        // any console.log() or error thrown from here *should* be automatically sanitized
        const contextWithUserArgs = (0, utils_1.getContextWithUserArgs)(context);
        return yield run(contextWithUserArgs, secrets);
    }
    catch (e) {
        // console.error(e);
        return {
            canExec: false,
            message: (0, utils_1.isErrorLike)(e) ? (0, utils_1.sanitizeError)(e, secrets, false) : (0, utils_1.sanitizeValue)(e, secrets),
        };
    }
}));
function run(context, secrets) {
    return __awaiter(this, void 0, void 0, function* () {
        const { userArgs, gelatoArgs, provider } = context;
        const { oneInchApiUrl } = secrets;
        const { swapper: swapperAddress, targetToken: targetTokenId } = userArgs;
        const { chainId } = gelatoArgs;
        const chainIdKey = chainId.toString();
        if (!(0, utils_1.isValidChainId)(chainIdKey)) {
            throw new Error(`Unsupported chainId: ${chainId}`);
        }
        const swapperInterface = new ethers_1.utils.Interface(abi_1.swapperAbi);
        const settings = yield (0, utils_1.fetchSettings)(swapperAddress, swapperInterface, provider);
        if (!settings) {
            throw new Error('Error fetching settings');
        }
        const { gasPriceLimit, threshold } = settings;
        // <= 0 means no gas limit
        if (gasPriceLimit.gt(0) && gelatoArgs.gasPrice.gt(gasPriceLimit)) {
            throw new Error(`Gas price too high: ${gelatoArgs.gasPrice.toString()} > ${gasPriceLimit.toString()}`);
        }
        const chainTokensById = blockchain_addressbook_1.addressBookByChainId[chainIdKey].tokens;
        const targetToken = chainTokensById[targetTokenId];
        if (!targetToken) {
            throw new Error(`Unsupported target token: ${targetTokenId} for chainId: ${chainIdKey}`);
        }
        const sourceTokens = (0, lodash_1.uniqBy)(Object.values(chainTokensById), t => t.address).filter(t => t.address !== targetToken.address);
        const tokensWithBalance = (yield fetchTokensWithBalance(sourceTokens, provider, chainId, swapperAddress))
            .filter(tokenAmount => tokenAmount.amount.gte(SWAP_MIN_INPUT_AMOUNT)) // Filter out tokens with balance < min input amount
            .map(tokenAmount => {
            // Leave some amount in the contract (for gas savings)
            tokenAmount.amount = tokenAmount.amount.sub(SWAP_LEAVE);
            return tokenAmount;
        });
        if (tokensWithBalance.length === 0) {
            throw new Error(`No tokens with balance >=${SWAP_MIN_INPUT_AMOUNT}wei to swap`);
        }
        console.log(`Quoting ${tokensWithBalance.map(twb => twb.token.symbol).join(', ')}`);
        const swapInputAddresses = [];
        const swapData = [];
        for (const tokenWithBalance of tokensWithBalance) {
            const swap = yield fetchSwap(oneInchApiUrl, chainId, swapperAddress, tokenWithBalance, targetToken, SWAP_SLIPPAGE);
            if (swap) {
                const outputAmount = ethers_1.BigNumber.from(swap.toTokenAmount);
                if (outputAmount.gt(threshold)) {
                    swapInputAddresses.push(tokenWithBalance.token.address);
                    swapData.push(swap.tx.data);
                    if (swapData.length >= MAX_SWAPS_PER_TX) {
                        break;
                    }
                }
            }
        }
        if (swapData.length == 0) {
            throw new Error(`No tokens over swappable threshold ${ethers_1.utils.formatUnits(threshold, targetToken.decimals)} ${targetToken.symbol}`);
        }
        // Return execution call data
        return {
            canExec: true,
            callData: swapperInterface.encodeFunctionData('swap', [swapInputAddresses, swapData]),
        };
    });
}
function fetchSwap(apiUrl, chainId, fromAddress, input, output, slippage = 1) {
    return __awaiter(this, void 0, void 0, function* () {
        try {
            const api = (0, one_inch_1.getOneInchApi)(apiUrl, chainId);
            return api.getSwap({
                amount: input.amount.toString(),
                fromTokenAddress: input.token.address,
                toTokenAddress: output.address,
                fromAddress,
                slippage,
                disableEstimate: true,
            });
        }
        catch (err) {
            console.error(err);
            return null;
        }
    });
}
function fetchTokensWithBalance(tokens, provider, chainId, swapperAddress) {
    return __awaiter(this, void 0, void 0, function* () {
        const multicall = new ethers_multicall_1.Provider(provider, chainId);
        const calls = tokens.map(token => {
            const tokenContract = new ethers_multicall_1.Contract(token.address, abi_1.erc20Abi);
            return tokenContract.balanceOf(swapperAddress);
        });
        const results = (yield Promise.all((0, lodash_1.chunk)(calls, BALANCE_BATCH_SiZE).map(chunk => multicall.all(chunk)))).flat();
        return tokens.map((token, i) => ({
            token,
            amount: ethers_1.BigNumber.from(results[i] || '0'),
        }));
    });
}
