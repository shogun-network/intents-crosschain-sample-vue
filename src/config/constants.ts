import type { Token } from '@/types'
import { base } from '@reown/appkit/networks'
import { ChainID } from '@shogun-sdk/intents-sdk'
import { SOLANA_CHAIN_ID } from '@shogun-sdk/money-legos'
export const BASE_USDC: Token = {
  symbol: 'USDC',
  name: 'USD Coin (Base)',
  icon: '/images/usdc.svg',
  chainId: base.id,
  address: '0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913', // Base USDC contract
  decimals: 6,
}
export const NATIVE_TOKENS = [
  {
    symbol: 'ETH',
    name: 'Ethereum',
    icon: 'https://coin-images.coingecko.com/coins/images/279/large/ethereum.png?1696501628',
    address: '0xEeeeeEeeeEeEeeEeEeEeeEEEeeeeEeeeeeeeEEeE',
    decimals: 18,
    chainId: base.id,
  },
  {
    symbol: 'SOL',
    name: 'Solana',
    icon: 'https://coin-images.coingecko.com/coins/images/4128/large/solana.png?1696504756',
    address: 'So11111111111111111111111111111111111111111',
    decimals: 9,
    chainId: SOLANA_CHAIN_ID,
  },

  {
    name: 'SUI',
    symbol: 'SUI',
    address: '0x0000000000000000000000000000000000000000000000000000000000000002::sui::SUI',
    decimals: 9,
    chainId: ChainID.Sui,
    icon: `/images/${ChainID.Sui}.svg`,
  },
]
export const TOAST_MESSAGES = {
  TX_STAGES: {
    APPROVE: {
      START: 'Approval transaction started',
      PENDING: 'Approval transaction pending...',
      SUCCESS: 'Approval transaction successful',
    },
    SWAP: {
      START: 'Swap submitted',
      WAITING_FOR_HASH: 'Transferring assets to the destination chain...',
      PENDING: 'Swap in progress',
      SUCCESS: 'Swap completed',
    },
  },
  SAME_TOKEN_SELECTED: 'You cannot select the same token for both input and output',
} as const

export const BONK_TOKENS = [
  {
    id: 'useless-3',
    symbol: 'useless',
    name: 'Useless Coin',
    image:
      'https://coin-images.coingecko.com/coins/images/55684/large/coingeckoupdate.png?1755203747',
    address: 'Dz9mQ9NzkBcCsuGPFJ3r1bS4wgqKMHBPiVuniW8Mbonk',
    decimals: 9,
  },
  {
    id: 'kori',
    symbol: 'kori',
    name: 'Kori',
    image:
      'https://coin-images.coingecko.com/coins/images/55882/large/Kori_sup_dawg.jpeg?1747556841',
    address: 'HtTYHz1Kf3rrQo6AqDLmss7gq5WrkWAaXn3tupUZbonk',
    decimals: 9,
  },
  {
    id: 'bucky-2',
    symbol: 'bucky',
    name: 'Bucky',
    image:
      'https://coin-images.coingecko.com/coins/images/67805/large/u8ntohuwuyy37klrq7hgepm2rg4l.?1753915363',
    address: '7hZmPPkBDYbFpvzQW54sX3DQHQjEVsVcCFRWsvCdbonk',
    decimals: 9,
  },
]

export const WETH_ABI = [
  {
    constant: true,
    inputs: [],
    name: 'name',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: 'guy', type: 'address' },
      { name: 'wad', type: 'uint256' },
    ],
    name: 'approve',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'totalSupply',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: 'src', type: 'address' },
      { name: 'dst', type: 'address' },
      { name: 'wad', type: 'uint256' },
    ],
    name: 'transferFrom',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [{ name: 'wad', type: 'uint256' }],
    name: 'withdraw',
    outputs: [],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'decimals',
    outputs: [{ name: '', type: 'uint8' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [{ name: '', type: 'address' }],
    name: 'balanceOf',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: true,
    inputs: [],
    name: 'symbol',
    outputs: [{ name: '', type: 'string' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  {
    constant: false,
    inputs: [
      { name: 'dst', type: 'address' },
      { name: 'wad', type: 'uint256' },
    ],
    name: 'transfer',
    outputs: [{ name: '', type: 'bool' }],
    payable: false,
    stateMutability: 'nonpayable',
    type: 'function',
  },
  {
    constant: false,
    inputs: [],
    name: 'deposit',
    outputs: [],
    payable: true,
    stateMutability: 'payable',
    type: 'function',
  },
  {
    constant: true,
    inputs: [
      { name: '', type: 'address' },
      { name: '', type: 'address' },
    ],
    name: 'allowance',
    outputs: [{ name: '', type: 'uint256' }],
    payable: false,
    stateMutability: 'view',
    type: 'function',
  },
  { payable: true, stateMutability: 'payable', type: 'fallback' },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'src', type: 'address' },
      { indexed: true, name: 'guy', type: 'address' },
      { indexed: false, name: 'wad', type: 'uint256' },
    ],
    name: 'Approval',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'src', type: 'address' },
      { indexed: true, name: 'dst', type: 'address' },
      { indexed: false, name: 'wad', type: 'uint256' },
    ],
    name: 'Transfer',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'dst', type: 'address' },
      { indexed: false, name: 'wad', type: 'uint256' },
    ],
    name: 'Deposit',
    type: 'event',
  },
  {
    anonymous: false,
    inputs: [
      { indexed: true, name: 'src', type: 'address' },
      { indexed: false, name: 'wad', type: 'uint256' },
    ],
    name: 'Withdrawal',
    type: 'event',
  },
] as const
