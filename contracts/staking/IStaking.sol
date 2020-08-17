pragma solidity ^0.5.0;

interface IStaking {
    function getPriorStakedAmount(address staker, uint256 blockNumber) external view returns (uint256);
}