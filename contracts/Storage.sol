pragma solidity ^0.5.16;

contract Storage {
    address public _tokenAddress;

    uint256 public _minimumStakeAmount = 1000 * (10**18);
    mapping (address => amount)) public _stakedMap;
    uint256 public _totalStaked;

    uint256 public _prevRewardCycle = 0;
    uint256 public _prevRewardAmount = 0;
    uint256 public _prevRewardCycleTimestamp = 0;
    uint256 public _rewardCycle = 1 days;
    uint256 public _rewardAmount = 40000 * (10**18);
    uint256 public _rewardCycleTimestamp = 0;
    uint256 public _rewardPool = 0;
    address public _rewardProvider;

    uint256 public _claimNonce = 0;
    mapping (address => mapping (uint256 => amount)))) public _approvedClaimMap;
}
