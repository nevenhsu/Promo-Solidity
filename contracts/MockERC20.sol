// SPDX-License-Identifier: MIT

pragma solidity ^0.8.27;

import '@openzeppelin/contracts/token/ERC20/ERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol';

// Only for testing purposes
contract MockERC20 is ERC20Permit {
  constructor() ERC20('USD Coin', 'USDC') ERC20Permit('USD Coin') {}

  function mint(address to, uint256 amount) external {
    _mint(to, amount);
  }

  function decimals() public view virtual override returns (uint8) {
    return 6;
  }
}
