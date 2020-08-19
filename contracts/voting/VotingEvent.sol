pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

/// @title Voting Event Contract
/// @author blockplus (@blockplus), brightdev33 (@brightdev33)
contract VotingEvent {
    /// @notice An event emitted when initialize
    event Initialize(
        address indexed timelockAddress,
        address indexed stakingAddress,
        address indexed guardian
    );

    event GuardianshipTransferAuthorization(
        address indexed authorizedAddress
    );

    event GuardianUpdate(
        address indexed oldValue,
        address indexed newValue
    );

    event QuorumVotesUpdate(
        uint256 indexed oldValue,
        uint256 indexed newValue
    );

    event ProposalThresholdUpdate(
        uint256 indexed oldValue,
        uint256 indexed newValue
    );

    event ProposalMaxOperationsUpdate(
        uint256 indexed oldValue,
        uint256 indexed newValue
    );

    event VotingDelayUpdate(
        uint256 indexed oldValue,
        uint256 indexed newValue
    );

    event VotingPeriodUpdate(
        uint256 indexed oldValue,
        uint256 indexed newValue
    );

    event ProposalCreation(
        uint256 indexed id,
        address indexed proposer,
        address[] targets,
        uint256[] values,
        string[] signatures,
        bytes[] calldatas,
        uint256 indexed startBlock,
        uint256 endBlock,
        string description
    );

    event Vote(
        address indexed voter,
        uint256 indexed proposalId,
        bool indexed support,
        uint256 votes
    );

    event ProposalCancel(
        uint256 indexed id
    );

    event ProposalQueue(
        uint256 indexed id,
        uint256 indexed eta
    );

    event ProposalExecution(
        uint256 indexed id
    );
}
