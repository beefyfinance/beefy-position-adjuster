import { Secrets, Web3Function } from '@gelatonetwork/ops-sdk';
export declare function setSecretsFromEnv(web3Function: Web3Function): Promise<void>;
export declare function getSecretsFromEnv(): Secrets;
