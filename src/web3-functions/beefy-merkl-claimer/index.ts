import { BigNumber, Contract, ethers, providers } from "ethers";
import { Interface } from "ethers/lib/utils";
import {
  Web3Function,
  Web3FunctionContext,
} from "@gelatonetwork/web3-functions-sdk";

import ky from "ky";

/*
  const userArgs = {
    harvester: "0xa99Af4E6026D8e7d16eFB2D2Eb0A7190594b1B68",
  }
*/

///CID=QmTLKdod3oF3LMcs1p6PQKQvMvPP68sJ8grw69eCoQdG3y


Web3Function.onRun(async (context: Web3FunctionContext) => {
  const { userArgs, gelatoArgs, provider } = context;

  let claimer: string = userArgs.claimer as string;
  let strategies = await getStrategies();

  if (strategies.errorMessage != null) {
    return {
      canExec: false,
      message: "Api Error"
    }
  }

  let strats = strategies.data;

  let strat = strats[(Math.floor(Math.random() * strats.length))];

  let claimData =  await getMerklClaim(strat);

  if (claimData.errorMessage != null) {
    return {
      canExec: false,
      message: "Api Error"
    }
  }
  
  let isValid = await getValidClaim(provider, strat, claimData.data, claimer);

  if (!isValid.data) {
    return {
      canExec: false,
      message: "Nothing to claim"
    }
  }

  let iface = new Interface([
    "function claim(address _strategy, address[] calldata _tokens, uint256[] calldata _amounts, bytes32[][] calldata _proofs) external returns (uint256)",
  ]);

  let callData = iface.encodeFunctionData("claim", [strat, claimData.data.tokens, claimData.data.amounts, claimData.data.proof]);
  return { canExec: true, callData: callData }
})

async function getValidClaim(provider:providers.StaticJsonRpcProvider, strat: string, claimData: object, claimer: string): Promise<{errorMessage: string | null, data:any}> {
  let abi = [
    "function claim(address _strategy, address[] calldata _tokens, uint256[] calldata _amounts, bytes32[][] calldata _proofs) external returns (uint256)",
  ];

  let contract = new Contract(claimer, abi, provider);
  let data = "";
  let res =  await contract.callStatic.claim(strat, claimData.tokens, claimData.amounts, claimData.proof);

  res = BigNumber.from(res);
  let validClaim: boolean = res.eq(BigNumber.from(0)) ? false : true;

  if (!res) {
    return {
      errorMessage: "Claim Fetch Failed",
      data: data
    }
  }

  return {
    errorMessage: null,
    data: validClaim
  }
}

async function getStrategies(): Promise<{errorMessage: string | null, data:any}>  {
  let data = "";

  let url: string = `https://api.beefy.finance/vaults`

  let res: any = await ky
        .get(url)
        .json();
  
  if (!res) {
    return {
      errorMessage: "Beefy Vaults Api Fail",
      data: data,
    };
  }


  let strategies: string[] = [];

  for (let i = 0; i < res.length; ++i) {
    if (res[i].tokenProviderId == "retro") strategies.push(res[i].strategy);
    
  }

  return {
    errorMessage: null,
    data: strategies
  }
}

async function getMerklClaim(strat: string): Promise<{errorMessage: string | null, data:any}>  {
    let data: string = "";

    let oretro: string = "0x3A29CAb2E124919d14a6F735b6033a3AaD2B260F";
    let tokens: string[] = [
        oretro
    ];
  
    let url: string = `https://api.angle.money/v1/merkl?chainId=137&user=${strat}`

    let res: any = await ky
            .get(url, {timeout: 25000})
            .json();

    if (!res) {
        return {
        errorMessage: "Merkl Api Failed",
        data: data,
        };
    }

    let proof = res.transactionData[oretro];

    let proofData = ({
        amounts: [BigInt(proof.claim)],
        tokens: tokens,
        proof: [proof.proof]
    });
  

  return {
    errorMessage: null,
    data: proofData
  }
}
  