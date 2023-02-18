import { ethers } from 'ethers';
import { GelatoOpsSDK, Web3Function } from '@gelatonetwork/ops-sdk';
import { Web3FunctionBuilder } from '@gelatonetwork/web3-functions-sdk/builder';
import { setSecretsFromEnv } from './common/secrets';
import { getConfigFromEnv } from './common/config';
import { swapperAbi } from '../web3-functions/beefy-swapper/abi';

async function main() {
  // Instantiate provider & signer
  const { chainId, providerUrl, privateKey, swapper } = await getConfigFromEnv();
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const opsSdk = new GelatoOpsSDK(chainId, wallet);

  // Deploy Web3Function on IPFS
  console.log('Deploying Web3Function on IPFS...');
  const web3Function = './src/web3-functions/beefy-swapper/index.ts';
  const cid = await Web3FunctionBuilder.deploy(web3Function);
  console.log(`Web3Function IPFS CID: ${cid}`);

  // Create task using ops-sdk
  console.log('Creating automate task...');
  const oracleInterface = new ethers.utils.Interface(swapperAbi);
  const { taskId, tx } = await opsSdk.createTask({
    name: 'BeefyFeeSwapper V1.10',
    execAddress: swapper,
    execSelector: oracleInterface.getSighash('swap'),
    dedicatedMsgSender: true,
    web3FunctionHash: cid,
    web3FunctionArgs: {
      swapper: swapper,
      targetToken: 'USDC',
    },
  });
  await tx.wait();
  console.log(`Task created, taskId: ${taskId} (tx hash: ${tx.hash})`);
  console.log(`> https://beta.app.gelato.network/task/${taskId}?chainId=${chainId}`);

  await setSecretsFromEnv(new Web3Function(chainId, wallet));
}

main()
  .then(() => {
    process.exit();
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
