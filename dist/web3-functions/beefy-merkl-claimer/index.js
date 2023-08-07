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
    let claimer = "0x5232Afb1d3cf314bF4D93C83C7AfB98b696ABAa4";
    let strategies = yield getStrategies();
    console.log(strategies);
    if (strategies.errorMessage != null) {
        return {
            canExec: false,
            message: "Api Error"
        };
    }
    let strats = strategies.data;
    let claimData = yield getMerklClaim(strats);
    if (claimData.errorMessage != null) {
        return {
            canExec: false,
            message: "Api Error"
        };
    }
    let stratToClaim = "";
    let claimDataForClaim = {};
    for (let i = 0; strats.length; ++i) {
        let isValid = yield getValidClaim(provider, strats[i], claimData.data[i], claimer);
        if (isValid) {
            stratToClaim = strats[i];
            claimDataForClaim = claimData.data[i];
        }
    }
    if (stratToClaim == "") {
        return {
            canExec: false,
            message: "Nothing to claim"
        };
    }
    let iface = new utils_1.Interface([
        "function claim(address _strategy, address[] calldata _tokens, uint256[] calldata _amounts, bytes32[][] calldata _proofs) external returns (uint256)",
    ]);
    let callData = iface.encodeFunctionData("claim", [stratToClaim, claimDataForClaim.tokens, claimDataForClaim.amounts, claimDataForClaim.proof]);
    return { canExec: true, callData: callData };
}));
function getValidClaim(provider, strat, claimData, claimer) {
    return __awaiter(this, void 0, void 0, function* () {
        let abi = [
            "function claim(address _strategy, address[] calldata _tokens, uint256[] calldata _amounts, bytes32[][] calldata _proofs) external returns (uint256)",
        ];
        let contract = new ethers_1.Contract(claimer, abi, provider);
        let data = "";
        let res = yield contract.callStatic.claim();
        let validClaim = res.toNumber() === 0 ? false : true;
        console.log(res.toNumber().toString());
        if (!res) {
            return {
                errorMessage: "Claim Fetch Failed",
                data: data
            };
        }
        return {
            errorMessage: null,
            data: validClaim
        };
    });
}
function getStrategies() {
    return __awaiter(this, void 0, void 0, function* () {
        let data = "";
        let url = `https://api.beefy.finance/vaults`;
        let res = yield ky_1.default
            .get(url)
            .json();
        if (!res) {
            return {
                errorMessage: "Beefy Vaults Api Fail",
                data: data,
            };
        }
        console.log(res);
        let strategies = [];
        res.forEach(v => {
            if (v.platformId === "retro")
                strategies.push(v.strategy);
        });
        console.log(res);
        return {
            errorMessage: null,
            data: strategies
        };
    });
}
function getMerklClaim(strats) {
    return __awaiter(this, void 0, void 0, function* () {
        let data = "";
        let oretro = "0x3A29CAb2E124919d14a6F735b6033a3AaD2B260F";
        let tokens = [
            oretro
        ];
        let proofData = [];
        for (let i = 0; i < strats.length; ++i) {
            let url = `https://api.angle.money/v1/merkl?chainId=137&user=${strats[i]}`;
            let res = yield ky_1.default
                .get(url)
                .json();
            if (!res) {
                return {
                    errorMessage: "Beefy Vaults Api Fail",
                    data: data,
                };
            }
            let proof = res.transactionData[oretro];
            proofData.push({
                amounts: [proof.claim],
                tokens: tokens,
                proof: [proof.proof]
            });
        }
        return {
            errorMessage: null,
            data: proofData
        };
    });
}
