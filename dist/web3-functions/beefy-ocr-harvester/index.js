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
const ethers_multicall_1 = require("@kargakis/ethers-multicall");
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
    let harvester = "0xf2EeC1baC39306C0761c816d1D33cF7C9Ad6C0Fe"; //userArgs.harvester as string;
    let config = (yield getConfig(provider, harvester)).data;
    let problemStrats = (yield getProblemStrats(provider, harvester)).data;
    let vaultStratData = yield getStrats(provider, timeNowSecBig, config, problemStrats);
    let configArray = config;
    if (vaultStratData.length == 0) {
        return {
            canExec: false,
            message: "No Harvestable Strats"
        };
    }
    let beefyGasPriceLimit = configArray === null || configArray === void 0 ? void 0 : configArray.gasPriceLimit;
    if (gelatoArgs.gasPrice.gte(beefyGasPriceLimit)) {
        return {
            canExec: false,
            message: `Gas too High: ${gelatoArgs.gasPrice.toString()}`
        };
    }
    if (vaultStratData.length > 3) {
        vaultStratData = vaultStratData.slice(0, 3);
    }
    let codedStrats = yield getAddressArrayEncoded(provider, harvester, vaultStratData);
    logInfo(vaultStratData.toString());
    logInfo(codedStrats.data.toString());
    let iface = new utils_1.Interface([
        "function harvestMultiple(bytes memory _data, uint num) external",
    ]);
    let callData = iface.encodeFunctionData("harvestMultiple", [codedStrats.data.toString(), vaultStratData.length]);
    return { canExec: true, callData: callData };
}));
function getStrats(provider, time, config, problemStrats) {
    return __awaiter(this, void 0, void 0, function* () {
        let beefyVaultsApi = 'https://api.beefy.finance/vaults/ethereum';
        let beefyTvlApi = 'https://api.beefy.finance/tvl';
        let configArray = config;
        let res = yield getApiCall(beefyVaultsApi);
        let tvlRes = yield getApiCall(beefyTvlApi);
        let vaults = Object.keys(res.data).map(key => res.data[key].id);
        let stratArray = Object.keys(res.data).map(key => res.data[key].strategy); //<JSON.Arr>JSON.parse(res.data);
        let tvlArray = Object.keys(tvlRes.data).map(key => tvlRes.data[key]); //<JSON.Obj>JSON.parse(tvlRes.data);
        let ethArray = tvlArray[0]; // <JSON.Obj>tvlArray.getValue("1");
        let pausedArray = yield getPaused(provider, stratArray);
        let lastHarvestArray = yield getLastHarvest(provider, stratArray);
        let lowerWaitForExec = configArray === null || configArray === void 0 ? void 0 : configArray.lowerWaitForExec;
        let upperWaitForExec = configArray === null || configArray === void 0 ? void 0 : configArray.upperWaitForExec;
        let lowerTvlLimit = configArray === null || configArray === void 0 ? void 0 : configArray.lowerTvlLimit;
        let upperTvlLimit = configArray === null || configArray === void 0 ? void 0 : configArray.upperTvlLimit;
        let harvestableStrats = [];
        for (let i = 0; i < stratArray.length; i++) {
            let vaultName = vaults[i].toString();
            let tvl = ethArray[vaultName].toString().split(".");
            let currentTvl = ethers_1.BigNumber.from(tvl[0]);
            if (pausedArray[i] == false) {
                if (currentTvl.gte(lowerTvlLimit)) {
                    if (lastHarvestArray[i].lte(time.sub(lowerWaitForExec))) {
                        if (!problemStrats.includes(stratArray[i].toString())) {
                            harvestableStrats.push(stratArray[i].toString());
                            continue;
                        }
                    }
                    if (currentTvl.gte(upperTvlLimit)) {
                        if (lastHarvestArray[i].lte(time.sub(upperWaitForExec))) {
                            if (!problemStrats.includes(stratArray[i].toString())) {
                                harvestableStrats.push(stratArray[i].toString());
                            }
                        }
                    }
                }
            }
        }
        ;
        return harvestableStrats;
    });
}
function getPaused(provider, strats) {
    return __awaiter(this, void 0, void 0, function* () {
        const multicall = new ethers_multicall_1.Provider(provider, 1);
        let abi = ["function paused() external view returns (bool)"];
        const calls = strats.map(strat => {
            const stratContract = new ethers_multicall_1.Contract(strat, abi);
            return stratContract.paused();
        });
        const results = yield multicall.all(calls);
        return results;
    });
}
function getLastHarvest(provider, strats) {
    return __awaiter(this, void 0, void 0, function* () {
        const multicall = new ethers_multicall_1.Provider(provider, 1);
        let abi = ["function lastHarvest() external view returns (uint256)"];
        const calls = strats.map(strat => {
            const stratContract = new ethers_multicall_1.Contract(strat, abi);
            return stratContract.lastHarvest();
        });
        const results = yield multicall.all(calls);
        return results;
    });
}
function getConfig(provider, harvester) {
    return __awaiter(this, void 0, void 0, function* () {
        let abi = [
            "function config() external view returns (tuple(uint256,uint256,uint256,uint256,uint256))",
            "function problems() external view returns (address[])"
        ];
        let contract = new ethers_1.Contract(harvester, abi, provider);
        let res = yield contract.config();
        //console.log(res);
        if (!res) {
            return {
                errorMessage: "Config Fetch Failed",
                data: null
            };
        }
        return {
            errorMessage: null,
            data: res
        };
    });
}
function getProblemStrats(provider, harvester) {
    return __awaiter(this, void 0, void 0, function* () {
        let abi = [
            "function config() external view returns (tuple(uint256,uint256,uint256,uint256,uint256))",
            "function problems() external view returns (address[])"
        ];
        let contract = new ethers_1.Contract(harvester, abi, provider);
        let data = "";
        let res = yield contract.problems();
        //console.log(res);
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
function getApiCall(url) {
    return __awaiter(this, void 0, void 0, function* () {
        let data = "";
        let res = yield ky_1.default
            .get(url)
            .json();
        if (!res) {
            return {
                errorMessage: "Beefy api call failed",
                data: data,
            };
        }
        return {
            errorMessage: null,
            data: res
        };
    });
}
function getAddressArrayEncoded(provider, harvester, strats) {
    return __awaiter(this, void 0, void 0, function* () {
        let data = "";
        let abi = ["function encodeData(address, address, address, uint) external view returns (bytes memory)"];
        let contract = new ethers_1.Contract(harvester, abi, provider);
        if (strats.length == 1) {
            let res = yield contract.encodeData(strats[0], strats[0], strats[0], strats.length.toString());
            if (!res) {
                return {
                    errorMessage: "array build fail",
                    data: data
                };
            }
            return {
                errorMessage: null,
                data: res
            };
        }
        else if (strats.length == 2) {
            let res = yield contract.encodeData(strats[0], strats[1], strats[0], strats.length.toString());
            if (!res) {
                return {
                    errorMessage: "array build fail",
                    data: data
                };
            }
            return {
                errorMessage: null,
                data: res
            };
        }
        else {
            let res = yield contract.encodeData(strats[0], strats[1], strats[2], strats.length.toString());
            if (!res) {
                return {
                    errorMessage: "array build fail",
                    data: data
                };
            }
            return {
                errorMessage: null,
                data: res
            };
        }
    });
}
function logInfo(msg) {
    console.info(msg);
}
