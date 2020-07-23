pragma solidity ^0.5.16;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./ERC20Token.sol";

/// @title Staking Contract
/// @author growlot (@growlot)
contract Staking is Storage {
    /// events
    event Stake(
        address indexed depositor,
        uint256 indexed amount
    );

    event Claim(
        address indexed toAddress,
        uint256 indexed amount
    );

    event Withdraw(
        address indexed toAddress,
        uint256 indexed amount
    );

    event RewardProviderUpdate(
        address indexed prevValue,
        address indexed newValue
    );

    event RewardPolicyUpdate(
        uint256 indexed oldCycle,
        uint256 indexed oldAmount,
        uint256 indexed newCycle,
        uint256 indexed newAmount,
        uint256 indexed newTimeStamp,
    );

    event DepositRewardPool(
        address indexed toAddress,
        uint256 indexed amount
    );

    event WithdrawRewardPool(
        address indexed toAddress,
        uint256 indexed amount
    );

    event ApproveClaim(
        address indexed toAddress,
        uint256 indexed amount
        uint256 indexed nonce
    );

    constructor(
        address tokenAddress
        address rewardProvider,
    ) public {
        _tokenAddress = tokenAddress;
        _rewardProvider = rewardProvider;
    }

    /********************
     * STANDARD ACTIONS *
     ********************/
    /**
    * @dev stake a specific amount
    * @param amount the amount to be staked
    * for demo purposes, not requiring user to actually send in tokens right now
    */
    function stake(uint256 amount) external returns(bool) {
        require(
            amount >= _minimumStakeAmount,
            "Too small amount"
        );
        require(
            ERC20Token(_tokenAddress).transferFrom(
                msg.sender,
                address(this),
                amount
            ), "Stake failed"
        );

        emit Stake(
            msg.sender,
            amount
        );

        if (_stakeMap[msg.sender].amount == 0){
            _stakeMap[msg.sender].amount = _amount;
        } else {
            _stakeMap[msg.sender].amount = _stakeMap[msg.sender].amount.add(amount);
        }
        _totalStaked = _totalStaked.add(amount);

        return true;
    }

    /**
    * @dev claim reward
    */
    function claim(uint256 nonce) public returns (bool) {
        uint256 amount = _approvedClaimMap[msg.sender][nonce];

        require(amount > 0, "Invalid amount");

        require(
            ERC20Token(_tokenAddress).transfer(
                msg.sender,
                amount
            ), "Claim failed");

        emit Claim(
            msg.sender,
            amount
        );

        return true;
    }

    /**
    * @dev withdraw of stake
    */
    function withdraw(uint256 amount)  external returns(bool) {
        require(_stakeMap[msg.sender].amount >= amount, "Exceeded amount");

        require(
            ERC20Token(_tokenAddress).transfer(
                msg.sender,
                amount
            ), "Withdraw failed");

        emit Withdraw(
            msg.sender,
            amount
        );

        _totalStaked = _totalStaked.sub(amount);
        _stakeMap[msg.sender].amount = _stakeMap[msg.sender].amount.sub(amount);

        return true;
    }

    /*****************
     * ADMIN ACTIONS *
     *****************/

    /**
     * @notice Updates the Reward Provider address, the only address other than the
     * owner that can provide reward.
     * @param newRewardProvider The address of the new Reward Provider
     */
    function setRewardProvider(address newRewardProvider) external {
        require(
            msg.sender == _owner,
            "Only the owner can set the reward provider address"
        );
        address oldValue = _rewardProvider;
        _rewardProvider = newRewardProvider;

        emit RewardProviderUpdate(oldValue, _rewardProvider);
    }

    /**
     * @notice Updates the reward policy, the only address other than the
     * owner that can provide reward.
     * @param newRewardCycle New reward cycle
     * @param newRewardAmount New reward amount a cycle
     */
    function setRewardPolicy(uint256 newRewardCycle, uint256 newRewardAmount) public returns (uint256) {
        require(
            msg.sender == _owner,
            "Only the owner can set the reward policy"
        );
        _prevRewardCycle = _rewardCycle;
        _prevReward = _rewardAmount;
        _prevRewardCycleTimestamp = _rewardCycleTimestamp;
        _rewardCycle = newRewardCycle;
        _rewardAmount = newRewardAmount;
        _rewardCycleTimestamp = block.timestamp;

        emit RewardPolicyUpdate(_prevRewardCycle, _prevReward, _rewardCycle, _rewardAmount, _rewardCycleTimestamp);

        return _rewardCycleTimestamp;
    }

    /**
     * @notice Reserve reward pool.
     * @param newRewardCycle New reward cycle
     * @param newRewardAmount New reward amount a cycle
     */
    function depositRewardPool(uint256 amount) public returns (uint256) {
        require(
            msg.sender == _rewardProvider,
            "Only the reword provider can deposit"
        );
        require(
            ERC20Token(_tokenAddress).transferFrom(
                msg.sender,
                address(this),
                amount
            ), "Deposit reward failed"
        );

        _rewardPool = _rewardPool.add(amount);

        emit DepositRewardPool(
            msg.sender,
            amount
        );

        return _rewardPool;
    }

    /**
    * @dev withdraw of reward pool
    */
    function withdrawRewardPool(uint256 amount)  external returns(bool) {
        require(
            msg.sender == _rewardProvider,
            "Only the reword provider can withdraw"
        );

        require(_rewardPool >= amount, "Exceeded amount");

        require(
            ERC20Token(_tokenAddress).transfer(
                msg.sender,
                amount
            ), "Withdraw failed");

        emit WithdrawRewardPool(
            msg.sender,
            amount
        );

        _rewardPool = _rewardPool.sub(amount);

        return true;
    }

    /**
    * @dev Approve claim reward
    */
    function approveClaim(uint256 toAddress, uint256 amount, uint256 nonce) public returns (bool) {
        require(
            msg.sender == _rewardProvider,
            "Only the reword provider can approve"
        );

        _approvedClaimMap[toAddress][nonce] = amount;

        emit ApproveClaim(
            msg.sender,
            amount,
            nonce
        );

        return true;
    }
}