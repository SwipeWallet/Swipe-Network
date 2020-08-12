pragma solidity ^0.5.0;

contract TimelockStorage {
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