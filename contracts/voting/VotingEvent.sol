pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

/// @title Voting Event Interface
interface VotingEvent {
    /// @notice An event emitted when initialize
    event Initialize(
        address indexed timelockAddress,
        address indexed stakingAddress,
        address indexed guardian
    );

    /// @notice An event emitted when a new proposal is created
    event ProposalCreated(
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

    /// @notice An event emitted when a vote has been cast on a proposal
    event Vote(
        address indexed voter,
        uint256 indexed proposalId,
        bool support,
        uint256 indexed votes
    );

    /// @notice An event emitted when a proposal has been canceled
    event ProposalCanceled(
        uint256 indexed id
    );

    /// @notice An event emitted when a proposal has been queued in the Timelock
    event ProposalQueued(
        uint256 indexed id,
        uint256 indexed eta
    );

    /// @notice An event emitted when a proposal has been executed in the Timelock
    event ProposalExecuted(
        uint256 indexed id
    );
}
