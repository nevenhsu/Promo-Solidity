// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import { Context } from '@openzeppelin/contracts/utils/Context.sol';
import './interfaces/ITokenDeployer.sol';
import './ClubToken.sol';

contract TokenManager is ITokenDeployer, Context {
  struct Parameters {
    address owner;
    string _name;
    string _symbol;
  }

  /// @inheritdoc ITokenDeployer
  Parameters public override parameters;

  event Deploy(address indexed owner, address token);

  constructor() {}

  // Deploy a new ClubToken contract
  function deploy(string memory _name, string memory _symbol) public returns (address token) {
    address owner = _msgSender();

    parameters = Parameters({ owner: owner, _name: _name, _symbol: _symbol });
    token = address(new ClubToken{ salt: keccak256(abi.encode(owner)) }());

    delete parameters;

    emit Deploy(owner, token);
  }
}
