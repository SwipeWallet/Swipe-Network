pragma solidity ^0.5.0;

import "../Storage.sol";

/// @title StorageV2 Contract
/// @author growlot (@growlot)
contract StorageV2 is Storage {
    /// @notice The name of this contract
    string public constant name = "Swipe Staking V2";

    uint256 public _upcomingValue;
}
