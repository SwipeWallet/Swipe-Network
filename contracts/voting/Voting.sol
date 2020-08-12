pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "./VotingStorage.sol";
import "./VotingEvent.sol";

/// @title Voting Contract
contract Voting is VotingStorage, VotingEvent {

    /// @notice The name of this contract
    string public constant name = "Swipe Voting";

    /// @notice The number of votes in support of a proposal required in order for a quorum to be reached and for a vote to succeed
    function quorumVotes() public pure returns (uint) { return 400000e18; } // 400,000

    /// @notice The number of votes required in order for a voter to become a proposer
    function proposalThreshold() public pure returns (uint) { return 100000e18; } // 100,000

    /// @notice The maximum number of actions that can be included in a proposal
    function proposalMaxOperations() public pure returns (uint) { return 10; } // 10 actions

    /// @notice The delay before voting on a proposal may take place, once proposed
    function votingDelay() public pure returns (uint) { return 1; } // 1 block

    /// @notice The duration of voting on a proposal, in blocks
    function votingPeriod() public pure returns (uint) { return 17280; } // ~3 days in blocks (assuming 15s blocks)

    function initialize(
        address timelock,
        address swipe,
        address guardian
    ) public {
        _timelock = TimelockInterface(timelock);
        _swipe = SwipeInterface(swipe);
        _guardian = guardian;

        _initialized = true;

        emit Initialize(
            timelock,
            swipe,
            guardian
        );
    }

    function propose(
        address[] memory targets,
        uint[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        string memory description
    ) public returns (uint) {
        require(
            _swipe.getPriorVotes(msg.sender, sub256(block.number, 1)) > proposalThreshold(),
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
            targets.length <= proposalMaxOperations(),
            "Swipe Voting::propose: too many actions"
        );

        uint latestProposalId = _latestProposalIds[msg.sender];
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

        uint startBlock = add256(block.number, votingDelay());
        uint endBlock = add256(startBlock, votingPeriod());

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
            forVotes: 0,
            againstVotes: 0,
            canceled: false,
            executed: false
        });

        _proposals[newProposal.id] = newProposal;
        _latestProposalIds[newProposal.proposer] = newProposal.id;

        emit ProposalCreated(
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
        uint proposalId
    ) public {
        require(
            state(proposalId) == ProposalState.Succeeded,
            "Swipe Voting::queue: proposal can only be queued if it is succeeded"
        );

        Proposal storage proposal = _proposals[proposalId];
        uint eta = add256(block.timestamp, _timelock.delay());
        for (uint i = 0; i < proposal.targets.length; i++) {
            _queueOrRevert(proposal.targets[i], proposal.values[i], proposal.signatures[i], proposal.calldatas[i], eta);
        }
        proposal.eta = eta;

        emit ProposalQueued(
            proposalId,
            eta
        );
    }

    function _queueOrRevert(
        address target,
        uint value,
        string memory signature,
        bytes memory data,
        uint eta
    ) internal {
        require(
            !_timelock.queuedTransactions(keccak256(abi.encode(target, value, signature, data, eta))),
            "Swipe Voting::_queueOrRevert: proposal action already queued at eta"
        );

        _timelock.queueTransaction(target, value, signature, data, eta);
    }

    function execute(
        uint proposalId
    ) public payable {
        require(
            state(proposalId) == ProposalState.Queued,
            "Swipe Voting::execute: proposal can only be executed if it is queued"
        );

        Proposal storage proposal = _proposals[proposalId];
        proposal.executed = true;
        for (uint i = 0; i < proposal.targets.length; i++) {
            _timelock.executeTransaction.value(
                proposal.values[i]
            )(proposal.targets[i], proposal.values[i], proposal.signatures[i], proposal.calldatas[i], proposal.eta);
        }

        emit ProposalExecuted(proposalId);
    }

    function cancel(
        uint proposalId
    ) public {
        ProposalState state = state(proposalId);

        require(
            state != ProposalState.Executed,
            "Swipe Voting::cancel: cannot cancel executed proposal"
        );

        Proposal storage proposal = _proposals[proposalId];

        require(
            msg.sender == _guardian || _swipe.getPriorVotes(proposal.proposer, sub256(block.number, 1)) < proposalThreshold(),
            "Swipe Voting::cancel: proposer above threshold"
        );

        proposal.canceled = true;
        for (uint i = 0; i < proposal.targets.length; i++) {
            _timelock.cancelTransaction(
                proposal.targets[i],
                proposal.values[i],
                proposal.signatures[i],
                proposal.calldatas[i],
                proposal.eta
            );
        }

        emit ProposalCanceled(
            proposalId
        );
    }

    function getActions(
        uint proposalId
    ) public view returns (address[] memory targets, uint[] memory values, string[] memory signatures, bytes[] memory calldatas) {
        Proposal storage p = _proposals[proposalId];
        return (p.targets, p.values, p.signatures, p.calldatas);
    }

    function getReceipt(
        uint proposalId,
        address voter
    ) public view returns (Receipt memory) {
        return _proposals[proposalId].receipts[voter];
    }

    function state(
        uint proposalId
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
        } else if (proposal.forVotes <= proposal.againstVotes || proposal.forVotes < quorumVotes()) {
            return ProposalState.Defeated;
        } else if (proposal.eta == 0) {
            return ProposalState.Succeeded;
        } else if (proposal.executed) {
            return ProposalState.Executed;
        } else if (block.timestamp >= add256(proposal.eta, _timelock.GRACE_PERIOD())) {
            return ProposalState.Expired;
        } else {
            return ProposalState.Queued;
        }
    }

    function castVote(
        uint proposalId,
        bool support
    ) public {
        return _castVote(msg.sender, proposalId, support);
    }

    function castVoteBySig(
        uint proposalId,
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

        return _castVote(signatory, proposalId, support);
    }

    function _castVote(
        address voter,
        uint proposalId,
        bool support
    ) internal {
        require(
            state(proposalId) == ProposalState.Active,
            "Swipe Voting::_castVote: voting is closed"
        );

        Proposal storage proposal = _proposals[proposalId];
        Receipt storage receipt = proposal.receipts[voter];
        
        require(
            receipt.hasVoted == false,
            "Swipe Voting::_castVote: voter already voted"
        );
        
        uint96 votes = _swipe.getPriorVotes(voter, proposal.startBlock);

        if (support) {
            proposal.forVotes = add256(proposal.forVotes, votes);
        } else {
            proposal.againstVotes = add256(proposal.againstVotes, votes);
        }

        receipt.hasVoted = true;
        receipt.support = support;
        receipt.votes = votes;

        emit VoteCast(
            voter,
            proposalId,
            support,
            votes
        );
    }

    function __acceptAdmin() public {
        require(
            msg.sender == _guardian,
            "Swipe Voting::__acceptAdmin: sender must be Swipe _guardian"
        );

        _timelock.acceptAdmin();
    }

    function __abdicate() public {
        require(
            msg.sender == _guardian,
            "Swipe Voting::__abdicate: sender must be Swipe _guardian"
        );

        _guardian = address(0);
    }

    function __queueSetTimelockPendingAdmin(
        address newPendingAdmin,
        uint eta
    ) public {
        require(
            msg.sender == _guardian,
            "Swipe Voting::__queueSetTimelockPendingAdmin: sender must be Swipe _guardian"
        );

        _timelock.queueTransaction(address(_timelock), 0, "setPendingAdmin(address)", abi.encode(newPendingAdmin), eta);
    }

    function __executeSetTimelockPendingAdmin(
        address newPendingAdmin,
        uint eta
    ) public {
        require(
            msg.sender == _guardian,
            "Swipe Voting::__executeSetTimelockPendingAdmin: sender must be Swipe _guardian"
        );
        _timelock.executeTransaction(address(_timelock), 0, "setPendingAdmin(address)", abi.encode(newPendingAdmin), eta);
    }

    function add256(uint256 a, uint256 b) internal pure returns (uint) {
        uint c = a + b;
        require(c >= a, "addition overflow");
        return c;
    }

    function sub256(uint256 a, uint256 b) internal pure returns (uint) {
        require(b <= a, "subtraction underflow");
        return a - b;
    }

    function getChainId() internal pure returns (uint) {
        uint chainId;
        assembly {
            chainId := chainid()
        }
        return chainId;
    }
}
