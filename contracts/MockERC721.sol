// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import '@openzeppelin/contracts/token/ERC721/ERC721.sol';

contract MockERC721 is ERC721 {
  constructor() ERC721('My721', 'M721') {}

  function mint(address to, uint256 tokenId) public {
    _safeMint(to, tokenId);
  }
}
