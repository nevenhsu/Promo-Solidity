// npx hardhat run scripts/deploy.ts --network hardhat

import hre, { viem } from 'hardhat'
import { formatEther } from 'viem'
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

  const contract = await viem.deployContract(name, [...env.deployOptions])

  await hre.run('verify:verify', {
    address: contract.address,
    constructorArguments: [...env.deployOptions],
  })

  console.log(`Contract: ${contract.address}`)
}

main()
  .then(() => process.exit(0))
  .catch(error => {
    console.error(error)
    process.exit(1)
  })
