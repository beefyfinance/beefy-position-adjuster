"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.erc20Abi = exports.swapperAbi = void 0;
exports.swapperAbi = [
    {
        inputs: [],
        name: 'settings',
        outputs: [
            {
                internalType: 'uint256',
                name: 'gasPriceLimit',
                type: 'uint256',
            },
            {
                internalType: 'uint256',
                name: 'threshold',
                type: 'uint256',
            },
        ],
        stateMutability: 'view',
        type: 'function',
    },
    {
        inputs: [
            {
                internalType: 'address[]',
                name: '_tokens',
                type: 'address[]',
            },
            {
                internalType: 'bytes[]',
                name: '_data',
                type: 'bytes[]',
            },
        ],
        name: 'swap',
        outputs: [],
        stateMutability: 'nonpayable',
        type: 'function',
    },
];
exports.erc20Abi = [
    {
        constant: true,
        inputs: [
            {
                name: '_owner',
                type: 'address',
            },
        ],
        name: 'balanceOf',
        outputs: [
            {
                name: 'balance',
                type: 'uint256',
            },
        ],
        payable: false,
        stateMutability: 'view',
        type: 'function',
    },
];
