pragma solidity ^0.5.0;

interface IVotingTimelock {
    function _delay() external view returns (uint256);
    function _gracePeriod() external view returns (uint256);
    function assumeGuardianship() external;
    function _queuedTransactions(bytes32 txHash) external view returns (bool);
    function queueTransaction(address target, uint256 value, string calldata signature, bytes calldata data, uint256 eta) external returns (bytes32);
    function cancelTransaction(address target, uint256 value, string calldata signature, bytes calldata data, uint256 eta) external;
    function executeTransaction(address target, uint256 value, string calldata signature, bytes calldata data, uint256 eta) external payable returns (bytes memory);
}