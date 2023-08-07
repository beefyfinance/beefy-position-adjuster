import { BigNumber, Contract, ethers, providers } from "ethers";
import { Interface } from "ethers/lib/utils";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

import {
  Contract as MulticallContract,
  ContractCall,
  Provider as MulticallProvider,
} from '@kargakis/ethers-multicall';

import ky from "ky";

/*
  const userArgs = {
    harvester: "0xa99Af4E6026D8e7d16eFB2D2Eb0A7190594b1B68",
  }
*/

///CID=QmTLKdod3oF3LMcs1p6PQKQvMvPP68sJ8grw69eCoQdG3y


Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, provider } = context;

  let timeNowSec: number = gelatoArgs.blockTime
  let timeNowSecBig = BigNumber.from(+timeNowSec.toFixed(0));
  let usdc: string = "0x7F5c764cBc14f9669B88837ca1490cCa17c31607";
  let bifi: string = "0x4E720DD3Ac5CFe1e1fbDE4935f386Bb1C66F4642";
  let swapper: string = userArgs.swapper as string;
  let lastSwap = await getLastSwap(provider, swapper);

  if (timeNowSecBig.lt(BigNumber.from(lastSwap.data).add(3600))) {
    return {
      canExec: false,
      message: "Not time to swap yet"
    }
  }

  let usdcBalance = await getUsdcBalance(provider, usdc, swapper);
  let usdcBal = BigNumber.from(usdcBalance.data);

  let swapAmount: BigNumber = BigNumber.from(0);

  if (usdcBal.eq(0)) {
    return {
      canExec: false,
      message: "Zero Balance"
    }
  }

  if (usdcBal.gt(0)) {
    if (usdcBal.gt(5000000000)) {
      swapAmount = BigNumber.from(5000000000);
    } else swapAmount = usdcBal;
  }


  let swapData = await getApiCall(usdc, bifi, swapAmount.toNumber(), swapper);

  if (swapData.errorMessage != null) {
    return {
      canExec: false,
      message: "Api Error"
    }
  }

  let iface = new Interface([
    "function swap(address, bytes memory) external",
  ]);

  let callData = iface.encodeFunctionData("swap", [usdc, swapData.data]);
  return { canExec: true, callData: callData }
})

async function getLastSwap(provider:providers.StaticJsonRpcProvider , swapper: string): Promise<{errorMessage: string | null, data:string}> {
  let abi = [
    "function lastSwap() external view returns (uint256)",
  ];

  let contract = new Contract(swapper, abi, provider);
  let data = "";
  let res =  await contract.lastSwap();


  console.log(res.toNumber().toString());

  if (!res) {
    return {
      errorMessage: "Problem Strats Fetch Failed",
      data: data
    }
  }

  return {
    errorMessage: null,
    data: res
  }
}

async function getUsdcBalance(provider:providers.StaticJsonRpcProvider, usdc: string,  swapper: string): Promise<{errorMessage: string | null, data:string}> {
  let abi = [
    "function balanceOf(address) external view returns (uint256)",
  ];

  let contract = new Contract(usdc, abi, provider);
  let data = "";
  let res =  await contract.balanceOf(swapper);


  console.log(res.toNumber().toString());

  if (!res) {
    return {
      errorMessage: "Problem Strats Fetch Failed",
      data: data
    }
  }

  return {
    errorMessage: null,
    data: res
  }
}

async function getApiCall(usdc: string, bifi: string, amount: number, swapper: string): Promise<{errorMessage: string | null, data:any}>  {
  let data = "";

  let url: string = `https://api.1inch.io/v5.0/10/swap?fromTokenAddress=${usdc}&toTokenAddress=${bifi}&amount=${amount}&fromAddress=${swapper}&slippage=1&disableEstimate=true`

  let res: any = await ky
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
  }
}
  