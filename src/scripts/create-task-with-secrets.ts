import { ethers } from 'ethers';
import { GelatoOpsSDK, Web3Function } from '@gelatonetwork/ops-sdk';
import { Web3FunctionBuilder } from '@gelatonetwork/web3-functions-sdk/builder';
import { setSecretsFromEnv } from './common/secrets';
import { getConfigFromEnv } from './common/config';

// Default Setting
const oracleAddress = '0x6a3c82330164822A8a39C7C0224D20DB35DD030a';
const oracleAbi = [
  'function lastUpdated() external view returns(uint256)',
  'function updatePrice(uint256)',
];

async function main() {
  // Instantiate provider & signer
  const { chainId, providerUrl, privateKey } = await getConfigFromEnv();
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const opsSdk = new GelatoOpsSDK(chainId, wallet);

  // Deploy Web3Function on IPFS
  console.log('Deploying Web3Function on IPFS...');
  const web3Function = './src/web3-functions/examples/secrets/index.ts';
  const cid = await Web3FunctionBuilder.deploy(web3Function);
  console.log(`Web3Function IPFS CID: ${cid}`);

  // Create task using ops-sdk
  console.log('Creating automate task...');
  const oracleInterface = new ethers.utils.Interface(oracleAbi);
  const { taskId, tx } = await opsSdk.createTask({
    name: 'Web3Function - Eth Oracle Secret Api',
    execAddress: oracleAddress,
    execSelector: oracleInterface.getSighash('updatePrice'),
    dedicatedMsgSender: true,
    web3FunctionHash: cid,
    web3FunctionArgs: {
      oracle: '0x6a3c82330164822A8a39C7C0224D20DB35DD030a',
      currency: 'ethereum',
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
