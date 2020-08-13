pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "../SafeMath.sol";
import "./VotingStorage.sol";
import "./VotingEvent.sol";

/// @title Voting Contract
contract Voting is VotingStorage, VotingEvent {
    using SafeMath for uint256;

    function initialize(
        address timelockAddress,
        address stakingAddress,
        address guardian
    ) public {
        _timelock = TimelockInterface(timelockAddress);
        _staking = StakingInterface(stakingAddress);
        _guardian = guardian;

        _initialized = true;

        emit Initialize(
            timelockAddress,
            stakingAddress,
            guardian
        );
    }

    /// @notice The name of this contract
    string public constant name = "Swipe Voting";

    /// @notice Set Swipe guardian 
    function setGuardian(address guardian) public {
        require(
            msg.sender == address(this),
            "Swipe Voting::setting: setGuardian call must come from Swipe Voting."
        );

        _guardian = guardian;

        emit NewGuardian(
            _guardian
        );
    }

    /// @notice The number of votes in support of a proposal required in order for a quorum to be reached and for a vote to succeed
    function setQuorumVotes(uint256 quorumVotes) external {
        require(
            msg.sender == _guardian,
            "Swipe Voting::setting: quorumVotes can be set by guardian"
        );

        _quorumVotes = quorumVotes; 

        emit NewQuorumVotes(
            _quorumVotes
        );
    }

    /// @notice The number of votes required in order for a voter to become a proposer
    function setProposalThreshold(uint256 proposalThreshold) external {
        require(
            msg.sender == _guardian,
            "Swipe Voting::setting: proposalThreshold can be set by guardian"
        );
        
        _proposalThreshold = proposalThreshold;

        emit NewProposalThreshold(
            _proposalThreshold
        );
    }

    /// @notice The maximum number of actions that can be included in a proposal
    function setProposalMaxOperations(uint256 proposalMaxOperations) external {
        require(
            msg.sender == _guardian,
            "Swipe Voting::setting: proposalMaxOperations can be set by guardian"
        );
        
        _proposalMaxOperations = proposalMaxOperations;

        emit NewProposalMaxOperations(
            _proposalMaxOperations
        );
    }

    /// @notice The delay before voting on a proposal may take place, once proposed
    function setVotingDelay(uint256 votingDelay) external {
        require(
            msg.sender == _guardian,
            "Swipe Voting::setting: votingDelay can be set by guardian"
        );
        
        _votingDelay = votingDelay;

        emit NewVotingDelay(
            _votingDelay
        );
    }

    /// @notice The duration of voting on a proposal, in blocks
    function setVotingPeriod(uint256 votingPeriod) external {
        require(
            msg.sender == _guardian,
            "Swipe Voting::setting: votingPeriod can be set by guardian"
        );
        
        _votingPeriod = votingPeriod;

        emit NewVotingPeriod(
            _votingPeriod
        );
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        string memory description
    ) public returns (uint256) {
        require(
            _staking.getStakedMap(msg.sender) > _proposalThreshold,
            "Swipe Voting::propose: proposer votes below proposal threshold"
        );

        require(
            targets.length == values.length && targets.length == signatures.length && targets.length == calldatas.length,
            "Swipe Voting::propose: proposal function information arity mismatch"
        );

        require(
            targets.length != 0,
            "Swipe Voting::propose: must provide actions"
        );

        require(
            targets.length <= _proposalMaxOperations,
            "Swipe Voting::propose: too many actions"
        );

        uint256 latestProposalId = _latestProposalIds[msg.sender];
        if (latestProposalId != 0) {
            ProposalState proposersLatestProposalState = state(latestProposalId);
            require(
                proposersLatestProposalState != ProposalState.Active,
                "Swipe Voting::propose: one live proposal per proposer, found an already active proposal"
            );
            
            require(
                proposersLatestProposalState != ProposalState.Pending,
                "Swipe Voting::propose: one live proposal per proposer, found an already pending proposal"
            );
        }

        uint256 startBlock = block.number.add(_votingDelay);
        uint256 endBlock = startBlock.add(_votingPeriod);

        _proposalCount++;
        Proposal memory newProposal = Proposal({
            id: _proposalCount,
            proposer: msg.sender,
            eta: 0,
            targets: targets,
            values: values,
            signatures: signatures,
            calldatas: calldatas,
            startBlock: startBlock,
            endBlock: endBlock,
            upVotes: 0,
            downVotes: 0,
            canceled: false,
            executed: false
        });

        _proposals[newProposal.id] = newProposal;
        _latestProposalIds[newProposal.proposer] = newProposal.id;

        emit CreateProposal(
            newProposal.id,
            msg.sender,
            targets,
            values,
            signatures,
            calldatas,
            startBlock,
            endBlock,
            description
        );

        return newProposal.id;
    }

    function queue(
        uint256 proposalId
    ) public {
        require(
            state(proposalId) == ProposalState.Succeeded,
            "Swipe Voting::queue: proposal can only be queued if it is succeeded"
        );

        Proposal storage proposal = _proposals[proposalId];
        uint256 eta = block.timestamp.add(_timelock.delay());
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            queueOrRevert(proposal.targets[i], proposal.values[i], proposal.signatures[i], proposal.calldatas[i], eta);
        }
        proposal.eta = eta;

        emit QueueProposal(
            proposalId,
            eta
        );
    }

    function queueOrRevert(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) internal {
        require(
            !_timelock.queuedTransactions(keccak256(abi.encode(target, value, signature, data, eta))),
            "Swipe Voting::queueOrRevert: proposal action already queued at eta"
        );

        _timelock.queueTransaction(target, value, signature, data, eta);
    }

    function execute(
        uint256 proposalId
    ) public payable {
        require(
            state(proposalId) == ProposalState.Queued,
            "Swipe Voting::execute: proposal can only be executed if it is queued"
        );

        Proposal storage proposal = _proposals[proposalId];
        proposal.executed = true;
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            _timelock.executeTransaction.value(
                proposal.values[i]
            )(proposal.targets[i], proposal.values[i], proposal.signatures[i], proposal.calldatas[i], proposal.eta);
        }

        emit ExecuteProposal(proposalId);
    }

    function cancel(
        uint256 proposalId
    ) public {
        ProposalState state = state(proposalId);

        require(
            state != ProposalState.Executed,
            "Swipe Voting::cancel: cannot cancel executed proposal"
        );

        Proposal storage proposal = _proposals[proposalId];

        require(
            msg.sender == _guardian || _staking.getStakedMap(proposal.proposer) < _proposalThreshold,
            "Swipe Voting::cancel: proposer above threshold"
        );

        proposal.canceled = true;
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            _timelock.cancelTransaction(
                proposal.targets[i],
                proposal.values[i],
                proposal.signatures[i],
                proposal.calldatas[i],
                proposal.eta
            );
        }

        emit CancelProposal(
            proposalId
        );
    }

    function getActions(
        uint256 proposalId
    ) public view returns (address[] memory targets, uint256[] memory values, string[] memory signatures, bytes[] memory calldatas) {
        Proposal storage p = _proposals[proposalId];
        return (p.targets, p.values, p.signatures, p.calldatas);
    }

    function getReceipt(
        uint256 proposalId,
        address voter
    ) public view returns (Receipt memory) {
        return _proposals[proposalId].receipts[voter];
    }

    function state(
        uint256 proposalId
    ) public view returns (ProposalState) {
        require(
            _proposalCount >= proposalId && proposalId > 0,
            "Swipe Voting::state: invalid proposal id"
        );

        Proposal storage proposal = _proposals[proposalId];
        if (proposal.canceled) {
            return ProposalState.Canceled;
        } else if (block.number <= proposal.startBlock) {
            return ProposalState.Pending;
        } else if (block.number <= proposal.endBlock) {
            return ProposalState.Active;
        } else if (proposal.upVotes <= proposal.downVotes || proposal.upVotes < _quorumVotes) {
            return ProposalState.Defeated;
        } else if (proposal.eta == 0) {
            return ProposalState.Succeeded;
        } else if (proposal.executed) {
            return ProposalState.Executed;
        } else if (block.timestamp >= proposal.eta.add(_timelock.GRACE_PERIOD())) {
            return ProposalState.Expired;
        } else {
            return ProposalState.Queued;
        }
    }

    function castVote(
        uint256 proposalId,
        bool support
    ) public {
        return doCastVote(msg.sender, proposalId, support);
    }

    function castVoteBySig(
        uint256 proposalId,
        bool support,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) public {
        bytes32 domainSeparator = keccak256(abi.encode(DOMAIN_TYPEHASH, keccak256(bytes(name)), getChainId(), address(this)));
        bytes32 structHash = keccak256(abi.encode(BALLOT_TYPEHASH, proposalId, support));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        address signatory = ecrecover(digest, v, r, s);
        
        require(
            signatory != address(0),
            "Swipe Voting::castVoteBySig: invalid signature"
        );

        return doCastVote(signatory, proposalId, support);
    }

    function doCastVote(
        address voter,
        uint256 proposalId,
        bool support
    ) internal {
        require(
            state(proposalId) == ProposalState.Active,
            "Swipe Voting::doCastVote: voting is closed"
        );

        Proposal storage proposal = _proposals[proposalId];
        Receipt storage receipt = proposal.receipts[voter];
        
        require(
            receipt.hasVoted == false,
            "Swipe Voting::doCastVote: voter already voted"
        );
        
        uint256 votes = _staking.getStakedMap(voter);

        if (support) {
            proposal.upVotes = proposal.upVotes.add(votes);
        } else {
            proposal.downVotes = proposal.downVotes.add(votes);
        }

        receipt.hasVoted = true;
        receipt.support = support;
        receipt.votes = votes;

        emit Vote(
            voter,
            proposalId,
            support,
            votes
        );
    }

    function acceptAdmin() public {
        require(
            msg.sender == _guardian,
            "Swipe Voting::acceptAdmin: sender must be Swipe guardian"
        );

        _timelock.acceptAdmin();
    }

    function abdicate() public {
        require(
            msg.sender == _guardian,
            "Swipe Voting::abdicate: sender must be Swipe guardian"
        );

        _guardian = address(0);
    }

    function queueSetTimelockPendingAdmin(
        address newPendingAdmin,
        uint256 eta
    ) public {
        require(
            msg.sender == _guardian,
            "Swipe Voting::queueSetTimelockPendingAdmin: sender must be Swipe guardian"
        );

        _timelock.queueTransaction(address(_timelock), 0, "setPendingAdmin(address)", abi.encode(newPendingAdmin), eta);
    }

    function executeSetTimelockPendingAdmin(
        address newPendingAdmin,
        uint256 eta
    ) public {
        require(
            msg.sender == _guardian,
            "Swipe Voting::executeSetTimelockPendingAdmin: sender must be Swipe guardian"
        );
        _timelock.executeTransaction(address(_timelock), 0, "setPendingAdmin(address)", abi.encode(newPendingAdmin), eta);
    }

    function getChainId() internal pure returns (uint256) {
        uint256 chainId;
        assembly {
            chainId := chainid()
        }
        return chainId;
    }
}
