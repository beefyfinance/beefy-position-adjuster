export type Config = {
    chainId: number;
    providerUrl: string;
    privateKey: string;
    swapper: string;
};
export declare function getConfigFromEnv(): Promise<Config>;
