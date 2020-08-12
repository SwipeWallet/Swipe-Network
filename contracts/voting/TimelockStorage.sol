pragma solidity ^0.5.16;

/// @title Timelock Storage Contract
contract TimelockStorage {
    /// @notice The name of this contract
    string public constant name = "Swipe Timelock";

    /// @notice Initialized flag - indicates that initialization was made once
    bool internal _initialized;

    uint public constant GRACE_PERIOD = 14 days;
    uint public constant MINIMUM_DELAY = 2 days;
    uint public constant MAXIMUM_DELAY = 30 days;

    address public _admin;
    address public _pendingAdmin;
    uint public _delay;

    mapping (bytes32 => bool) public _queuedTransactions;
}
