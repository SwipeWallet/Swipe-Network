pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

/// @title Voting Event Interface
interface VotingEvent {
    /// @notice An event emitted when initialize
    event Initialize(
        address timelock,
        address swipe,
        address guardian   
    );

    /// @notice An event emitted when a new proposal is created
    event ProposalCreated(
        uint id,
        address proposer,
        address[] targets,
        uint[] values,
        string[] signatures,
        bytes[] calldatas,
        uint startBlock,
        uint endBlock,
        string description
    );

    /// @notice An event emitted when a vote has been cast on a proposal
    event VoteCast(
        address voter,
        uint proposalId,
        bool support,
        uint votes
    );

    /// @notice An event emitted when a proposal has been canceled
    event ProposalCanceled(
        uint id
    );

    /// @notice An event emitted when a proposal has been queued in the Timelock
    event ProposalQueued(
        uint id,
        uint eta
    );

    /// @notice An event emitted when a proposal has been executed in the Timelock
    event ProposalExecuted(
        uint id
    );
}
