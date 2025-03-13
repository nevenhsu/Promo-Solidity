import { viem } from 'hardhat'

export async function getFeeData() {
  const publicClient = await viem.getPublicClient()
  const [block, maxPriorityFee] = await Promise.all([
    publicClient.getBlock({ blockTag: 'latest' }),
    publicClient.estimateMaxPriorityFeePerGas(),
  ])

  let lastBaseFeePerGas: bigint | undefined = undefined
  let maxFeePerGas: bigint | undefined = undefined

  if (block && block.baseFeePerGas) {
    lastBaseFeePerGas = block.baseFeePerGas
    maxFeePerGas = lastBaseFeePerGas * 2n + maxPriorityFee
  } else {
    throw new Error('no block data')
  }

  return { lastBaseFeePerGas, maxFeePerGas, maxPriorityFee }
}
