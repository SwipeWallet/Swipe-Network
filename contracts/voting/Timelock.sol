pragma solidity ^0.5.16;

import "../SafeMath.sol";
import "./TimelockStorage.sol";
import "./TimelockEvent.sol";

/// @title Voting Timelock Contract
contract Timelock is TimelockStorage, TimelockEvent {
    using SafeMath for uint;
    function initialize(
        address admin,
        uint delay
    ) external {
        require(
            !_initialized,
            "Contract has been already initialized"
        );
        require(
            delay >= MINIMUM_DELAY,
            "Timelock::constructor: Delay must exceed minimum delay."
        );
        require(
            delay <= MAXIMUM_DELAY,
            "Timelock::setDelay: Delay must not exceed maximum delay."
        );

        _admin = admin;
        _delay = delay;

        _initialized = true;

        emit Initialize(
            _admin,
            _delay
        );
    }

    function() external payable { }

    function setDelay(uint delay) public {
        require(msg.sender == _admin, "Timelock::setDelay: Call must come from Timelock.");
        require(delay >= MINIMUM_DELAY, "Timelock::setDelay: Delay must exceed minimum delay.");
        require(delay <= MAXIMUM_DELAY, "Timelock::setDelay: Delay must not exceed maximum delay.");
        _delay = delay;

        emit NewDelay(_delay);
    }

    function acceptAdmin() public {
        require(msg.sender == _pendingAdmin, "Timelock::acceptAdmin: Call must come from pendingAdmin.");
        _admin = msg.sender;
        _pendingAdmin = address(0);

        emit NewAdmin(_admin);
    }

    function setPendingAdmin(address pendingAdmin) public {
        require(msg.sender == address(this), "Timelock::setPendingAdmin: Call must come from Timelock.");
        _pendingAdmin = pendingAdmin;

        emit NewPendingAdmin(_pendingAdmin);
    }

    function queueTransaction(address target, uint value, string memory signature, bytes memory data, uint eta) public returns (bytes32) {
        require(msg.sender == _admin, "Timelock::queueTransaction: Call must come from admin.");
        // require(eta >= getBlockTimestamp().add(_delay), "Timelock::queueTransaction: Estimated execution block must satisfy delay.");

        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        _queuedTransactions[txHash] = true;

        emit QueueTransaction(txHash, target, value, signature, data, eta);
        return txHash;
    }

    function cancelTransaction(address target, uint value, string memory signature, bytes memory data, uint eta) public {
        require(msg.sender == _admin, "Timelock::cancelTransaction: Call must come from admin.");

        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        _queuedTransactions[txHash] = false;

        emit CancelTransaction(txHash, target, value, signature, data, eta);
    }

    function executeTransaction(address target, uint value, string memory signature, bytes memory data, uint eta) public payable returns (bytes memory) {
        require(msg.sender == _admin, "Timelock::executeTransaction: Call must come from admin.");

        bytes32 txHash = keccak256(abi.encode(target, value, signature, data, eta));
        require(_queuedTransactions[txHash], "Timelock::executeTransaction: Transaction hasn't been queued.");
        require(getBlockTimestamp() >= eta, "Timelock::executeTransaction: Transaction hasn't surpassed time lock.");
        require(getBlockTimestamp() <= eta.add(GRACE_PERIOD), "Timelock::executeTransaction: Transaction is stale.");

        _queuedTransactions[txHash] = false;

        bytes memory callData;

        if (bytes(signature).length == 0) {
            callData = data;
        } else {
            callData = abi.encodePacked(bytes4(keccak256(bytes(signature))), data);
        }

        // solium-disable-next-line security/no-call-value
        (bool success, bytes memory returnData) = target.call.value(value)(callData);
        require(success, "Timelock::executeTransaction: Transaction execution reverted.");

        emit ExecuteTransaction(txHash, target, value, signature, data, eta);

        return returnData;
    }

    function getBlockTimestamp() internal view returns (uint) {
        // solium-disable-next-line security/no-block-members
        return block.timestamp;
    }
}