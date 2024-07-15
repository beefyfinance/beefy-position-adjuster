import { BigNumber, Contract, providers } from "ethers";
import { Interface } from "ethers/lib/utils";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

import ky from "ky";

Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, provider } = context;


  let timeNowSec: number = gelatoArgs.blockTime
  let timeNowSecBig = BigNumber.from(+timeNowSec.toFixed(0));

  let multicall: string = userArgs.multicall as string;

  let vaultStratData = await getStrats(provider, multicall, timeNowSecBig, userArgs.chain as string, userArgs.cadence as number);

  if (vaultStratData.length == 0) {
    return {
      canExec: false,
      message: "No CLMs Need Tick Movement"
    }
  }

  if (vaultStratData.length > 3) {
    vaultStratData = vaultStratData.slice(0,3);
  }

  let codedStrats = await getAddressArrayEncoded(provider, multicall, vaultStratData);

  logInfo(vaultStratData.toString());

  // logInfo(codedStrats.data.toString());

  let iface = new Interface([
    "function moveTicks(bytes memory _data, uint num) external",
  ]);

  let callData = iface.encodeFunctionData("moveTicks", [codedStrats.data.toString(), vaultStratData.length]);
  return { canExec: true, callData: callData }
})

async function getStrats(provider: providers.StaticJsonRpcProvider, multicall: string, time: BigNumber, chain: string, cadence: number): Promise<string[]> {
  let beefyVaultsApi = `https://api.beefy.finance/cow-vaults/${chain}`;

  let res = await getApiCall(beefyVaultsApi);

  /// create an array from a json of objects including only the ones with the key   "type": "cowcentrated"
  let cowcentrated = Object.keys(res.data).map(key => res.data[key]).filter(vault => vault.type == "cowcentrated");
  let stratArray: string[] = []; 
  
  cowcentrated.forEach(vault => {
    if (vault.status == "active") {
      stratArray.push(vault.strategy);
    }
  });

  let multicallData = await getMulticallData(provider, stratArray, multicall);
  let stratsNeedingTickMovement: string[] = [];

  if (!multicallData.data) {
    return stratsNeedingTickMovement;
  }

  let timeData = multicallData.data[0];
  let calmData = multicallData.data[1];

  for(let i = 0; i < stratArray.length; i++) {  
    let timeDataPlusWait = timeData[i].add(cadence);
    if (time.gte(timeDataPlusWait)) {
      if (calmData[i]) stratsNeedingTickMovement.push(stratArray[i]);
    }
  };

  return stratsNeedingTickMovement;
}


async function getMulticallData(provider:providers.StaticJsonRpcProvider, stratArray: string[], multicall: string): Promise<{errorMessage: string | null, data: any | null }> {
  let abi = [
    "function positionNeedsTickAdjustment(address[]) external view returns (bool[])",
    "function lastPositionAdjustments(address[] memory _strategies) external view returns (uint256[] memory)",
    "function isCalm(address[] memory _strategies) external view returns (bool[])"
  ];

  let contract = new Contract(multicall, abi,provider);
 // let adjustmentRes: boolean[] = await contract.positionNeedsTickAdjustment(stratArray);
  let lastAdjustmentRes: BigNumber[] = await contract.lastPositionAdjustments(stratArray);
  let isCalmRes: boolean[] = await contract.isCalm(stratArray);

  if (!lastAdjustmentRes) {
    return {
      errorMessage: "Multicall Fetch Failed",
      data: null
    }
  }

  return {
    errorMessage: null,
    data: [lastAdjustmentRes, isCalmRes]
  }
}

async function getApiCall(url: string): Promise<{errorMessage: string | null, data:any}>  {
  let data = "";

  let res: any = await ky
        .get(
        url
        )
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
  }
}

async function getAddressArrayEncoded(provider:providers.StaticJsonRpcProvider , harvester: string, strats: string[]): Promise<{errorMessage: string | null, data:string}> {
  let data = "";
  let abi = ["function encodeData(address, address, address, uint) external view returns (bytes memory)"]
 let contract = new Contract(harvester , abi,provider);
  if (strats.length == 1) {

      let res =  await contract.encodeData(strats[0], strats[0], strats[0], strats.length.toString())  
      if (!res) {
        return {
          errorMessage: "array build fail",
          data: data
        }
      }

      return {
        errorMessage: null, 
        data: res
      }
    } else if (strats.length == 2) {
      let res =  await contract.encodeData(strats[0], strats[1], strats[0], strats.length.toString())  
   
      if (!res) {
        return {
          errorMessage: "array build fail",
          data: data
        }
      }

      return {
        errorMessage: null, 
        data: res
      }
    } else {
      let res =  await contract.encodeData(strats[0], strats[1], strats[2], strats.length.toString())  
   


      if (!res) {
        return {
          errorMessage: "array build fail",
          data: data
        }
      }

      return {
        errorMessage: null, 
        data: res
      }
    }
  }
  
function logInfo(msg: string): void {
  console.info(msg);
}