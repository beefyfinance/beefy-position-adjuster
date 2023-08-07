import Token from 'blockchain-addressbook/build/types/token';
import { BigNumber } from 'ethers';
import { Web3FunctionUserArgs } from '@gelatonetwork/web3-functions-sdk/dist/lib/types/Web3FunctionUserArgs';
import { Web3FunctionContext } from '@gelatonetwork/web3-functions-sdk';
export type TokenAmount = {
    token: Token;
    amount: BigNumber;
};
export type UserArgs = {
    swapper: string;
    targetToken: string;
};
export type Secrets = {
    oneInchApiUrl: string;
};
export type Settings = {
    gasPriceLimit: BigNumber;
    threshold: BigNumber;
};
export type ContextWithUserArgs<T extends Web3FunctionUserArgs> = Omit<Web3FunctionContext, 'userArgs'> & {
    userArgs: T;
};
export type ErrorLike = {
    message: string;
    stack?: string;
};
export type Web3FunctionResultSuccess = {
    canExec: true;
    callData: string;
};
