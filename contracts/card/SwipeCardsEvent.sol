pragma solidity ^0.5.0;

/// @title Swipe Cards Event Contract
/// @author brightdev33 (@brightdev33)
contract SwipeCardsEvent {
    /// @notice An event emitted when initialize
    event Initialize(
        address indexed guardian,
        uint256 indexed lockUp,
        string indexed fee,
        uint256 lockUpTime,
        string feeSplitPercentage
    );

    event GuardianshipTransferAuthorization(
        address indexed authorizedAddress
    );

    event GuardianUpdate(
        address indexed oldValue,
        address indexed newValue
    );

    event LockUpUpdate(
        uint256 indexed oldValue,
        uint256 indexed newValue
    );

    event FeeUpdate(
        string oldValue,
        string newValue
    );

    event LockUpTimeUpdate(
        uint256 indexed oldValue,
        uint256 indexed newValue
    );

    event FeeSplitPercentageUpdate(
        string oldValue,
        string newValue
    );
}
