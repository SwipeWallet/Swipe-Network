pragma solidity ^0.5.16;

/// @title Governance Timelock Event Contract
contract GovernanceTimelockEvent {
    event Initialize(
        address indexed guardian,
        uint256 indexed delay
    );

    event GuardianshipTransferAuthorization(
        address indexed authorizedAddress
    );

    event GuardianUpdate(
        address indexed oldValue,
        address indexed newValue
    );

    event DelayUpdate(
        uint256 indexed oldValue,
        uint256 indexed newValue
    );

    event TransactionQueue(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 eta
    );

    event TransactionCancel(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 eta
    );

    event TransactionExecution(
        bytes32 indexed txHash,
        address indexed target,
        uint256 value,
        string signature,
        bytes data,
        uint256 eta
    );
}
