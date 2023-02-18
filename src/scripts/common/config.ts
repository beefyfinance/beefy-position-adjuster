export type Config = {
  chainId: number;
  providerUrl: string;
  privateKey: string;
  swapper: string;
};

export async function getConfigFromEnv(): Promise<Config> {
  if (!process.env.PRIVATE_KEY) throw new Error('Missing env PRIVATE_KEY');
  const privateKey = process.env.PRIVATE_KEY;

  if (!process.env.PROVIDER_URL) throw new Error('Missing env PROVIDER_URL');
  const providerUrl = process.env.PROVIDER_URL;

  if (!process.env.CHAIN_ID) throw new Error('Missing env CHAIN_ID');
  const chainId = Number(process.env.CHAIN_ID);

  if (!process.env.SWAPPER) throw new Error('Missing env SWAPPER');
  const swapper = process.env.SWAPPER;

  return {
    chainId,
    providerUrl,
    privateKey,
    swapper
  };
}
