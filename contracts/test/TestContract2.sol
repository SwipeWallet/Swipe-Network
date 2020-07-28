pragma solidity ^0.5.0;

/// @title Test 2 Proxy Contract
/// @author growlot (@growlot)
contract TestContract2 {
    /// @notice Initialized flag - indicates that initialization was made once
    bool internal initialized;

    /// @notice Test public address
    address public testAddress;

    /// @notice Test public uint
    uint256 public testUInt;

    /// @notice Test public mapping
    mapping(uint256 => address) public testMapping;

    /// @notice Test public uint16
    uint16 public testUInt16;

    /// @notice Initialize test contract
    /// @param _testUInt Test uint
    function initialize(uint256 _testUInt) external {
        require(!initialized, "043df92601"); // 043df92601 - contract has been already initialized
        testUInt = _testUInt;
        testAddress = msg.sender;
        testMapping[testUInt] = testAddress;
        initialized = true;
    }
}
