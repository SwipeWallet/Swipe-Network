pragma solidity ^0.5.0;

/// @title Swipe Cards Storage
contract SwipeCardsStorage {

    /// @notice Initialized flag - indicates that initialization was made once
    bool internal _initialized;

    /// @notice The guardian address(voting)
    address public _guardian;

    /// @notice The authorized new guardian address
    address public _authorizedNewGuardian;

    struct Card
    {
        /// @notice The Card ID
        uint256 cardId;

        /// @notice The Card Name
        string cardName;

        /// @notice The Card Lock Up value
        uint256 lockUp;

        /// @notice The Card Lock Up Time value
        uint256 lockUpTime;

        /// @notice The Card Fee Value
        string fee;

        /// @notice The Card Fee Split Percentage value
        string feeSplitPercentage;
    }

    /// @notice The total number of cards
    uint256 public _cardCount;

    /// @notice The official record of all proposals ever proposed
    mapping (uint256 => Card) public _cards;
}
