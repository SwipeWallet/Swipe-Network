pragma solidity ^0.5.0;

import "../staking/StakingStorage.sol";

/// @title Staking StorageV2 Contract
/// @author growlot (@growlot)
contract StakingStorageV2 is StakingStorage {
    uint256 public _upcomingValue;
}
