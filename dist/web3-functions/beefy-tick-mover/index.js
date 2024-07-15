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
web3_functions_sdk_1.Web3Function.onRun((context) => __awaiter(void 0, void 0, void 0, function* () {
    const { userArgs, gelatoArgs, provider } = context;
    let timeNowSec = gelatoArgs.blockTime;
    let timeNowSecBig = ethers_1.BigNumber.from(+timeNowSec.toFixed(0));
    let multicall = "0x49Bc4892353193600e0928431530De8ba703c382"; //userArgs.multicall as string;
    let vaultStratData = yield getStrats(provider, multicall, timeNowSecBig);
    if (vaultStratData.length == 0) {
        return {
            canExec: false,
            message: "No CLMs Need Tick Movement"
        };
    }
    if (vaultStratData.length > 3) {
        vaultStratData = vaultStratData.slice(0, 3);
    }
    let codedStrats = yield getAddressArrayEncoded(provider, multicall, vaultStratData);
    logInfo(vaultStratData.toString());
    logInfo(codedStrats.data.toString());
    let iface = new utils_1.Interface([
        "function moveMultiple(bytes memory _data, uint num) external",
    ]);
    let callData = iface.encodeFunctionData("moveMultiple", [codedStrats.data.toString(), vaultStratData.length]);
    return { canExec: true, callData: callData };
}));
function getStrats(provider, multicall, time) {
    return __awaiter(this, void 0, void 0, function* () {
        let beefyVaultsApi = 'https://api.beefy.finance/cow-vaults/optimism';
        let res = yield getApiCall(beefyVaultsApi);
        /// create an array from a json of objects including only the ones with the key   "type": "cowcentrated"
        let cowcentrated = Object.keys(res.data).map(key => res.data[key]).filter(vault => vault.type == "cowcentrated");
        let stratArray = [];
        cowcentrated.forEach(vault => {
            if (vault.status == "active") {
                stratArray.push(vault.strategy);
            }
        });
        let multicallData = yield getMulticallData(provider, stratArray, multicall);
        let stratsNeedingTickMovement = [];
        for (let i = 0; i < stratArray.length; i++) {
            if (multicallData[i].add(5 * 60 * 60).gte(time)) {
                stratsNeedingTickMovement.push(stratArray[i]);
            }
        }
        ;
        return stratsNeedingTickMovement;
    });
}
function getMulticallData(provider, stratArray, multicall) {
    return __awaiter(this, void 0, void 0, function* () {
        let abi = [
            "function positionNeedsTickAdjustment() external view returns (bool[])",
            "function lastPositionAdjustments() external view returns (uint256[])"
        ];
        let contract = new ethers_1.Contract(multicall, abi, provider);
        // let adjustmentRes: boolean[] = await contract.positionNeedsTickAdjustment(stratArray);
        let lastAdjustmentRes = yield contract.lastPositionAdjustments(stratArray);
        //console.log(res);
        if (!lastAdjustmentRes) {
            return {
                errorMessage: "Multicall Fetch Failed",
                data: null
            };
        }
        return {
            errorMessage: null,
            data: lastAdjustmentRes
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
