declare global {
  namespace NodeJS {
    interface ProcessEnv {
      // Env
      NODE_ENV: 'production' | 'development' | 'test'
      TIMEZONE: string
      PORT: string

      // Hardhat
      MNEMONIC: string
      WALLET_INDEX: string
      ACCOUNT_PRIVATE_KEY: string
      REPORT_GAS: string

      // API keys
      INFURA_KEY: string
      ALCHEMY_KEY: string
      ETHERSCAN_KEY: string
      ETHERSCAN_OPTI_KEY: string
      ETHERSCAN_ARBI_KEY: string
      ETHERSCAN_BASE_KEY: string

      // Scripts
      CONTRACT_NAME: string
      DEPLOY_OPTIONS: string

      // Contracts //

      // Epoch
      EPOCH_CURR_EPOCH_START: string

      // PaymentEscrow
      PAYMENT_ESCROW_FEE: string

      // ShareToken
      SHARE_TOKEN_NAME: string
      SHARE_TOKEN_SYMBOL: string
      SHARE_TOKEN_INITIAL_SUPPLY: string

      // VestingNFTManager
      VESTING_NFT_MANAGER_NAME: string
      VESTING_NFT_MANAGER_SYMBOL: string
      VESTING_NFT_MANAGER_VESTING_PERIOD: string

      // PointPool
      POINT_POOL_RELEASE_RATE: string
    }
  }
}

export {}
