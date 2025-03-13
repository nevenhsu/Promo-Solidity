// SPDX-License-Identifier: MIT
// Compatible with OpenZeppelin Contracts ^5.0.0
pragma solidity ^0.8.27;

import '@openzeppelin/contracts/token/ERC721/extensions/ERC721Pausable.sol';
import '@openzeppelin/contracts/token/ERC20/IERC20.sol';
import '@openzeppelin/contracts/token/ERC20/extensions/IERC20Permit.sol';
import '@openzeppelin/contracts/token/ERC20/utils/SafeERC20.sol';
import '@openzeppelin/contracts/access/AccessControl.sol';
import '@openzeppelin/contracts/utils/Strings.sol';

contract NonfungibleActivityManager is ERC721Pausable, AccessControl {
  using SafeERC20 for IERC20;
  using Strings for address;
  using Strings for uint256;

  struct Activity {
    address owner;
    address token;
    uint64 startTime;
    uint64 endTime;
    uint128 totalAmount; // Amount of prize in ERC-20 tokens
    uint128 distributedAmount; // Amount of distributed prize
    uint128 refundedAmount; // Amount of refunded prize
    uint128 feeAmount; // Amount of fee
  }

  bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');

  string private _baseTokenURI;
  uint256 private _nextTokenId = 1; // Start from 1
  uint64 internal constant refundTime = 1209600; // 14 days
  uint16 public fee = 30; // 0.3%
  address public immutable treasury;
  address public airdropManager;

  mapping(uint256 tokenId => Activity) private _activities;

  event Create(address indexed owner, address token, uint256 tokenId, uint64 startTime, uint64 endTime);
  event Distribute(uint256 tokenId, uint128 distributedAmount, uint128 feeAmount);
  event Refund(uint256 tokenId, uint128 refundedAmount);
  event Deposit(uint256 tokenId, uint128 amount, uint128 totalAmount);

  constructor(
    address _treasury,
    address _admin,
    address _airdropManager,
    string memory baseURI_
  ) ERC721('Activity', 'ACT') {
    treasury = _treasury;
    airdropManager = _airdropManager;
    _baseTokenURI = baseURI_;
    _grantRole(DEFAULT_ADMIN_ROLE, _admin);
    _grantRole(ADMIN_ROLE, _admin);
  }

  // Pause and unpause functions
  function pause() public onlyRole(ADMIN_ROLE) {
    _pause();
  }

  function unpause() public onlyRole(ADMIN_ROLE) {
    _unpause();
  }

  function getActivity(uint256 tokenId) public view returns (Activity memory activity) {
    activity = _activities[tokenId];
    require(activity.owner != address(0), 'Invalid activity');
  }

  // Create a new activity
  function create(
    address owner,
    address token,
    uint64 startTime,
    uint64 endTime
  ) external whenNotPaused returns (uint256 tokenId) {
    tokenId = _create(owner, token, startTime, endTime);
  }

  function createAndDepositWithPermit(
    address owner, // Owner of the activity
    uint64 startTime,
    uint64 endTime,
    address token,
    uint128 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external whenNotPaused returns (uint256 tokenId) {
    tokenId = _create(owner, token, startTime, endTime);
    _depositWithPermit(tokenId, token, owner, amount, deadline, v, r, s);
  }

  function deposit(
    uint256 tokenId,
    address token,
    uint128 amount
  ) external whenNotPaused returns (uint256 totalAmount) {
    totalAmount = _deposit(tokenId, _msgSender(), token, amount);
  }

  function depositWithPermit(
    uint256 tokenId,
    address token,
    address owner,
    uint128 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external whenNotPaused returns (uint256 totalAmount) {
    totalAmount = _depositWithPermit(tokenId, token, owner, amount, deadline, v, r, s);
  }

  // Extract activity validation
  function _validateActivity(uint256 tokenId) internal view returns (Activity storage activity) {
    activity = _activities[tokenId];

    require(activity.owner != address(0), 'Invalid activity');
    require(activity.totalAmount > 0, 'No funds to distribute');
    require(activity.distributedAmount == 0, 'Amount already distributed');
    require(activity.refundedAmount == 0, 'Amount already refunded');
  }

  // Extract fee calculation logic
  function _calculateFee(uint128 amount) internal view returns (uint128 feeAmount, uint128 netAmount) {
    feeAmount = (amount * fee) / 10000;
    netAmount = amount - feeAmount;
  }

  // Distribute prize to airdrop manager
  function distribute(
    uint256 tokenId,
    uint128 amount
  ) external onlyRole(ADMIN_ROLE) returns (uint128 distributedAmount, uint128 feeAmount, uint128 refundedAmount) {
    Activity storage activity = _validateActivity(tokenId);
    require(block.timestamp >= activity.endTime, 'Activity is not finished');
    require(amount > 0, 'Amount must be greater than zero');
    require(amount <= activity.totalAmount, 'Invalid amount');

    (feeAmount, distributedAmount) = _calculateFee(amount);
    if (feeAmount > 0) {
      activity.feeAmount += feeAmount;
      IERC20(activity.token).safeTransfer(treasury, feeAmount);
    }

    if (distributedAmount > 0) {
      activity.distributedAmount += distributedAmount;
      IERC20(activity.token).safeTransfer(airdropManager, distributedAmount);
      emit Distribute(tokenId, distributedAmount, feeAmount);
    }

    // refund the remaining amount to the owner
    refundedAmount = activity.totalAmount - amount;
    if (refundedAmount > 0) {
      activity.refundedAmount += refundedAmount;
      IERC20(activity.token).safeTransfer(activity.owner, refundedAmount);
      emit Refund(tokenId, refundedAmount);
    }
  }

  // Manually request a refund after the activity
  function refund(uint256 tokenId) external returns (uint128 refundedAmount) {
    Activity storage activity = _validateActivity(tokenId);
    require(block.timestamp >= activity.endTime + refundTime, 'Refund time has not come yet');

    refundedAmount = activity.totalAmount;
    activity.refundedAmount += refundedAmount;

    IERC20(activity.token).safeTransfer(activity.owner, refundedAmount);
    emit Refund(tokenId, refundedAmount);
  }

  // Set the airdrop manager
  function setAirdropManager(address _airdropManager) external onlyRole(DEFAULT_ADMIN_ROLE) {
    airdropManager = _airdropManager;
  }

  // Set the airdrop manager
  function setFee(uint16 _fee) external onlyRole(DEFAULT_ADMIN_ROLE) {
    require(_fee <= 10000, 'Invalid fee');
    fee = _fee;
  }

  function setBaseURI(string memory baseURI_) external onlyRole(ADMIN_ROLE) {
    _baseTokenURI = baseURI_;
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    _requireOwned(tokenId);

    return
      bytes(_baseTokenURI).length > 0
        ? string.concat(_baseTokenURI, address(this).toHexString(), '/', tokenId.toString())
        : '';
  }

  function totalSupply() public view returns (uint256) {
    return _nextTokenId - 1;
  }

  function _create(address owner, address token, uint64 startTime, uint64 endTime) internal returns (uint256 tokenId) {
    require(owner != address(0), 'Invalid owner');
    require(token != address(0), 'Invalid token');
    require(startTime < endTime, 'Start time must be before end time');

    tokenId = _nextTokenId;
    _safeMint(owner, tokenId);

    _activities[tokenId] = Activity({
      owner: owner,
      token: token,
      startTime: startTime,
      endTime: endTime,
      totalAmount: 0,
      distributedAmount: 0,
      refundedAmount: 0,
      feeAmount: 0
    });

    ++_nextTokenId;

    emit Create(owner, token, tokenId, startTime, endTime);
  }

  function _depositWithPermit(
    uint256 tokenId,
    address token,
    address owner,
    uint128 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) private returns (uint128 totalAmount) {
    IERC20Permit(token).permit(owner, address(this), amount, deadline, v, r, s);
    totalAmount = _deposit(tokenId, owner, token, amount);
  }

  function _deposit(
    uint256 tokenId,
    address from,
    address token,
    uint128 amount
  ) private returns (uint128 totalAmount) {
    Activity storage activity = _activities[tokenId];

    require(block.timestamp < activity.endTime, 'Activity is finished');
    require(token == activity.token, 'Invalid token');
    require(amount > 0, 'Amount must be greater than zero');

    IERC20(token).safeTransferFrom(from, address(this), amount);
    activity.totalAmount += amount;
    totalAmount = activity.totalAmount;

    emit Deposit(tokenId, amount, totalAmount);
  }

  function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
