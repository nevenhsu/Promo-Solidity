// npx hardhat time --network hardhat --sec 1 --day 1

import { task } from 'hardhat/config'
import { time } from '@nomicfoundation/hardhat-toolbox-viem/network-helpers'
import { formatDate } from '@/utils/helper'

task('time', 'Increase the current time')
  .addParam('sec', 'The amount of seconds to increase the time by')
  .addParam('day', 'The amount of days to increase the time by')
  .setAction(async (taskArguments, { viem }, runSuper) => {
    const { sec = '0', day = '0' } = taskArguments

    const amount = BigInt(day) * BigInt(24 * 60 * 60) + BigInt(sec)
    const before = await time.latest()

    await time.increase(amount)

    const latest = await time.latest()
    const publicClient = await viem.getPublicClient()

    console.log(`${publicClient.name} before: ${formatDate(before)}`)
    console.log(`${publicClient.name} latest:  ${formatDate(latest)}`)
  })
