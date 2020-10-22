pragma solidity ^0.5.0;

import "../NamedContract.sol";
import "./SwipeCardsStorage.sol";
import "./SwipeCardsEvent.sol";

/// @title Swipe Cards Contract: Configurations of Swipe Network
contract SwipeCards is NamedContract, SwipeCardsStorage, SwipeCardsEvent {
    /// @notice Card constructor
    constructor() public {
        setContractName('Swipe Cards');
    }

    /// @notice Card Initializer
    /// @dev Sets default guardian
    function initialize(address guardian) external {
        require(
            !_initialized,
            "Cards Contract has been already initialized"
        );
        
        _guardian = guardian;

        _initialized = true;

        emit Initialize(_guardian);
    }

    /**
     * @notice Authorizes the transfer of guardianship from guardian to the provided address.
     * NOTE: No transfer will occur unless authorizedAddress calls assumeGuardianship( ).
     * This authorization may be removed by another call to this function authorizing
     * the null address.
     *
     * @param authorizedAddress The address authorized to become the new guardian.
     */
    function authorizeGuardianshipTransfer(address authorizedAddress) external {
        require(
            msg.sender == _guardian,
            "Only the guardian can authorize a new address to become guardian"
        );

        _authorizedNewGuardian = authorizedAddress;

        emit GuardianshipTransferAuthorization(_authorizedNewGuardian);
    }

    /**
     * @notice Transfers guardianship of this contract to the _authorizedNewGuardian.
     */
    function assumeGuardianship() external {
        require(
            msg.sender == _authorizedNewGuardian,
            "Only the authorized new guardian can accept guardianship"
        );

        address oldValue = _guardian;
        _guardian = _authorizedNewGuardian;
        _authorizedNewGuardian = address(0);

        emit GuardianUpdate(
            oldValue,
            _guardian
        );
    }

    /// @notice Registers new card
    /// @dev Creates an new card with the provided configurations
    function registerCard(
        string calldata cardName,
        uint256 lockUp,
        uint256 lockUpTime,
        string calldata fee,
        string calldata feeSplitPercentage
    ) external returns (uint256) {
        require(
            bytes(cardName).length > 0,
            "Invalid card name"
        );
        require(
            lockUp >= 0,
            "Card lockup must be equal or greater than zero"
        );
        require(
            lockUpTime >= 0 seconds,
            "Card lockup time must be equal or greater than zero"
        );
        require(
            bytes(fee).length > 0,
            "Card fee must be equal or greater than zero"
        );
        require(
            bytes(feeSplitPercentage).length > 0,
            "Card fee split percentage must be equal or greater than zero"
        );

        require(
            msg.sender == _guardian,
            "Only the guardian can register new card"
        );

        _cardCount++;
        Card memory newCard = Card({
            cardId: _cardCount,
            cardName: cardName,
            lockUp: lockUp,
            lockUpTime: lockUpTime,
            fee: fee,
            feeSplitPercentage: feeSplitPercentage
        });
        _cards[newCard.cardId] = newCard;

        emit CardRegistration(
            newCard.cardId,
            newCard.cardName,
            newCard.lockUp,
            newCard.lockUpTime,
            newCard.fee,
            newCard.feeSplitPercentage
        );

        return newCard.cardId;
    }

    /// @notice Updates card
    /// @dev Updates the card with the provided configurations
    function setCard(
        uint256 cardId,
        string calldata cardName,
        uint256 lockUp,
        uint256 lockUpTime,
        string calldata fee,
        string calldata feeSplitPercentage
    ) external returns (uint256) {
        require(
            _cardCount >= cardId && cardId > 0,
            "Invalid card id"
        );
        require(
            bytes(cardName).length > 0,
            "Invalid card name"
        );
        require(
            lockUp >= 0,
            "Card lockup must be equal or greater than zero"
        );
        require(
            lockUpTime >= 0 seconds,
            "Card lockup time must be equal or greater than zero"
        );
        require(
            bytes(fee).length > 0,
            "Card fee must be equal or greater than zero"
        );
        require(
            bytes(feeSplitPercentage).length > 0,
            "Card fee split percentage must be equal or greater than zero"
        );

        require(
            msg.sender == _guardian,
            "Only the guardian can update card"
        );

        Card storage card = _cards[cardId];
        card.cardName = cardName;
        card.lockUp = lockUp;
        card.lockUpTime = lockUpTime;
        card.fee = fee;
        card.feeSplitPercentage = feeSplitPercentage;

        emit CardUpdate(
            card.cardId,
            card.cardName,
            card.lockUp,
            card.lockUpTime,
            card.fee,
            card.feeSplitPercentage
        );
    }

    /// @notice Sets Card Name
    /// @dev Sets Card Name configuration value
    function setCardName(uint256 cardId, string calldata newName) external {
        require(
            _cardCount >= cardId && cardId > 0,
            "Invalid card id"
        );
        require(
            bytes(newName).length > 0,
            "Invalid card name"
        );

        require(
            msg.sender == _guardian,
            "Only the guardian can set card name configuration value"
        );

        Card storage card = _cards[cardId];
        string memory oldValue = card.cardName;
        card.cardName = newName;

        emit CardNameUpdate(
            cardId,
            oldValue,
            card.cardName
        );
    }

    /// @notice Sets Card Lock Up
    /// @dev Sets Card Lock Up configuration value
    function setCardLockUp(uint256 cardId, uint256 newLockUp) external {
        require(
            _cardCount >= cardId && cardId > 0,
            "Invalid card id"
        );
        require(
            newLockUp >= 0,
            "Card lockup must be equal or greater than zero"
        );

        require(
            msg.sender == _guardian,
            "Only the guardian can set card lockup configuration value"
        );

        Card storage card = _cards[cardId];
        uint256 oldValue = card.lockUp;
        card.lockUp = newLockUp;

        emit LockUpUpdate(
            cardId,
            oldValue,
            card.lockUp
        );
    }

    /// @notice Sets Card Lock Up Times
    /// @dev Sets Card Lock Up Times configuration value
    function setCardLockUpTime(uint256 cardId, uint256 newLockUpTime) external {
        require(
            _cardCount >= cardId && cardId > 0,
            "Invalid card id"
        );
        require(
            newLockUpTime >= 0 seconds,
            "Card lockup time must be greater than zero"
        );

        require(
            msg.sender == _guardian,
            "Only the guardian can set card lockup times configuration value"
        );

        Card storage card = _cards[cardId];
        uint256 oldValue = card.lockUpTime;
        card.lockUpTime = newLockUpTime;

        emit LockUpTimeUpdate(
            cardId,
            oldValue,
            card.lockUpTime
        );
    }

    /// @notice Sets Card Fee
    /// @dev Sets Card Fee configuration value
    function setCardFee(uint256 cardId, string calldata newFee) external {
        require(
            _cardCount >= cardId && cardId > 0,
            "Invalid card id"
        );
        require(
            bytes(newFee).length > 0,
            "Card fee must be equal or greater than zero"
        );

        require(
            msg.sender == _guardian,
            "Only the guardian can set card fee configuration value"
        );

        Card storage card = _cards[cardId];
        string memory oldValue = card.fee;
        card.fee = newFee;

        emit FeeUpdate(
            cardId,
            oldValue,
            card.fee
        );
    }

    /// @notice Set Fee Split Percentage Percentage
    /// @dev Set Fee Split Percentage configuration value
    function setCardFeeSplitPercentage(uint256 cardId, string calldata newFeeSplitPercentage) external {
        require(
            _cardCount >= cardId && cardId > 0,
            "Invalid card id"
        );
        require(
            bytes(newFeeSplitPercentage).length > 0,
            "Card fee split percentage must be equal or greater than zero"
        );

        require(
            msg.sender == _guardian,
            "Only the guardian can set card fee split percentage configuration value"
        );

        Card storage card = _cards[cardId];
        string memory oldValue = card.feeSplitPercentage;
        card.feeSplitPercentage = newFeeSplitPercentage;

        emit FeeSplitPercentageUpdate(
            cardId,
            oldValue,
            card.feeSplitPercentage
        );
    }
}
