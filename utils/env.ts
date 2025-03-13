import _ from 'lodash'

const env = {
  // Env
  port: Number(process.env.PORT),
  timezone: process.env.TIMEZONE,
  nodeEnv: process.env.NODE_ENV,
  isDev: process.env.NODE_ENV === 'development',
  isProd: process.env.NODE_ENV === 'production',

  // Hardhat
  hardhat: {
    mnemonic: process.env.MNEMONIC,
    derivationPath: getDerivationPath(process.env.WALLET_INDEX),
    accountPrivateKey: process.env.ACCOUNT_PRIVATE_KEY,
    reportGas: toBool(process.env.REPORT_GAS),
  },

  // API keys
  apiKey: {
    infuraKey: process.env.INFURA_KEY,
    alchemyKey: process.env.ALCHEMY_KEY,
    etherscanKey: process.env.ETHERSCAN_KEY,
    etherscanOptiKey: process.env.ETHERSCAN_OPTI_KEY,
    etherscanArbiKey: process.env.ETHERSCAN_ARBI_KEY,
    etherscanBaseKey: process.env.ETHERSCAN_BASE_KEY,
  },

  // Scripts
  deployOptions: toArray(process.env.DEPLOY_OPTIONS),
}

export default env

function removeUrlPrefix(val: string) {
  return _.replace(val, /https|http|wss|:\/\//gi, '')
}

function toArray(val: string) {
  const value = _.split(val, ',').map(el => _.trim(el))
  return _.compact(value)
}

function toBool(value: any) {
  if (_.isNil(value)) {
    return undefined
  }

  if (value === true || Number(value) >= 1 || _.lowerCase(value) === 'true') {
    return true
  }

  return false
}

function getDerivationPath(index: string) {
  const path: `m/44'/60'/${string}` = !_.isNaN(Number(index)) ? `m/44'/60'/0'/0/${index}` : `m/44'/60'/0'/0/0`
  return path
}
