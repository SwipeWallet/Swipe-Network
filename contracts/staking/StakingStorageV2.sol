pragma solidity ^0.5.0;

import "./StakingStorage.sol";

/// @title Staking Storage Contract Version 2
/// @author growlot (@growlot)
contract StakingStorageV2 is StakingStorage {
    uint256 public _prevRewardPendingPeriod;
    uint256 public _rewardPendingPeriod;
}
