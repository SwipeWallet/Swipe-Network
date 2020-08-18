pragma solidity ^0.5.16;

import "../SafeMath.sol";
import "../NamedContract.sol";
import "./VotingTimelockStorage.sol";
import "./VotingTimelockEvent.sol";

/// @title Voting Timelock Contract
/// @author blockplus (@blockplus), brightdev33 (@brightdev33)
contract VotingTimelock is NamedContract, VotingTimelockStorage, VotingTimelockEvent {
    using SafeMath for uint256;

    constructor() public {
        setContractName('Swipe Voting Timelock');
    }

    function initialize(
        address guardian,
        uint256 delay
    ) external {
        require(
            !_initialized,
            "Contract has been already initialized"
        );
        require(
            _minimumDelay <= delay && delay <= _maximumDelay,
            "Invalid delay"
        );

        _guardian = guardian;
        _delay = delay;

        _initialized = true;

        emit Initialize(
            _guardian,
            _delay
        );
    }

    function() external payable { }

    function setDelay(uint256 delay) external {
        require(
            msg.sender == _guardian,
            "Only the guardian can set the delay"
        );

        require(
            _minimumDelay <= delay && delay <= _maximumDelay,
            "Invalid delay"
        );

        uint256 oldValue = _delay;
        _delay = delay;

        emit DelayUpdate(
            oldValue,
            _delay
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

    function queueTransaction(
        address target,
        uint256 value,
        string calldata signature,
        bytes calldata data,
        uint256 eta
    ) external returns (bytes32) {
        require(
            msg.sender == _guardian,
            "Only the guardian can queue transaction"
        );

        require(
            eta >= getBlockTimestamp().add(_delay),
            "Estimated execution block must satisfy delay"
        );

        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        _queuedTransactions[txHash] = true;

        emit TransactionQueue(
            txHash,
            target,
            value,
            signature,
            data,
            eta
        );

        return txHash;
    }

    function cancelTransaction(
        address target,
        uint256 value,
        string calldata signature,
        bytes calldata data,
        uint256 eta
    ) external {
        require(
            msg.sender == _guardian,
            "Only the guardian can cancel transaction"
        );

        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        _queuedTransactions[txHash] = false;

        emit TransactionCancel(
            txHash,
            target,
            value,
            signature,
            data,
            eta
        );
    }

    function executeTransaction(
        address target,
        uint256 value,
        string calldata signature,
        bytes calldata data,
        uint256 eta
    ) external payable returns (bytes memory) {
        require(
            msg.sender == _guardian,
            "Only the guardian can execute transaction"
        );

        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        
        require(
            _queuedTransactions[txHash],
            "The transaction hasn't been queued"
        );
        
        require(
            getBlockTimestamp() >= eta,
            "The transaction hasn't surpassed time lock"
        );

        require(
            getBlockTimestamp() <= eta.add(_gracePeriod),
            "The transaction is stale"
        );

        _queuedTransactions[txHash] = false;

        bytes memory callData;

        if (bytes(signature).length == 0) {
            callData = data;
        } else {
            callData = abi.encodePacked(bytes4(keccak256(bytes(signature))), data);
        }

        // solium-disable-next-line security/no-call-value
        (bool success, bytes memory returnData) = target.call.value(value)(callData);
        
        require(
            success,
            "The transaction execution reverted"
        );

        emit TransactionExecution(
            txHash,
            target,
            value,
            signature,
            data,
            eta
        );

        return returnData;
    }

    function getBlockTimestamp() internal view returns (uint256) {
        // solium-disable-next-line security/no-block-members
        return block.timestamp;
    }
}