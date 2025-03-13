import { expect } from 'chai'
import { parseEventLogs, getAddress, getContract } from 'viem'
import { loadFixture } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers'
import { deployFixture } from './shared/fixtures'
import { computeTokenAddress } from '@/lib/computeTokenAddress'

describe('TokenManager contract', function () {
  it('Should return the right token address', async function () {
    const { publicClient, tokenManager, addr1 } = await loadFixture(deployFixture)

    const computed = computeTokenAddress({
      contract: tokenManager.address,
      owner: addr1.account.address,
    })

    const _tokenManager = getContract({
      address: tokenManager.address,
      abi: tokenManager.abi,
      client: addr1,
    })

    const hash = await _tokenManager.write.deploy(['Test Token', 'TST'])

    // From the event logs
    const receipt = await publicClient.getTransactionReceipt({ hash })
    const events = parseEventLogs({
      abi: tokenManager.abi,
      logs: receipt.logs,
      eventName: 'Deploy',
    })

    expect(events[0].args.token).to.equal(computed)
  })

  it('Should return the right name, symbol and addresses', async function () {
    const { tokenManager, treasury, admin, getClubTokenContract } = await loadFixture(deployFixture)

    await tokenManager.write.deploy(['Test Token', 'TST'])
    const tokenAddress = computeTokenAddress({
      contract: tokenManager.address,
      owner: admin.account.address,
    })

    const token = getClubTokenContract(admin, tokenAddress)
    const name = await token.read.name()
    const symbol = await token.read.symbol()
    const owner = await token.read.owner()

    expect(name).to.equal('Test Token')
    expect(symbol).to.equal('TST')
    expect(owner).to.equal(getAddress(admin.account.address))
  })

  it('Should return the right balance', async function () {
    const { tokenManager, admin, getClubTokenContract } = await loadFixture(deployFixture)

    await tokenManager.write.deploy(['Test Token', 'TST'])
    const tokenAddress = computeTokenAddress({
      contract: tokenManager.address,
      owner: admin.account.address,
    })

    const token = getClubTokenContract(admin, tokenAddress)
    const ownerBalance = await token.read.balanceOf([admin.account.address])

    expect(ownerBalance).to.equal(BigInt(10000000000 * 10 ** 6))
  })

  it('Should revert if the token already exists', async function () {
    const { tokenManager } = await loadFixture(deployFixture)

    await tokenManager.write.deploy(['Test Token', 'TST'])
    await expect(tokenManager.write.deploy(['Test Token', 'TST'])).to.be.rejectedWith('error')
  })

  // Test the transfer function
  it('Should transfer tokens', async function () {
    const { publicClient, tokenManager, admin, addr1, getClubTokenContract } = await loadFixture(deployFixture)

    await tokenManager.write.deploy(['Test Token', 'TST'])
    const tokenAddress = computeTokenAddress({
      contract: tokenManager.address,
      owner: admin.account.address,
    })

    const token = getClubTokenContract(admin, tokenAddress)

    const hash = await token.write.transfer([addr1.account.address, BigInt(1000 * 10 ** 6)])

    // From the event logs
    const receipt = await publicClient.getTransactionReceipt({ hash })
    const events = parseEventLogs({
      abi: token.abi,
      logs: receipt.logs,
      eventName: 'Transfer',
    })

    expect(events.length).to.equal(1)
    expect(events[0].args.from).to.equal(getAddress(admin.account.address))
    expect(events[0].args.to).to.equal(getAddress(addr1.account.address))
    expect(events[0].args.value).to.equal(BigInt(1000 * 10 ** 6))
    expect(events[0].address.toLowerCase()).to.equal(tokenAddress.toLowerCase())
  })
})
