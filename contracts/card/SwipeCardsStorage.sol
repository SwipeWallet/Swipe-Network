pragma solidity ^0.5.0;

/// @title Swipe Cards Storage
/// @author brightdev33 (@brightdev33)
contract SwipeCardsStorage {

    /// @notice Initialized flag - indicates that initialization was made once
    bool internal _initialized;

    /// @notice The name of card contract
    string public constant name = "Swipe Cards";

    /// @notice The guardian address(voting)
    address public _guardian;

    /// @notice The authorized new guardian address
    address public _authorizedNewGuardian;

    /// @notice The Card Lock Up value
    uint256 public _lockUp;

    /// @notice The Card Fee Value
    string public _fee;

    /// @notice The Card Lock Up Time value
    uint256 public _lockUpTime;

    /// @notice The Card Fee Split Percentage value
    string public _feeSplitPercentage;
}
