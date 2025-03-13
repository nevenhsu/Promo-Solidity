// ts
import 'tsconfig-paths/register'
import '@/.env.ts'
// hardhat
import '@nomicfoundation/hardhat-toolbox-viem'
import '@openzeppelin/hardhat-upgrades'
import 'hardhat-gas-reporter'
import '@/tasks' // hardhat tasks
import env from '@/utils/env'
import { getInfuraUrl, getAlchemyUrl } from '@/lib/chain'
import type { HardhatUserConfig } from 'hardhat/config'
import type { NetworkUserConfig } from 'hardhat/types'

const { mnemonic, reportGas } = env.hardhat
const { etherscanKey, etherscanOptiKey, etherscanArbiKey, etherscanBaseKey } = env.apiKey

const networkConfig: NetworkUserConfig = {
  accounts: {
    mnemonic,
  },
}

const config: HardhatUserConfig = {
  defaultNetwork: 'hardhat',
  solidity: '0.8.27',
  networks: {
    hardhat: {
      accounts: {
        mnemonic,
      },
      allowUnlimitedContractSize: false,
    },
    mainnet: {
      url: getInfuraUrl('mainnet') || getAlchemyUrl('eth-mainnet'),
      ...networkConfig,
    },
    optimism: {
      url: getInfuraUrl('optimism-mainnet') || getAlchemyUrl('opt-mainnet'),
      ...networkConfig,
    },
    arbitrum: {
      url: getInfuraUrl('arbitrum-mainnet') || getAlchemyUrl('arb-mainnet'),
      ...networkConfig,
    },
    arbitrumSepolia: {
      url: getInfuraUrl('arbitrum-sepolia') || getAlchemyUrl('arb-sepolia'),
      ...networkConfig,
    },
    base: {
      url: getInfuraUrl('base-mainnet') || getAlchemyUrl('base-mainnet'),
      ...networkConfig,
    },
    baseSepolia: {
      url: getInfuraUrl('base-sepolia') || getAlchemyUrl('base-sepolia'),
      ...networkConfig,
    },
    coverage: {
      url: 'http://127.0.0.1:8555', // Coverage launches its own ganache-cli client
    },
  },
  // npx hardhat verify --list-networks
  // npx hardhat verify --network mainnet DEPLOYED_CONTRACT_ADDRESS "Constructor argument 1"
  etherscan: {
    apiKey: {
      mainnet: etherscanKey,
      arbitrumOne: etherscanArbiKey,
      arbitrumSepolia: etherscanArbiKey,
      base: etherscanBaseKey,
      baseSepolia: etherscanBaseKey,
    },
    customChains: [
      {
        network: 'arbitrumSepolia',
        chainId: 421614,
        urls: {
          apiURL: 'https://api-sepolia.arbiscan.io/api',
          browserURL: 'https://docs.arbiscan.io/v/sepolia-arbiscan',
        },
      },
    ],
  },
  mocha: {
    timeout: 40000,
  },
  gasReporter: {
    enabled: reportGas,
    currency: 'USD',
    gasPrice: 21,
  },
}

export default config
