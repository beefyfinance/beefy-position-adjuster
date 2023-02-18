import { ethers } from 'ethers';
import { Web3Function } from '@gelatonetwork/ops-sdk';
import { getConfigFromEnv } from './common/config';

async function main() {
  // Instantiate provider & signer
  const { chainId, providerUrl, privateKey } = await getConfigFromEnv();
  const provider = new ethers.providers.JsonRpcProvider(providerUrl);
  const wallet = new ethers.Wallet(privateKey, provider);
  const web3Function = new Web3Function(chainId, wallet);

  // Remove each key passed as argument
  if (process.argv.length > 2) {
    const keys = process.argv.slice(2);
    for (const key of keys) {
      await web3Function.secrets.delete(key.trim());
    }
  }
}

main()
  .then(() => {
    process.exit();
  })
  .catch(e => {
    console.error(e);
    process.exit(1);
  });
