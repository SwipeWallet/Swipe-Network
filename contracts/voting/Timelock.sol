pragma solidity ^0.5.16;

import "../SafeMath.sol";
import "./TimelockStorage.sol";
import "./TimelockEvent.sol";

/// @title Voting Timelock Contract
contract Timelock is TimelockStorage, TimelockEvent {
}