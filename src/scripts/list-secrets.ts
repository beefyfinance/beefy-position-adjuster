import { ethers } from 'ethers';
import { Web3Function } from '@gelatonetwork/ops-sdk';
import { getConfigFromEnv } from './common/config';

async function main() {
  // Instantiate provider & signer
  const { chainId, providerUrl, privateKey } = await getConfigFromEnv();
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const web3Function = new Web3Function(chainId, wallet);

  // Get updated list of secrets
  const secretsList = await web3Function.secrets.list();
  console.log(`Secrets list: `);
  console.dir(secretsList);
}

main()
  .then(() => {
    process.exit();
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
