import { expect } from 'chai'
import { parseEventLogs, getAddress, parseUnits, getContract } from 'viem'
import { loadFixture, time } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers'
import { permitToken } from '@/lib/eip712'
import { deployFixture } from './shared/fixtures'
import { computeTokenAddress } from '@/lib/computeTokenAddress'

describe('ActivityManager contract', function () {
  it('Should have treasury, foundation and airdropManager', async function () {
    const { activityManager, treasury, admin } = await loadFixture(deployFixture)

    const _treasury = await activityManager.read.treasury()
    const _airdropManager = await activityManager.read.airdropManager()

    expect(_treasury).to.equal(getAddress(treasury.account.address))
    expect(_airdropManager).to.equal(getAddress(admin.account.address))
  })

  it('Should update airdrop manager', async function () {
    const { activityManager, addr1 } = await loadFixture(deployFixture)

    await activityManager.write.setAirdropManager([addr1.account.address])

    const airdropManager = await activityManager.read.airdropManager()
    expect(airdropManager).to.equal(getAddress(addr1.account.address))
  })

  it('Should create an activity', async function () {
    const { publicClient, tokenManager, activityManager, admin } = await loadFixture(deployFixture)

    const tokenAddress = computeTokenAddress({
      contract: tokenManager.address,
      owner: admin.account.address,
    })

    await tokenManager.write.deploy(['Test Token', 'TST'])

    const startTime = BigInt(await time.latest())
    const endTime = startTime + 36000n
    const hash = await activityManager.write.create([admin.account.address, tokenAddress, startTime, endTime])

    // From the event logs
    const receipt = await publicClient.getTransactionReceipt({ hash })
    const events = parseEventLogs({
      abi: activityManager.abi,
      logs: receipt.logs,
      eventName: 'Create',
    })

    expect(events[0].args.owner).to.equal(getAddress(admin.account.address))
    expect(events[0].args.token).to.equal(tokenAddress)
    expect(events[0].args.startTime).to.equal(startTime)
    expect(events[0].args.endTime).to.equal(endTime)
    expect(events[0].args.tokenId).to.equal(1n)

    const tokenURI = await activityManager.read.tokenURI([1n])
    expect(tokenURI).to.equal(`https://promo-web3.vercel.app/api/nft/${activityManager.address}/1`)
  })

  it('Should have totalSupply and balance', async function () {
    const { tokenManager, activityManager, admin } = await loadFixture(deployFixture)

    const tokenAddress = computeTokenAddress({
      contract: tokenManager.address,
      owner: admin.account.address,
    })

    await tokenManager.write.deploy(['Test Token', 'TST'])

    const startTime = BigInt(await time.latest())
    const endTime = startTime + 36000n
    await activityManager.write.create([admin.account.address, tokenAddress, startTime, endTime])
    const totalSupply = await activityManager.read.totalSupply()
    expect(totalSupply).to.equal(1n)

    await activityManager.write.create([admin.account.address, tokenAddress, startTime, endTime])
    const totalSupply2 = await activityManager.read.totalSupply()
    expect(totalSupply2).to.equal(2n)

    const balance = await activityManager.read.balanceOf([admin.account.address])
    expect(balance).to.equal(2n)
  })

  it('Should save the activity info', async function () {
    const { tokenManager, activityManager, admin } = await loadFixture(deployFixture)

    const tokenAddress = computeTokenAddress({
      contract: tokenManager.address,
      owner: admin.account.address,
    })

    await tokenManager.write.deploy(['Test Token', 'TST'])

    const startTime = BigInt(await time.latest())
    const endTime = startTime + 36000n
    await activityManager.write.create([admin.account.address, tokenAddress, startTime, endTime])

    const activity = await activityManager.read.getActivity([1n])
    expect(activity.owner).to.equal(getAddress(admin.account.address))
    expect(activity.token).to.equal(tokenAddress)
    expect(activity.startTime).to.equal(startTime)
    expect(activity.endTime).to.equal(endTime)
    expect(activity.totalAmount).to.equal(0n)
    expect(activity.distributedAmount).to.equal(0n)
    expect(activity.feeAmount).to.equal(0n)
    expect(activity.refundedAmount).to.equal(0n)
  })

  it('Should create an activity and deposit a token after approval', async function () {
    const { publicClient, tokenManager, activityManager, admin, getClubTokenContract } =
      await loadFixture(deployFixture)

    const tokenAddress = computeTokenAddress({
      contract: tokenManager.address,
      owner: admin.account.address,
    })

    await tokenManager.write.deploy(['Test Token', 'TST'])

    const amount = parseUnits('1', 6)
    const startTime = BigInt(await time.latest())
    const endTime = startTime + 36000n
    const token = getClubTokenContract(admin, tokenAddress)

    await token.write.approve([activityManager.address, amount])

    const hash = await activityManager.write.createAndDeposit([
      admin.account.address,
      startTime,
      endTime,
      tokenAddress,
      amount,
    ])

    // From the event logs
    const receipt = await publicClient.getTransactionReceipt({ hash })
    const events = parseEventLogs({
      abi: activityManager.abi,
      logs: receipt.logs,
      eventName: 'Deposit',
    })

    expect(events[0].args.tokenId).to.equal(1n)
    expect(events[0].args.amount).to.equal(amount)
    expect(events[0].args.totalAmount).to.equal(amount)

    // From the contract
    const activity = await activityManager.read.getActivity([1n])
    expect(activity.totalAmount).to.equal(amount)
  })

  it('Should permit a token and create an activity', async function () {
    const { publicClient, tokenManager, admin, activityManager } = await loadFixture(deployFixture)

    const tokenAddress = computeTokenAddress({
      contract: tokenManager.address,
      owner: admin.account.address,
    })

    await tokenManager.write.deploy(['Test Token', 'TST'])

    const amount = parseUnits('1', 6)
    const startTime = BigInt(await time.latest())
    const endTime = startTime + 36000n
    const deadline = startTime + 3600n
    const { v, r, s } = await permitToken(admin, tokenAddress, activityManager.address, amount, deadline)

    const hash = await activityManager.write.createAndDepositWithPermit([
      admin.account.address,
      startTime,
      endTime,
      tokenAddress,
      amount,
      deadline,
      Number(v),
      r,
      s,
    ])

    // From the event logs
    const receipt = await publicClient.getTransactionReceipt({ hash })
    const events = parseEventLogs({
      abi: activityManager.abi,
      logs: receipt.logs,
      eventName: 'Deposit',
    })

    expect(events[0].args.tokenId).to.equal(1n)
    expect(events[0].args.amount).to.equal(amount)
    expect(events[0].args.totalAmount).to.equal(amount)

    // From the contract
    const activity = await activityManager.read.getActivity([1n])
    expect(activity.totalAmount).to.equal(amount)
  })

  it('Should deposit a token to an activity', async function () {
    const { publicClient, tokenManager, activityManager, admin } = await loadFixture(deployFixture)

    const tokenAddress = computeTokenAddress({
      contract: tokenManager.address,
      owner: admin.account.address,
    })

    await tokenManager.write.deploy(['Test Token', 'TST'])

    const startTime = BigInt(await time.latest())
    const endTime = startTime + 36000n

    const amount = parseUnits('1', 6)
    const deadline = startTime + 3600n
    const permit1 = await permitToken(admin, tokenAddress, activityManager.address, amount, deadline)

    await activityManager.write.createAndDepositWithPermit([
      admin.account.address,
      startTime,
      endTime,
      tokenAddress,
      amount,
      deadline,
      Number(permit1.v),
      permit1.r,
      permit1.s,
    ])

    const permit2 = await permitToken(admin, tokenAddress, activityManager.address, amount, deadline)

    const hash = await activityManager.write.depositWithPermit([
      1n,
      tokenAddress,
      admin.account.address,
      amount,
      deadline,
      Number(permit2.v),
      permit2.r,
      permit2.s,
    ])

    // From the event logs
    const receipt = await publicClient.getTransactionReceipt({ hash })
    const events = parseEventLogs({
      abi: activityManager.abi,
      logs: receipt.logs,
      eventName: 'Deposit',
    })

    expect(events[0].args.tokenId).to.equal(1n)
    expect(events[0].args.amount).to.equal(amount)
    expect(events[0].args.totalAmount).to.equal(amount * 2n)

    // From the contract
    const activity = await activityManager.read.getActivity([1n])
    expect(activity.totalAmount).to.equal(amount * 2n)
  })

  it('Should withdraw fund from an expired activity', async function () {
    const { publicClient, tokenManager, admin, addr1, activityManager, getClubTokenContract } =
      await loadFixture(deployFixture)

    const _tokenManager = getContract({
      address: tokenManager.address,
      abi: tokenManager.abi,
      client: addr1,
    })

    const _activityManager = getContract({
      address: activityManager.address,
      abi: activityManager.abi,
      client: addr1,
    })

    const tokenAddress = computeTokenAddress({
      contract: tokenManager.address,
      owner: addr1.account.address,
    })

    await _tokenManager.write.deploy(['Test Token', 'TST'])

    const amount = parseUnits('1', 6)
    const startTime = BigInt(await time.latest())
    const endTime = startTime + 3600n
    const deadline = startTime + 3600n
    const { v, r, s } = await permitToken(addr1, tokenAddress, activityManager.address, amount, deadline)

    await _activityManager.write.createAndDepositWithPermit([
      addr1.account.address,
      startTime,
      endTime,
      tokenAddress,
      amount,
      deadline,
      Number(v),
      r,
      s,
    ])

    await time.increase(3600)

    const halfAmount = amount / 2n
    const hash = await activityManager.write.distribute([1n, halfAmount])

    // Should fail to distribute again
    await expect(activityManager.write.distribute([1n, halfAmount])).to.be.rejectedWith('error occurred')

    // From the event logs
    const receipt = await publicClient.getTransactionReceipt({ hash })
    const events = parseEventLogs({
      abi: activityManager.abi,
      logs: receipt.logs,
      eventName: 'Distribute',
    })

    const feeAmount = (halfAmount * 30n) / 10000n
    const distributedAmount = halfAmount - feeAmount

    expect(events[0].args.tokenId).to.equal(1n)
    expect(events[0].args.feeAmount).to.equal(feeAmount)
    expect(events[0].args.distributedAmount).to.equal(distributedAmount)

    const redundEvents = parseEventLogs({
      abi: activityManager.abi,
      logs: receipt.logs,
      eventName: 'Refund',
    })

    expect(redundEvents[0].args.tokenId).to.equal(1n)
    expect(redundEvents[0].args.refundedAmount).to.equal(halfAmount)

    // From the contract
    const activity = await activityManager.read.getActivity([1n])
    expect(activity.totalAmount).to.equal(amount)
    expect(activity.distributedAmount).to.equal(distributedAmount)
    expect(activity.feeAmount).to.equal(feeAmount)
    expect(activity.refundedAmount).to.equal(halfAmount)

    // From the token contract
    const clubTokenContract = getClubTokenContract(addr1, tokenAddress)
    const balance = await clubTokenContract.read.balanceOf([admin.account.address])
    expect(balance).to.equal(distributedAmount)
  })

  it('Should refund from an 14-day expired activity', async function () {
    const { publicClient, tokenManager, admin, activityManager, getClubTokenContract } =
      await loadFixture(deployFixture)

    const tokenAddress = computeTokenAddress({
      contract: tokenManager.address,
      owner: admin.account.address,
    })

    await tokenManager.write.deploy(['Test Token', 'TST'])

    const amount = parseUnits('1', 6)
    const startTime = BigInt(await time.latest())
    const endTime = startTime + 3600n
    const deadline = startTime + 3600n
    const { v, r, s } = await permitToken(admin, tokenAddress, activityManager.address, amount, deadline)

    await activityManager.write.createAndDepositWithPermit([
      admin.account.address,
      startTime,
      endTime,
      tokenAddress,
      amount,
      deadline,
      Number(v),
      r,
      s,
    ])

    await time.increase(1209600 + 3600)
    const hash = await activityManager.write.refund([1n])

    // Should fail to refund again
    await expect(activityManager.write.refund([1n])).to.be.rejectedWith('error occurred')

    // From the event logs
    const receipt = await publicClient.getTransactionReceipt({ hash })
    const redundEvents = parseEventLogs({
      abi: activityManager.abi,
      logs: receipt.logs,
      eventName: 'Refund',
    })
    expect(redundEvents[0].args.tokenId).to.equal(1n)
    expect(redundEvents[0].args.refundedAmount).to.equal(amount)

    // From the contract
    const activity = await activityManager.read.getActivity([1n])
    expect(activity.totalAmount).to.equal(amount)
    expect(activity.refundedAmount).to.equal(amount)
    expect(activity.distributedAmount).to.equal(0n)
    expect(activity.feeAmount).to.equal(0n)

    // From the token contract
    const clubTokenContract = getClubTokenContract(admin, tokenAddress)
    const balance = await clubTokenContract.read.balanceOf([admin.account.address])
    expect(balance).to.equal(BigInt(10000000000 * 10 ** 6))
  })
})
