pragma solidity ^0.5.0;

import "./StakingStorageV2.sol";

/// @title Staking Storage Contract Version 3
contract StakingStorageV3 is StakingStorageV2 {
    uint256 public _prevMinimumWithdrawableAge;
    uint256 public _minimumWithdrawableAge;
}
