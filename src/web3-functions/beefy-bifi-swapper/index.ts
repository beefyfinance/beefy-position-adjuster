import { BigNumber, Contract, ethers, providers } from "ethers";
import { Interface } from "ethers/lib/utils";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

import ky from "ky";

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, provider, secrets } = context;

  let timeNowSec: number = gelatoArgs.blockTime
  let timeNowSecBig = BigNumber.from(+timeNowSec.toFixed(0));
  let from: string = userArgs.from as string;
  let to: string = userArgs.to as string;
  let swapper: string = userArgs.swapper as string;
  let lastSwap = await getLastSwap(provider, swapper);
  let swapSize = userArgs.swapSize as number;
  let chainId = gelatoArgs.chainId;
  let apiKey = await secrets.get("apiKey") as string;

  let swapPeriod = userArgs.swapPeriod as number;
  if (timeNowSecBig.lt(BigNumber.from(lastSwap.data).add(swapPeriod))) {
    return {
      canExec: false,
      message: "Not time to swap yet"
    }
  }

  let fromBalance = await getFromBalance(provider, from, swapper);
  let fromBal = BigNumber.from(fromBalance.data);

  let swapAmount: BigNumber = BigNumber.from(0);

  if (fromBal.eq(0)) {
    return {
      canExec: false,
      message: "Zero Balance"
    }
  }

  if (fromBal.gt(0)) {
    if (fromBal.gt(swapSize)) {
      swapAmount = BigNumber.from(swapSize);
    } else swapAmount = fromBal;
  }


  let swapData = await getApiCall(from, to, swapAmount.toNumber(), swapper, chainId, apiKey);

  if (swapData.errorMessage != null) {
    return {
      canExec: false,
      message: "Api Error"
    }
  }

  let iface = new Interface([
    "function swap(address, bytes memory) external",
  ]);

  let callData = iface.encodeFunctionData("swap", [from, swapData.data]);
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

async function getFromBalance(provider:providers.StaticJsonRpcProvider, from: string,  swapper: string): Promise<{errorMessage: string | null, data:string}> {
  let abi = [
    "function balanceOf(address) external view returns (uint256)",
  ];

  let contract = new Contract(from, abi, provider);
  let data = "";
  let res =  await contract.balanceOf(swapper);


  console.log(res.toNumber().toString());

  if (!res) {
    return {
      errorMessage: "From Balance Fetch Failed",
      data: data
    }
  }

  return {
    errorMessage: null,
    data: res
  }
}

async function getApiCall(from: string, to: string, amount: number, swapper: string, chainId: number, apiKey: string): Promise<{errorMessage: string | null, data:any}>  {
  let data = "";

  let url: string = `https://api.1inch.dev/swap/v5.2/${chainId}/swap?fromTokenAddress=${from}&toTokenAddress=${to}&amount=${amount}&fromAddress=${swapper}&slippage=1&disableEstimate=true`

  let res: any = await ky
        .get(url, {
          method: 'POST',
	        headers: { Authorization: apiKey, accept: "application/json" }
        })
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
  