import { createWalletClient } from 'viem'
import { mnemonicToAccount } from 'viem/accounts'
import env from '@/utils/env'
import colors from '@/utils/colors'
import type { Chain, HttpTransport } from 'viem'

let logged = false

export function getWallet() {
  // Create an account from the mnemonic
  const mnemonic = env.hardhat.mnemonic
  const wallet = mnemonicToAccount(mnemonic, { path: env.hardhat.derivationPath })

  if (!logged) {
    console.log(colors.fg.green, 'Wallet address:', wallet.address, colors.reset)
    logged = true
  }

  return wallet
}

export function getWalletClient(chain: Chain, transport: HttpTransport) {
  const account = getWallet()

  const client = createWalletClient({
    account,
    chain,
    transport,
  })

  return client
}
