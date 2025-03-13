import env from '@/utils/env'
import { arbitrum, arbitrumSepolia, base, baseSepolia } from 'viem/chains'

export function getInfuraUrl(network: string) {
  const { infuraKey } = env.apiKey
  if (!infuraKey) return

  return `https://${network}.infura.io/v3/${infuraKey}`
}

export function getAlchemyUrl(network: string) {
  const { alchemyKey } = env.apiKey
  if (!alchemyKey) return

  return `https://${network}.g.alchemy.com/v2/${alchemyKey}`
}

export function getProviderUrl(chainId: number) {
  switch (chainId) {
    case arbitrum.id:
      return getInfuraUrl('arbitrum-mainnet') || getAlchemyUrl('arb-mainnet')
    case arbitrumSepolia.id:
      return getInfuraUrl('arbitrum-sepolia') || getAlchemyUrl('arb-sepolia')
    case base.id:
      return getInfuraUrl('base-mainnet') || getAlchemyUrl('base-mainnet')
    case baseSepolia.id:
      return getAlchemyUrl('base-sepolia') || getInfuraUrl('base-sepolia')
    default:
      return undefined
  }
}
