pragma solidity ^0.5.16;

/// @title Voting Storage Contract
contract VotingStorage {

    /// @notice Initialized flag - indicates that initialization was made once
    bool internal _initialized;

    /// @notice The name of this contract
    string public constant name = "Swipe Voting";

    /// @notice The address of the Swipe Timelock
    TimelockInterface public _timelock;

    /// @notice The address of the Swipe voting token
    StakingInterface public _staking;

    /// @notice The address of the Voting Guardian
    address public _guardian;

    /// @notice The number of votes in support of a proposal required in order for a quorum to be reached and for a vote to succeed
    uint256 internal _quorumVotes;

    /// @notice The number of votes required in order for a voter to become a proposer
    uint256 internal _proposalThreshold;

    /// @notice The maximum number of actions that can be included in a proposal
    uint256 internal _proposalMaxOperations;

    /// @notice The delay before voting on a proposal may take place, once proposed
    uint256 internal _votingDelay;

    /// @notice The duration of voting on a proposal, in blocks
    uint256 internal _votingPeriod;

    /// @notice The total number of proposals
    uint256 public _proposalCount;

    struct Proposal {
        /// @notice Unique id for looking up a proposal
        uint256 id;

        /// @notice Creator of the proposal
        address proposer;

        /// @notice The timestamp that the proposal will be available for execution, set once the vote succeeds
        uint256 eta;

        /// @notice the ordered list of target addresses for calls to be made
        address[] targets;

        /// @notice The ordered list of values (__acceptAdmini.e. msg.value) to be passed to the calls to be made
        uint256[] values;

        /// @notice The ordered list of function signatures to be called
        string[] signatures;

        /// @notice The ordered list of calldata to be passed to each call
        bytes[] calldatas;

        /// @notice The block at which voting begins: holders must delegate their votes prior to this block
        uint256 startBlock;

        /// @notice The block at which voting ends: votes must be cast prior to this block
        uint256 endBlock;

        /// @notice Current number of votes in favor of this proposal
        uint256 upVotes;

        /// @notice Current number of votes in opposition to this proposal
        uint256 downVotes;

        /// @notice Flag marking whether the proposal has been canceled
        bool canceled;

        /// @notice Flag marking whether the proposal has been executed
        bool executed;

        /// @notice Receipts of ballots for the entire set of voters
        mapping (address => Receipt) receipts;
    }

    /// @notice Ballot receipt record for a voter
    struct Receipt {
        /// @notice Whether or not a vote has been cast
        bool hasVoted;

        /// @notice Whether or not the voter supports the proposal
        bool support;

        /// @notice The number of votes the voter had, which were cast
        uint256 votes;
    }

    /// @notice Possible states that a proposal may be in
    enum ProposalState {
        Pending,
        Active,
        Canceled,
        Defeated,
        Succeeded,
        Queued,
        Expired,
        Executed
    }

    /// @notice The official record of all proposals ever proposed
    mapping (uint256 => Proposal) public _proposals;

    /// @notice The latest proposal for each proposer
    mapping (address => uint256) public _latestProposalIds;

    /// @notice The EIP-712 typehash for the contract's domain
    bytes32 public constant DOMAIN_TYPEHASH = keccak256("EIP712Domain(string name,uint256 chainId,address verifyingContract)");

    /// @notice The EIP-712 typehash for the ballot struct used by the contract
    bytes32 public constant BALLOT_TYPEHASH = keccak256("Ballot(uint256 proposalId,bool support)");

}

interface TimelockInterface {
    function delay() external view returns (uint256);
    function GRACE_PERIOD() external view returns (uint256);
    function acceptAdmin() external;
    function queuedTransactions(bytes32 hash) external view returns (bool);
    function queueTransaction(address target, uint256 value, string calldata signature, bytes calldata data, uint256 eta) external returns (bytes32);
    function cancelTransaction(address target, uint256 value, string calldata signature, bytes calldata data, uint256 eta) external;
    function executeTransaction(address target, uint256 value, string calldata signature, bytes calldata data, uint256 eta) external payable returns (bytes memory);
}

interface StakingInterface {
    function getStakedMap(address account) external view returns (uint256);
}
