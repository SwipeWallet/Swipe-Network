pragma solidity ^0.5.0;

import "../NamedContract.sol";
import "./SwipeCardsStorage.sol";
import "./SwipeCardsEvent.sol";

/// @title Swipe Cards Contract: Configurations of Swipe Network
/// @author brightdev33 (@brightdev33)
contract SwipeCards is NamedContract, SwipeCardsStorage, SwipeCardsEvent {
    /// @notice Card constructor
    constructor() public {
        setContractName('Swipe Cards');
    }

    /// @notice Card Initializer
    /// @dev Set default network configuration values
    function initialize(
        address guardian,
        uint256 lockUp,
        string calldata fee,
        uint256 lockUpTime,
        string calldata feeSplitPercentage
    ) external {
        require(
            !_initialized,
            "Cards Contract has been already initialized"
        );
        
        _guardian = guardian;
        _lockUp = lockUp;
        _fee = fee;
        _lockUpTime = lockUpTime;
        _feeSplitPercentage = feeSplitPercentage;

        _initialized = true;

        emit Initialize(
            _guardian,
            _lockUp,
            _fee,
            _lockUpTime,
            _feeSplitPercentage
        );
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

    /// @notice Set Card Lock Up
    /// @dev Set Card Lock Up configuration value
    function setCardLockUp(uint256 newLockUp) external {
        require(
            newLockUp >= 0,
            "Card lockup should be equal or great than zero."
        );
        require(
            msg.sender == _guardian,
            "Only the guardian can set card lockup configuration value."
        );

        uint256 oldValue = _lockUp;
        _lockUp = newLockUp;

        emit LockUpUpdate(oldValue, _lockUp);
    }

    /// @notice Get Card Lock Up
    /// @dev Get Card Lock Up configuration value
    function getCardLockUp() public view returns (uint256) {
        return _lockUp;
    }

    /// @notice Set Card Fee
    /// @dev Set Card Fee configuration value
    function setCardFee(string calldata newFee) external {
        bytes memory tempNewFee = bytes(newFee);

        require(
            tempNewFee.length > 0,
            "Card fee should be equal or great than zero."
        );
        require(
            msg.sender == _guardian,
            "Only the guardian can set card fee configuration value."
        );

        string memory oldValue = _fee;
        _fee = newFee;

        emit FeeUpdate(oldValue, _fee);
    }

    /// @notice Get Card Fee
    /// @dev Get Card Fee configuration value
    function getCardFee() public view returns (string memory) {
        return _fee;
    }

    /// @notice Set Card Lock Up Times
    /// @dev Set Card Lock Up Times configuration value
    function setCardLockUpTime(uint256 newLockUpTime) external {
        require(
            newLockUpTime >= 0 seconds,
            "Card lockup time should be great than zero."
        );
        require(
            msg.sender == _guardian,
            "Only the guardian can set card lockup times configuration value."
        );

        uint256 oldValue = _lockUpTime;
        _lockUpTime = newLockUpTime;

        emit LockUpTimeUpdate(oldValue, _lockUpTime);
    }

    /// @notice Get Card Lock Up Times
    /// @dev Get Card Lock Up Times configuration value
    function getCardLockUpTime() public view returns (uint256) {
        return _lockUpTime;
    }

    /// @notice Set Fee Split Percentage Percentage
    /// @dev Set Fee Split Percentage configuration value
    function setCardFeeSplitPercentage(string calldata newFeeSplitPercentage) external {
        bytes memory tempNewFeeSplitPercentage = bytes(newFeeSplitPercentage);

        require(
            tempNewFeeSplitPercentage.length > 0,
            "Card fee split percentage should be equal or great than zero."
        );
        require(
            msg.sender == _guardian,
            "Only the guardian can set card fee split percentage configuration value."
        );

        string memory oldValue = _feeSplitPercentage;
        _feeSplitPercentage = newFeeSplitPercentage;

        emit FeeSplitPercentageUpdate(oldValue, _feeSplitPercentage);
    }

    /// @notice Get Card Fee Split Percentage
    /// @dev Get Fee Split Percentage configuration value
    function getCardFeeSplitPercentage() public view returns (string memory) {
        return _feeSplitPercentage;
    }
}
