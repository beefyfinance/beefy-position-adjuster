import { Secrets, Web3Function } from '@gelatonetwork/ops-sdk';

export async function setSecretsFromEnv(web3Function: Web3Function) {
  // Fill up secrets with `SECRETS_*` env
  console.log('Setting secrets...');
  const secrets: Secrets = getSecretsFromEnv();
  await web3Function.secrets.set(secrets);

  // Get updated list of secrets
  const secretsList = await web3Function.secrets.list();
  console.log(`Updated secrets list: `);
  console.dir(secretsList);
}

export function getSecretsFromEnv(): Secrets {
  return Object.fromEntries(
    Object.entries(process.env)
      .filter(([key, value]) => key.startsWith('SECRETS_') && !!value)
      .map(([key, value]) => [key.replace('SECRETS_', ''), value!])
  );
}
