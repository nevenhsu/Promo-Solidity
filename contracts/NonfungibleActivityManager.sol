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

  enum ActivityStatus {
    Active,
    Distributed,
    Refunded
  }
  struct Activity {
    address owner;
    address token;
    uint64 startTime;
    uint64 endTime;
    uint128 totalAmount; // Amount of prize in ERC-20 tokens
    ActivityStatus status;
  }

  bytes32 public constant ADMIN_ROLE = keccak256('ADMIN_ROLE');

  string private _baseTokenURI;
  uint256 private _nextTokenId = 1; // Start from 1
  uint64 internal constant refundTime = 1209600; // 14 days
  uint16 public fee = 30; // 0.3%
  address public immutable treasury;
  address public airdropManager;

  mapping(uint256 tokenId => Activity) private _activities;

  event Create(uint256 indexed tokenId, address indexed owner, address token, uint64 startTime, uint64 endTime);
  event Distribute(uint256 indexed tokenId, address indexed to, uint128 amount, uint128 feeAmount);
  event Refund(uint256 indexed tokenId, address indexed to, uint128 amount);
  event Deposit(uint256 indexed tokenId, uint128 amount, uint128 totalAmount);

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

  /// @notice Create a new activity
  /// @param owner The owner of the activity
  /// @param token The token address to be distributed
  /// @param startTime The start time of the activity
  /// @param endTime The end time of the activity
  function create(
    address owner,
    address token,
    uint64 startTime,
    uint64 endTime
  ) external whenNotPaused returns (uint256 tokenId) {
    tokenId = _create(owner, token, startTime, endTime);
  }

  function createAndDeposit(
    address owner,
    uint64 startTime,
    uint64 endTime,
    address token,
    uint128 amount
  ) external whenNotPaused returns (uint256 tokenId) {
    tokenId = _create(owner, token, startTime, endTime);
    _deposit(tokenId, _msgSender(), token, amount);
  }

  function createAndDepositWithPermit(
    address owner,
    uint64 startTime,
    uint64 endTime,
    address from,
    address token,
    uint128 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external whenNotPaused returns (uint256 tokenId) {
    tokenId = _create(owner, token, startTime, endTime);
    _depositWithPermit(tokenId, token, from, amount, deadline, v, r, s);
  }

  /// @notice Deposit tokens to the activity
  /// @param tokenId - The ID of the activity
  /// @param token - The token address to deposit
  /// @param amount - The amount of tokens to deposit
  function deposit(uint256 tokenId, address token, uint128 amount) external whenNotPaused {
    _deposit(tokenId, _msgSender(), token, amount);
  }

  function depositWithPermit(
    uint256 tokenId,
    address token,
    address from,
    uint128 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) external whenNotPaused {
    _depositWithPermit(tokenId, token, from, amount, deadline, v, r, s);
  }

  /// @notice Distribute the tokens to the airdrop manager
  /// @param tokenId - The ID of the activity
  /// @param amount - The amount of tokens to distribute
  function distribute(uint256 tokenId, uint128 amount) external whenNotPaused onlyRole(ADMIN_ROLE) {
    Activity storage activity = _requireActiveActivity(tokenId);
    require(block.timestamp >= activity.endTime, 'Activity not finished');
    require(amount > 0 && amount <= activity.totalAmount, 'Invalid amount');
    activity.status = ActivityStatus.Distributed;

    (uint128 feeAmount, uint128 netAmount) = _calculateFee(amount);

    if (feeAmount > 0) {
      IERC20(activity.token).safeTransfer(treasury, feeAmount);
    }

    if (netAmount > 0) {
      IERC20(activity.token).safeTransfer(airdropManager, netAmount);
    }

    // refund the remaining amount to the owner
    uint128 remaining = activity.totalAmount - amount;
    if (remaining > 0) {
      IERC20(activity.token).safeTransfer(activity.owner, remaining);
      emit Refund(tokenId, activity.owner, remaining);
    }

    emit Distribute(tokenId, airdropManager, netAmount, feeAmount);
  }

  /// @notice Refund the tokens to the owner of the activity after the refund time
  /// @param tokenId - The ID of the activity
  function refund(uint256 tokenId) external whenNotPaused {
    Activity storage activity = _requireActiveActivity(tokenId);
    require(activity.totalAmount > 0, 'No funds to distribute');
    require(block.timestamp > activity.endTime + refundTime, 'Refund time has not come yet');
    activity.status = ActivityStatus.Refunded;

    IERC20(activity.token).safeTransfer(activity.owner, activity.totalAmount);
    emit Refund(tokenId, activity.owner, activity.totalAmount);
  }

  function isRefundable(uint256 tokenId) public view returns (bool) {
    Activity memory a = _activities[tokenId];
    return a.status == ActivityStatus.Active && a.totalAmount > 0 && block.timestamp > a.endTime + refundTime;
  }

  function setAirdropManager(address _airdropManager) external onlyRole(DEFAULT_ADMIN_ROLE) {
    airdropManager = _airdropManager;
  }

  function setFee(uint16 _fee) external onlyRole(DEFAULT_ADMIN_ROLE) {
    require(_fee <= 10000, 'Invalid fee');
    fee = _fee;
  }

  function setBaseURI(string memory baseURI_) external onlyRole(ADMIN_ROLE) {
    _baseTokenURI = baseURI_;
  }

  function tokenURI(uint256 tokenId) public view virtual override returns (string memory) {
    _requireOwned(tokenId);

    return bytes(_baseTokenURI).length > 0 ? string.concat(_baseTokenURI, tokenId.toString()) : '';
  }

  function totalSupply() public view returns (uint256) {
    return _nextTokenId - 1;
  }

  /// @notice Make sure the activity is valid and not finished
  /// @param tokenId - The ID of the activity
  function _requireActiveActivity(uint256 tokenId) internal view returns (Activity storage activity) {
    activity = _activities[tokenId];
    require(activity.status == ActivityStatus.Active, 'Activity already finalized');
  }

  function _calculateFee(uint128 amount) internal view returns (uint128 feeAmount, uint128 netAmount) {
    feeAmount = (amount * fee) / 10000;
    netAmount = amount - feeAmount;
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
      status: ActivityStatus.Active
    });

    ++_nextTokenId;

    emit Create(tokenId, owner, token, startTime, endTime);
  }

  function _depositWithPermit(
    uint256 tokenId,
    address token,
    address from,
    uint128 amount,
    uint256 deadline,
    uint8 v,
    bytes32 r,
    bytes32 s
  ) private {
    IERC20Permit(token).permit(from, address(this), amount, deadline, v, r, s);
    _deposit(tokenId, from, token, amount);
  }

  function _deposit(uint256 tokenId, address from, address token, uint128 amount) private {
    Activity storage activity = _requireActiveActivity(tokenId);

    require(block.timestamp < activity.endTime, 'Activity is finished');
    require(token == activity.token, 'Invalid token');
    require(amount > 0, 'Amount must be greater than zero');

    IERC20(token).safeTransferFrom(from, address(this), amount);
    activity.totalAmount += amount;

    emit Deposit(tokenId, amount, activity.totalAmount);
  }

  function supportsInterface(bytes4 interfaceId) public view override(ERC721, AccessControl) returns (bool) {
    return super.supportsInterface(interfaceId);
  }
}
