import { ethers } from 'ethers';
import { Web3Function } from '@gelatonetwork/ops-sdk';
import { setSecretsFromEnv } from './common/secrets';
import { getConfigFromEnv } from './common/config';

async function main() {
  // Instantiate provider & signer
  const { chainId, providerUrl, privateKey } = await getConfigFromEnv();
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey as string, provider);
  const web3Function = new Web3Function(chainId, wallet);
  await setSecretsFromEnv(web3Function);
}

main()
  .then(() => {
    process.exit();
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
