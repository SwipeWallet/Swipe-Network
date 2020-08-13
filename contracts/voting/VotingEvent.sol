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

    /// @notice An event emitted when set guardian
    event NewGuardian(
        address indexed guardian
    );

    /// @notice An event emitted when set quorumVotes
    event NewQuorumVotes(
        uint256 indexed quorumVotes
    );

    /// @notice An event emitted when set proposalThreshold
    event NewProposalThreshold(
        uint256 indexed proposalThreshold
    );

    /// @notice An event emitted when set proposalMaxOperations
    event NewProposalMaxOperations(
        uint256 indexed proposalMaxOperations
    );

    /// @notice An event emitted when set votingDelay
    event NewVotingDelay(
        uint256 indexed votingDelay
    );

    /// @notice An event emitted when set votingPeriod
    event NewVotingPeriod(
        uint256 indexed votingPeriod
    );

    /// @notice An event emitted when a new proposal is created
    event CreateProposal(
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
        bool indexed support,
        uint256 votes
    );

    /// @notice An event emitted when a proposal has been canceled
    event CancelProposal(
        uint256 indexed id
    );

    /// @notice An event emitted when a proposal has been queued in the Timelock
    event QueueProposal(
        uint256 indexed id,
        uint256 indexed eta
    );

    /// @notice An event emitted when a proposal has been executed in the Timelock
    event ExecuteProposal(
        uint256 indexed id
    );
}
