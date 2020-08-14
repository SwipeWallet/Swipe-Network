pragma solidity ^0.5.0;

interface IStaking {
    function _stakedMap(address account) external view returns (uint256);
}