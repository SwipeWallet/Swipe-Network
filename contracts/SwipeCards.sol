pragma solidity ^0.5.0;

import "./NamedContract.sol";

/// @title Swipe Cards Contract: Configurations of Swipe Network
/// @author brightdev33 (@brightdev33)
contract SwipeCards is NamedContract {

    /// @notice Initialized flag - indicates that initialization was made once
    bool internal _initialized;

    /// @notice The name of card contract
    string public constant name = "Swipe Cards";

    /// @notice The guardian address(voting)
    address _guardian;

    /// @notice The Card Lock Up value
    uint256 _lockUp;

    /// @notice The Card Fee Value
    string _fee;

    /// @notice The Card Lock Up Time value
    uint256 _lockUpTime;

    /// @notice The Card Fee Split Percentage value
    string _feeSplitPct;

    /// @notice An event emitted when initialize
    event Initialize(
        address guardian,
        uint256 lockUp,
        string fee,
        uint256 lockUpTime,
        string feeSplitPct
    );

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
        string calldata feeSplitPct
    ) external {
        require(
            !_initialized,
            "Cards Contract has been already initialized"
        );
        
        _guardian = guardian;
        _lockUp = lockUp;
        _fee = fee;
        _lockUpTime = lockUpTime;
        _feeSplitPct = feeSplitPct;

        _initialized = true;

        emit Initialize(
            _guardian,
            _lockUp,
            _fee,
            _lockUpTime,
            _feeSplitPct
        );
    }

    /// @notice Set Card Lock Up
    /// @dev Set Card Lock Up configuration value
    function setCardLockUp(uint lockUp) external {
        require(
            lockUp >= 0,
            "Card lockup should be equal or great than zero."
        );
        require(
            msg.sender == _guardian,
            "Only the guardian can set card lockup configuration value."
        );

        _lockUp = lockUp;
    }

    /// @notice Get Card Lock Up
    /// @dev Get Card Lock Up configuration value
    function getCardLockUp() public view returns (uint256) {
        return _lockUp;
    }

    /// @notice Set Card Fee
    /// @dev Set Card Fee configuration value
    function setCardFee(string calldata fee) external {
        require(
            keccak256(abi.encodePacked(fee)) != keccak256(abi.encodePacked('')),
            "Card fee should be equal or great than zero."
        );
        require(
            msg.sender == _guardian,
            "Only the guardian can set card fee configuration value."
        );

        _fee = fee;
    }

    /// @notice Get Card Fee
    /// @dev Get Card Fee configuration value
    function getCardFee() public view returns (string memory) {
        return _fee;
    }

    /// @notice Set Card Lock Up Times
    /// @dev Set Card Lock Up Times configuration value
    function setCardLockUpTime(uint256 lockUpTime) external {
        require(
            lockUpTime >= 0 seconds,
            "Card lockup time should be great than zero."
        );
        require(
            msg.sender == _guardian,
            "Only the guardian can set card lockup times configuration value."
        );

        _lockUpTime = lockUpTime;
    }

    /// @notice Get Card Lock Up Times
    /// @dev Get Card Lock Up Times configuration value
    function getCardLockUpTime() public view returns (uint256) {
        return _lockUpTime;
    }

    /// @notice Set Fee Split Percentage Percentage
    /// @dev Set Fee Split Percentage configuration value
    function setCardFeeSplitPct(string calldata feeSplitPct) external {
        require(
            keccak256(abi.encodePacked(feeSplitPct)) != keccak256(abi.encodePacked('')),
            "Card fee split percentage should be equal or great than zero."
        );
        require(
            msg.sender == _guardian,
            "Only the guardian can set card fee split percentage configuration value."
        );

        _feeSplitPct = feeSplitPct;
    }

    /// @notice Get Card Fee Split Percentage
    /// @dev Get Fee Split Percentage configuration value
    function getCardFeeSplitPct() public view returns (string memory) {
        return _feeSplitPct;
    }
}
