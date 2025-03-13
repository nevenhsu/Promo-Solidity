import { viem } from 'hardhat'
import { getContract } from 'viem'
import clubTokenJson from '@/artifacts/contracts/ClubToken.sol/ClubToken.json'
import type { TokenManager$Type } from '@/artifacts/contracts/TokenManager.sol/TokenManager'
import type { ClubToken$Type } from '@/artifacts/contracts/ClubToken.sol/ClubToken'
import type { NonfungibleActivityManager$Type } from '@/artifacts/contracts/NonfungibleActivityManager.sol/NonfungibleActivityManager'
import type { GetContractReturnType, WalletClient, PublicClient } from '@nomicfoundation/hardhat-viem/types'
import type { Hash } from 'viem'

// Fixtures can return anything you consider useful for your tests
export async function deployFixture(): Promise<{
  publicClient: PublicClient
  tokenManager: GetContractReturnType<TokenManager$Type['abi']>
  activityManager: GetContractReturnType<NonfungibleActivityManager$Type['abi']>
  admin: WalletClient
  treasury: WalletClient
  addr1: WalletClient
  addr2: WalletClient
  getClubTokenContract: (wallet: WalletClient, address: Hash) => GetContractReturnType<ClubToken$Type['abi']>
  getActivityManagerContract: (wallet: WalletClient) => GetContractReturnType<NonfungibleActivityManager$Type['abi']>
}> {
  const publicClient = await viem.getPublicClient()
  const [admin, treasury, addr1, addr2] = await viem.getWalletClients()

  const tokenManager = await viem.deployContract('TokenManager', [])

  const activityManager = await viem.deployContract('NonfungibleActivityManager', [
    treasury.account.address,
    admin.account.address,
    admin.account.address,
    'https://promo-web3.vercel.app/api/nft/',
  ])

  function getActivityManagerContract(
    wallet: WalletClient,
  ): GetContractReturnType<NonfungibleActivityManager$Type['abi']> {
    const contract = getContract({
      address: activityManager.address,
      abi: activityManager.abi,
      client: wallet,
    })
    return contract as any
  }

  return {
    publicClient,
    tokenManager,
    activityManager,
    admin,
    treasury,
    addr1,
    addr2,
    getClubTokenContract,
    getActivityManagerContract,
  }
}

function getClubTokenContract(wallet: WalletClient, address: Hash): GetContractReturnType<ClubToken$Type['abi']> {
  const contract = getContract({
    address,
    abi: clubTokenJson.abi,
    client: wallet,
  })
  return contract as any
}
