// npx hardhat check-balance --network hardhat

import { task } from 'hardhat/config'
import { formatEther } from 'viem'

task('check-balance', 'Prints out the balance of your account', async (taskArguments, { viem }, runSuper) => {
  const [wallet] = await viem.getWalletClients()
  const publicClient = await viem.getPublicClient()
  const balance = await publicClient.getBalance(wallet.account)
  const chainId = await publicClient.getChainId()

  console.log(
    `Account balance for ${wallet.account.address}: ${formatEther(balance)} on ${publicClient.name} (${chainId})`,
  )
})
