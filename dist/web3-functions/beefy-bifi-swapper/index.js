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
const ethers_1 = require("ethers");
const utils_1 = require("ethers/lib/utils");
const web3_functions_sdk_1 = require("@gelatonetwork/web3-functions-sdk");
const ky_1 = __importDefault(require("ky"));
/*
  const userArgs = {
    harvester: "0xa99Af4E6026D8e7d16eFB2D2Eb0A7190594b1B68",
  }
*/
///CID=QmTLKdod3oF3LMcs1p6PQKQvMvPP68sJ8grw69eCoQdG3y
web3_functions_sdk_1.Web3Function.onRun((context) => __awaiter(void 0, void 0, void 0, function* () {
    const { userArgs, gelatoArgs, provider } = context;
    let timeNowSec = gelatoArgs.blockTime;
    let timeNowSecBig = ethers_1.BigNumber.from(+timeNowSec.toFixed(0));
    let usdc = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607";
    let bifi = "0x4E720DD3Ac5CFe1e1fbDE4935f386Bb1C66F4642";
    let swapper = userArgs.swapper;
    let lastSwap = yield getLastSwap(provider, swapper);
    if (timeNowSecBig.lt(ethers_1.BigNumber.from(lastSwap.data).add(3600))) {
        return {
            canExec: false,
            message: "Not time to swap yet"
        };
    }
    let usdcBalance = yield getUsdcBalance(provider, usdc, swapper);
    let usdcBal = ethers_1.BigNumber.from(usdcBalance.data);
    let swapAmount = ethers_1.BigNumber.from(0);
    if (usdcBal.eq(0)) {
        return {
            canExec: false,
            message: "Zero Balance"
        };
    }
    if (usdcBal.gt(0)) {
        if (usdcBal.gt(5000000000)) {
            swapAmount = ethers_1.BigNumber.from(5000000000);
        }
        else
            swapAmount = usdcBal;
    }
    let swapData = yield getApiCall(usdc, bifi, swapAmount.toNumber(), swapper);
    if (swapData.errorMessage != null) {
        return {
            canExec: false,
            message: "Api Error"
        };
    }
    let iface = new utils_1.Interface([
        "function swap(address, bytes memory) external",
    ]);
    let callData = iface.encodeFunctionData("swap", [usdc, swapData.data]);
    return { canExec: true, callData: callData };
}));
function getLastSwap(provider, swapper) {
    return __awaiter(this, void 0, void 0, function* () {
        let abi = [
            "function lastSwap() external view returns (uint256)",
        ];
        let contract = new ethers_1.Contract(swapper, abi, provider);
        let data = "";
        let res = yield contract.lastSwap();
        console.log(res.toNumber().toString());
        if (!res) {
            return {
                errorMessage: "Problem Strats Fetch Failed",
                data: data
            };
        }
        return {
            errorMessage: null,
            data: res
        };
    });
}
function getUsdcBalance(provider, usdc, swapper) {
    return __awaiter(this, void 0, void 0, function* () {
        let abi = [
            "function balanceOf(address) external view returns (uint256)",
        ];
        let contract = new ethers_1.Contract(usdc, abi, provider);
        let data = "";
        let res = yield contract.balanceOf(swapper);
        console.log(res.toNumber().toString());
        if (!res) {
            return {
                errorMessage: "Problem Strats Fetch Failed",
                data: data
            };
        }
        return {
            errorMessage: null,
            data: res
        };
    });
}
function getApiCall(usdc, bifi, amount, swapper) {
    return __awaiter(this, void 0, void 0, function* () {
        let data = "";
        let url = `https://api.1inch.io/v5.0/10/swap?fromTokenAddress=${usdc}&toTokenAddress=${bifi}&amount=${amount}&fromAddress=${swapper}&slippage=1&disableEstimate=true`;
        let res = yield ky_1.default
            .get(url)
            .json();
        if (!res) {
            return {
                errorMessage: "One Inch Api Fail",
                data: data,
            };
        }
        console.log(res.tx.data);
        return {
            errorMessage: null,
            data: res.tx.data
        };
    });
}
