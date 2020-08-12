pragma solidity ^0.5.16;

/// @title Voting Timelock Event Interface
interface TimelockEvent {
    event Initialized(
        address admin,
        uint delay
    );

    event NewAdmin(
        address indexed newAdmin
    );

    event NewPendingAdmin(
        address indexed newPendingAdmin
    );

    event NewDelay(
        uint indexed newDelay
    );

    event CancelTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint value,
        string signature,
        bytes data,
        uint eta
    );

    event ExecuteTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint value,
        string signature,
        bytes data,
        uint eta
    );

    event QueueTransaction(
        bytes32 indexed txHash,
        address indexed target,
        uint value,
        string signature,
        bytes data,
        uint eta
    );
}
