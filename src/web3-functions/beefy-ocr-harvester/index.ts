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


  const userArgs = {
    harvester: "0x044eb51f376A6C8D172ce6C279529a60a2185894",
  }


///CID=QmTLKdod3oF3LMcs1p6PQKQvMvPP68sJ8grw69eCoQdG3y


Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, provider } = context;


  let timeNowSec = gelatoArgs.blockTime
  let timeNowSecBig = BigNumber.from(+timeNowSec.toFixed(0));

  let harvester = userArgs.harvester as string;

  let config = (await getConfig(provider, harvester)).data;

  let vaultStratData = await getStrats(provider, timeNowSecBig, config);
  
  let configArray = config;

  if (vaultStratData.length == 0) {
    return {
      canExec: false,
      message: encodeMessage("No Harvestable Strats")
    }
  }

  let beefyGasPriceLimit = configArray[2];
   
  if (gelatoArgs.gasPrice.gte(beefyGasPriceLimit)) {

    return {
      canExec: false, 
      message: encodeMessage(`Gas too High: ${gelatoArgs.gasPrice.toString()}`)
    }
  }

  if (vaultStratData.length > 3) {
    vaultStratData = vaultStratData.slice(0,3);
  }

  let codedStrats = await getAddressArrayEncoded(provider, harvester, vaultStratData);

  logInfo(vaultStratData.toString());

  logInfo(codedStrats.data.toString());

  let iface = new Interface([
    "function harvestMultiple(bytes memory _data, uint num) external",
  ]);

  let callData = iface.encodeFunctionData("harvestMultiple", [codedStrats.data.toString(), vaultStratData.length]);
  return { canExec: true, message: callData }
})

async function getStrats(provider: providers.StaticJsonRpcProvider, time: BigNumber, config: string): Promise<string[]> {
  let beefyVaultsApi = 'https://api.beefy.finance/vaults/ethereum';
  let beefyTvlApi = 'https://api.beefy.finance/tvl';
  let configArray = config;

  let res = await getApiCall(beefyVaultsApi);
  let tvlRes =  await getApiCall(beefyTvlApi);

  let vaults = Object.keys(res.data).map(key=> res.data[key].id);
  let stratArray = Object.keys(res.data).map(key=> res.data[key].strategy);//<JSON.Arr>JSON.parse(res.data);
  let tvlArray = Object.keys(tvlRes.data).map(key=> tvlRes.data[key]);//<JSON.Obj>JSON.parse(tvlRes.data);
  let ethArray =  tvlArray[0];// <JSON.Obj>tvlArray.getValue("1");
  let pausedArray = await getPaused(provider, stratArray);
  let lastHarvestArray = await getLastHarvest(provider, stratArray);

  let lowerWaitForExec = configArray[0];
  let upperWaitForExec = configArray[1];
  let lowerTvlLimit = configArray[3];
  let upperTvlLimit = configArray[4];

  let harvestableStrats: string[] = [];

  for(let i = 0; i < stratArray.length; i++) {
    let vaultName = vaults[i].toString();

    let tvl = ethArray[vaultName].toString().split(".");
    let currentTvl = BigNumber.from(tvl[0]);
    if(pausedArray[i] == false) {
      if (currentTvl.gte(lowerTvlLimit)) {
        if (lastHarvestArray[i].lte(time.sub(lowerWaitForExec))) {
          harvestableStrats.push(stratArray[i].toString());
        }
  
        if (currentTvl.gte(upperTvlLimit)) {
          if (lastHarvestArray[i].lte(time.sub(upperWaitForExec))) {
            harvestableStrats.push(stratArray[i].toString());
          }
        }
      }
    }
  };
 
  return harvestableStrats;

}

async function getPaused(provider: Provider, strats: string[]): Promise<bool[]> {
  const multicall = new MulticallProvider(provider, 1);

  let abi = ["function paused() external view returns (bool)"]
  const calls: ContractCall[] = strats.map(strat => {
    const stratContract = new MulticallContract(strat, abi);
    return stratContract.paused();
  });

  const results = await multicall.all(calls);

  return results;
}

async function getLastHarvest(provider: Provider, strats: string[]): Promise<BigNumber[]> {
  const multicall = new MulticallProvider(provider, 1);

  let abi = ["function lastHarvest() external view returns (uint256)"]
  const calls: ContractCall[] = strats.map(strat => {
    const stratContract = new MulticallContract(strat, abi);
    return stratContract.lastHarvest();
  });

  const results = await multicall.all(calls);

  return results;
}

async function getConfig(provider:providers.StaticJsonRpcProvider , harvester: string): Promise<{errorMessage: string | null, data:string}> {
  let abi = ["function config() external view returns (tuple(uint256,uint256,uint256,uint256,uint256))"
 ]
  let contract = new Contract(harvester , abi,provider);
  let data = "";
  let res = await contract.config();

  //logInfo(res);

  if (!res) {
    return {
      errorMessage: encodeMessage("Paused Fetch Failed"),
      data: data
    }
  }

  return {
    errorMessage: null,
    data: res
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
          errorMessage: encodeMessage("array build fail"),
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
          errorMessage: encodeMessage("array build fail"),
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
          errorMessage: encodeMessage("array build fail"),
          data: data
        }
      }

      return {
        errorMessage: null, 
        data: res
      }
    }
  }

  function encodeMessage(msg: string | null): string {
    if (msg !== null) {

      return ethers.utils.solidityPack( ["string"],[msg])  

    }
    return "";
  }
  
function logInfo(msg: string): void {
  console.info(msg);
}