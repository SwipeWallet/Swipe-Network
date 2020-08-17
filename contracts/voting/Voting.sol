pragma solidity ^0.5.16;
pragma experimental ABIEncoderV2;

import "../SafeMath.sol";
import "./VotingStorage.sol";
import "./IVotingTimelock.sol";
import "../staking/IStaking.sol";
import "./VotingEvent.sol";

/// @title Voting Contract
/// @author blockplus (@blockplus), brightdev33 (@brightdev33)
contract Voting is VotingStorage, VotingEvent {
    using SafeMath for uint256;

    function initialize(
        address timelockAddress,
        address stakingAddress,
        address guardian
    ) external {
        require(
            !_initialized,
            "Contract has been already initialized"
        );

        _timelock = IVotingTimelock(timelockAddress);
        _staking = IStaking(stakingAddress);
        _guardian = guardian;

        _initialized = true;

        emit Initialize(
            timelockAddress,
            stakingAddress,
            _guardian
        );
    }

    /**
     * @notice Authorizes the transfer of guardianship from guardian to the provided address.
     * NOTE: No transfer will occur unless authorizedAddress calls assumeGuardianship( ).
     * This authorization may be removed by another call to this function authorizing
     * the null address.
     *
     * @param authorizedAddress The address authorized to become the new guardian.
     */
    function authorizeGuardianshipTransfer(address authorizedAddress) external {
        require(
            msg.sender == _guardian,
            "Only the guardian can authorize a new address to become guardian"
        );

        _authorizedNewGuardian = authorizedAddress;

        emit GuardianshipTransferAuthorization(_authorizedNewGuardian);
    }

    /**
     * @notice Transfers guardianship of this contract to the _authorizedNewGuardian.
     */
    function assumeGuardianship() external {
        require(
            msg.sender == _authorizedNewGuardian,
            "Only the authorized new guardian can accept guardianship"
        );

        address oldValue = _guardian;
        _guardian = _authorizedNewGuardian;
        _authorizedNewGuardian = address(0);

        emit GuardianUpdate(
            oldValue,
            _guardian
        );
    }

    /// @notice The number of votes in support of a proposal required in order for a quorum to be reached and for a vote to succeed
    function setQuorumVotes(uint256 quorumVotes) external {
        require(
            msg.sender == _guardian,
            "Only the guardian can set quorum votes"
        );

        uint256 oldValue = _quorumVotes;
        _quorumVotes = quorumVotes; 

        emit QuorumVotesUpdate(
            oldValue,
            _quorumVotes
        );
    }

    /// @notice The number of votes required in order for a voter to become a proposer
    function setProposalThreshold(uint256 proposalThreshold) external {
        require(
            msg.sender == _guardian,
            "Only the guardian can set proposal threshold"
        );

        uint256 oldValue = _proposalThreshold;
        _proposalThreshold = proposalThreshold; 

        emit ProposalThresholdUpdate(
            oldValue,
            _proposalThreshold
        );
    }

    /// @notice The maximum number of actions that can be included in a proposal
    function setProposalMaxOperations(uint256 proposalMaxOperations) external {
        require(
            msg.sender == _guardian,
            "Only the guardian can set proposal max operations"
        );

        uint256 oldValue = _proposalMaxOperations;
        _proposalMaxOperations = proposalMaxOperations; 

        emit ProposalMaxOperationsUpdate(
            oldValue,
            _proposalMaxOperations
        );
    }

    /// @notice The delay before voting on a proposal may take place, once proposed
    function setVotingDelay(uint256 votingDelay) external {
        require(
            msg.sender == _guardian,
            "Only the guardian can set voting delay"
        );

        uint256 oldValue = _votingDelay;
        _votingDelay = votingDelay; 

        emit VotingDelayUpdate(
            oldValue,
            _votingDelay
        );
    }

    /// @notice The duration of voting on a proposal, in blocks
    function setVotingPeriod(uint256 votingPeriod) external {
        require(
            msg.sender == _guardian,
            "Only the guardian can set voting period"
        );

        uint256 oldValue = _votingPeriod;
        _votingPeriod = votingPeriod; 

        emit VotingPeriodUpdate(
            oldValue,
            _votingPeriod
        );
    }

    function internalGetVotingPower(address voter) internal view returns (uint256 votingPower) {
        votingPower = _staking._stakedMap(voter);
    }

    function propose(
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas,
        string memory description
    ) public returns (uint256) {
        require(
            internalGetVotingPower(msg.sender) > _proposalThreshold,
            "The proposer votes below proposal threshold"
        );

        require(
            targets.length == values.length && targets.length == signatures.length && targets.length == calldatas.length,
            "Operation parameters mismatch"
        );

        require(
            targets.length <= _proposalMaxOperations,
            "Too many operations"
        );

        uint256 latestProposalId = _latestProposalIds[msg.sender];
        if (latestProposalId != 0) {
            ProposalState proposersLatestProposalState = state(latestProposalId);
            
            require(
                proposersLatestProposalState != ProposalState.Active,
                "One live proposal per proposer, found an already active proposal"
            );
            
            require(
                proposersLatestProposalState != ProposalState.Pending,
                "One live proposal per proposer, found an already pending proposal"
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
            executed: false,
            voterCount: 0
        });

        _proposals[newProposal.id] = newProposal;
        _latestProposalIds[newProposal.proposer] = newProposal.id;

        emit ProposalCreation(
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

    function queue(uint256 proposalId) external {
        require(
            internalUpdateState(proposalId) == ProposalState.Succeeded,
            "Proposal can only be queued if it is succeeded"
        );

        Proposal storage proposal = _proposals[proposalId];
        uint256 eta = block.timestamp.add(_timelock._delay());
        for (uint i = 0; i < proposal.targets.length; i++) {
            internalQueueOrRevert(
                proposal.targets[i],
                proposal.values[i],
                proposal.signatures[i],
                proposal.calldatas[i],
                eta
            );
        }
        proposal.eta = eta;

        emit ProposalQueue(proposalId, eta);
    }

    function internalQueueOrRevert(
        address target,
        uint256 value,
        string memory signature,
        bytes memory data,
        uint256 eta
    ) internal {
        require(
            !_timelock._queuedTransactions(keccak256(abi.encode(target, value, signature, data, eta))),
            "The proposal operation already queued at eta"
        );

        _timelock.queueTransaction(
            target,
            value,
            signature,
            data,
            eta
        );
    }

    function execute(uint256 proposalId) external payable {
        require(
            state(proposalId) == ProposalState.Queued,
            "Proposal can only be executed if it is queued"
        );

        Proposal storage proposal = _proposals[proposalId];
        proposal.executed = true;
        for (uint256 i = 0; i < proposal.targets.length; i++) {
            _timelock.executeTransaction.value(
                proposal.values[i]
            )(
                proposal.targets[i],
                proposal.values[i],
                proposal.signatures[i],
                proposal.calldatas[i],
                proposal.eta
            );
        }

        emit ProposalExecution(proposalId);
    }

    function cancel(uint256 proposalId) external {
        Proposal storage proposal = _proposals[proposalId];

        require(
            msg.sender == _guardian || internalGetVotingPower(proposal.proposer) < _proposalThreshold,
            "The proposer does not meet threshold"
        );

        require(
            internalUpdateState(proposalId) != ProposalState.Executed,
            "Cannot cancel executed proposal"
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

        emit ProposalCancel(proposalId);
    }

    function getProposal(uint256 proposalId) external view returns (
        uint256 id,
        address proposer,
        uint256 eta,
        uint256 startBlock,
        uint256 endBlock,
        uint256 upVotes,
        uint256 downVotes,
        bool canceled,
        bool executed
    ) {
        Proposal storage proposal = _proposals[proposalId];

        (uint256 priorUpVotes, uint256 priorDownVotes) = getVotes(proposalId);

        return (
            proposal.id,
            proposal.proposer,
            proposal.eta,
            proposal.startBlock,
            proposal.endBlock,
            priorUpVotes,
            priorDownVotes,
            proposal.canceled,
            proposal.executed
        );
    }

    function getOperations(uint256 proposalId) external view returns (
        address[] memory targets,
        uint256[] memory values,
        string[] memory signatures,
        bytes[] memory calldatas
    ) {
        Proposal storage proposal = _proposals[proposalId];
        
        return (
            proposal.targets,
            proposal.values,
            proposal.signatures,
            proposal.calldatas
        );
    }

    function getVoters(uint256 proposalId) external view returns (uint256 voterCount, address[] memory voters) {
        Proposal storage proposal = _proposals[proposalId];

        voterCount = proposal.voterCount;
        voters = new address[](proposal.voterCount);
        for (uint i = 0; i < proposal.voterCount; i++) {
            voters[i] = proposal.voters[i];
        }
    }

    function getReceipt(uint256 proposalId, address voter) external view returns (Receipt memory) {
        Receipt memory receipt = _proposals[proposalId].receipts[voter];
        receipt.votes = internalGetVotingPower(voter);
        
        return receipt;
    }

    function getVotes(uint256 proposalId) public view returns (uint256 upVotes, uint256 downVotes) {
        for (uint i = 0; i < _proposals[proposalId].voterCount; i++) {
            address voter = _proposals[proposalId].voters[i];
            Receipt storage receipt = _proposals[proposalId].receipts[voter];
            if (receipt.support) {
                upVotes = upVotes.add(internalGetVotingPower(voter));
            } else {
                downVotes = downVotes.add(internalGetVotingPower(voter));
            }
        }
    }

    function internalUpdateState(uint256 proposalId) internal returns (ProposalState) {
        require(
            _proposalCount >= proposalId && proposalId > 0,
            "Invalid proposal id"
        );

        Proposal storage proposal = _proposals[proposalId];

        uint256 upVotes;
        uint256 downVotes;
        for (uint i = 0; i < proposal.voterCount; i++) {
            address voter = proposal.voters[i];
            Receipt storage receipt = proposal.receipts[voter];
            uint256 votingPower = internalGetVotingPower(voter);
            receipt.votes = votingPower;
            if (receipt.support) {
                upVotes = upVotes.add(votingPower);
            } else {
                downVotes = downVotes.add(votingPower);
            }
        }

        proposal.upVotes = upVotes;
        proposal.downVotes = downVotes;

        return internalState(proposalId, upVotes, downVotes);
    }

    function state(uint256 proposalId) public view returns (ProposalState) {
        return internalState(proposalId, 0, 0);
    }

    function internalState(uint256 proposalId, uint256 upVotes, uint256 downVotes) internal view returns (ProposalState) {
        require(
            _proposalCount >= proposalId && proposalId > 0,
            "Invalid proposal id"
        );

        Proposal storage proposal = _proposals[proposalId];
        if (proposal.canceled) {
            return ProposalState.Canceled;
        } else if (block.number <= proposal.startBlock) {
            return ProposalState.Pending;
        } else if (block.number <= proposal.endBlock) {
            return ProposalState.Active;
        } else {
            if (upVotes == 0 && downVotes == 0) {
                (upVotes, downVotes) = getVotes(proposalId);
            }
            if (upVotes <= downVotes || upVotes < _quorumVotes) {
                return ProposalState.Defeated;
            } else if (proposal.eta == 0) {
                return ProposalState.Succeeded;
            } else if (proposal.executed) {
                return ProposalState.Executed;
            } else if (block.timestamp >= proposal.eta.add(_timelock._gracePeriod())) {
                return ProposalState.Expired;
            } else {
                return ProposalState.Queued;
            }
        }
    }

    function castVote(uint256 proposalId, bool support) external {
        return internalCastVote(msg.sender, proposalId, support);
    }

    function castVoteBySig(
        uint256 proposalId,
        bool support,
        uint8 v,
        bytes32 r,
        bytes32 s
    ) external {
        bytes32 domainSeparator = keccak256(abi.encode(_domainTypeHash, keccak256(bytes(name)), internalGetChainId(), address(this)));
        bytes32 structHash = keccak256(abi.encode(_ballotTypeHash, proposalId, support));
        bytes32 digest = keccak256(abi.encodePacked("\x19\x01", domainSeparator, structHash));
        address signatory = ecrecover(digest, v, r, s);
        
        require(
            signatory != address(0),
            "Invalid signature"
        );

        return internalCastVote(
            signatory,
            proposalId,
            support
        );
    }

    function internalCastVote(
        address voter,
        uint256 proposalId,
        bool support
    ) internal {
        require(
            state(proposalId) == ProposalState.Active,
            "Voting is closed"
        );

        Proposal storage proposal = _proposals[proposalId];
        Receipt storage receipt = proposal.receipts[voter];
        
        require(
            receipt.hasVoted == false,
            "The voter already voted"
        );
        
        uint256 votes = internalGetVotingPower(voter);

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

    function assumeTimelockGuardianship() external {
        require(
            msg.sender == _guardian,
            "Only the guardian can assume timelock guardianship"
        );

        _timelock.assumeGuardianship();
    }

    function queueAuthorizeGuardianshipTransfer(address authorizedAddress, uint256 eta) external {
        require(
            msg.sender == _guardian,
            "Only the guardian can queue timelock guardianship transfer transaction"
        );

        _timelock.queueTransaction(
            address(_timelock),
            0,
            "authorizeGuardianshipTransfer(address)",
            abi.encode(authorizedAddress),
            eta
        );
    }

    function executeAuthorizeGuardianshipTransfer(address authorizedAddress, uint256 eta) external {
        require(
            msg.sender == _guardian,
            "Only the guardian can execute timelock guardianship transfer transaction"
        );

        _timelock.executeTransaction(
            address(_timelock),
            0,
            "authorizeGuardianshipTransfer(address)",
            abi.encode(authorizedAddress),
            eta
        );
    }

    function internalGetChainId() internal pure returns (uint256 chainId) {
        assembly {
            chainId := chainid()
        }
    }
}
