// SPDX-License-Identifier: MIT
pragma solidity ^0.8.27;

/// @title An interface for a contract that is capable of deploying ClubTokens
/// @notice A contract that constructs a token must implement this to pass arguments to the token
/// @dev This is used to avoid having constructor arguments in the token contract, which results in the init code hash
/// of the token being constant allowing the CREATE2 address of the token to be cheaply computed on-chain
interface ITokenDeployer {
  function parameters() external view returns (address owner, string memory _name, string memory _symbol);
}
