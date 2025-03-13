// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import '@openzeppelin/contracts/token/ERC20/extensions/ERC20Permit.sol';
import './interfaces/ITokenDeployer.sol';

contract ClubToken is ERC20Permit {
  address public immutable owner;

  string private _name;
  string private _symbol;

  constructor() ERC20('ClubToken', 'CLUB') ERC20Permit('ClubToken') {
    (owner, _name, _symbol) = ITokenDeployer(msg.sender).parameters();

    _mint(owner, 10000000000 * 10 ** decimals());
  }

  function name() public view virtual override returns (string memory) {
    return _name;
  }

  function symbol() public view virtual override returns (string memory) {
    return _symbol;
  }

  function decimals() public view virtual override returns (uint8) {
    return 6;
  }
}
