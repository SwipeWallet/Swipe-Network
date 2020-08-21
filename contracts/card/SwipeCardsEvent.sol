pragma solidity ^0.5.0;

/// @title Swipe Cards Event Contract
/// @author brightdev33 (@brightdev33), blockplus (@blockplus)
contract SwipeCardsEvent {
    /// @notice An event emitted when initialize
    event Initialize(
        address indexed guardian
    );

    event GuardianshipTransferAuthorization(
        address indexed authorizedAddress
    );

    event GuardianUpdate(
        address indexed oldValue,
        address indexed newValue
    );

    event CardRegistration(
        uint256 indexed cardId,
        string cardName,
        uint256 lockUp,
        uint256 lockUpTime,
        string fee,
        string feeSplitPercentage
    );

    event CardUpdate(
        uint256 indexed cardId,
        string cardName,
        uint256 lockUp,
        uint256 lockUpTime,
        string fee,
        string feeSplitPercentage
    );

    event CardNameUpdate(
        uint256 indexed cardId,
        string oldValue,
        string newValue
    );

    event LockUpUpdate(
        uint256 indexed cardId,
        uint256 oldValue,
        uint256 newValue
    );

    event LockUpTimeUpdate(
        uint256 indexed cardId,
        uint256 oldValue,
        uint256 newValue
    );

    event FeeUpdate(
        uint256 indexed cardId,
        string oldValue,
        string newValue
    );

    event FeeSplitPercentageUpdate(
        uint256 indexed cardId,
        string oldValue,
        string newValue
    );
}
