// npx hardhat run scripts/estimateDeploy.ts --network hardhat

import hre, { viem } from 'hardhat'
import { encodeDeployData, formatEther, formatGwei } from 'viem'
import numeral from 'numeral'
import { getFeeData } from './helper'
import env from '@/utils/env'

const name = process.env.CONTRACT_NAME
if (!name) {
  throw new Error('Set the CONTRACT_NAME in .env.local')
}

async function main() {
  const publicClient = await viem.getPublicClient()
  const [deployer] = await viem.getWalletClients()

  const balance = await publicClient.getBalance({
    address: deployer.account.address,
  })

  console.log('Deploying contracts with the account:', {
    address: deployer.account.address,
    balance: formatEther(balance),
  })

  const artifact = await hre.artifacts.readArtifact(name)
  const data = encodeDeployData({
    abi: artifact.abi,
    bytecode: artifact.bytecode as any,
    args: env.deployOptions,
  })
  const estimatedGas = await publicClient.estimateGas({ data })

  const { lastBaseFeePerGas, maxFeePerGas, maxPriorityFee } = await getFeeData()
  const baseFee = lastBaseFeePerGas + maxPriorityFee
  const basePrice = estimatedGas * baseFee
  const maxPrice = estimatedGas * maxFeePerGas

  console.log({
    basePrice: formatNumber(basePrice),
    maxPrice: formatNumber(maxPrice),
    priorityFee: formatNumber(maxPriorityFee),
    baseFee: formatNumber(baseFee),
    maxFee: formatNumber(maxFeePerGas),
    estimatedGas: estimatedGas.toString(),
  })
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })

function formatNumber(num: bigint) {
  if (num > 10n ** 12n) {
    return numeral(formatEther(num)).format('0,0.[000000]a') + ' eth'
  }

  return numeral(formatGwei(num)).format('0,0.[000000]a') + ' gwei'
}
