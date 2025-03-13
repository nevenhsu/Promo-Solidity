// npx hardhat hello

import { task } from 'hardhat/config'

task('hello', "Prints 'Hello, World!'", async (taskArguments, { ethers }, runSuper) => {
  console.log('Hello, World!')
})
