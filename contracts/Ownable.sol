pragma solidity ^0.5.0;


/// @title Ownable Contract
/// @author growlot (@growlot)
contract Ownable {
    /// @notice Storage position of the owner address
    /// @dev The address of the current owner is stored in a
    /// constant pseudorandom slot of the contract storage
    /// (slot number obtained as a result of hashing a certain message),
    /// the probability of rewriting which is almost zero
    bytes32 private constant _ownerPosition = keccak256("owner");

    /// @notice Contract constructor
    /// @dev Sets msg sender address as owner address
    constructor() public {
        setOwner(msg.sender);
    }

    /// @notice Check that requires msg.sender to be the current owner
    function requireOwner() internal view {
        require(msg.sender == getOwner(), "Sender must be owner");
    }

    /// @notice Returns contract owner address
    function getOwner() public view returns (address owner) {
        bytes32 position = _ownerPosition;
        assembly {
            owner := sload(position)
        }
    }

    /// @notice Sets new owner address
    /// @param newOwner New owner address
    function setOwner(address newOwner) internal {
        bytes32 position = _ownerPosition;
        assembly {
            sstore(position, newOwner)
        }
    }

    /// @notice Transfers the control of the contract to new owner
    /// @dev msg.sender must be the current owner
    /// @param newOwner New owner address
    function transferOwnership(address newOwner) external {
        requireOwner();
        require(newOwner != address(0), "New owner cant be zero address");
        setOwner(newOwner);
    }
}
