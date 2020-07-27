pragma solidity ^0.5.16;

import "openzeppelin-solidity/contracts/math/SafeMath.sol";
import "./ERC20Token.sol";

/// @title Staking Contract
/// @author growlot (@growlot)
contract Staking is Storage {
    /// events
    event Stake(
        address indexed staker,
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

    event MinimumStakeAmountUpdate(
        uint256 indexed oldValue,
        uint256 indexed newValue
    );

    event RewardProviderUpdate(
        address indexed oldValue,
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
        address indexed depositor,
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
     * @notice Stakes the provided amount of SXP from the message sender into this wallet.
     *
     * @param amount The amount to stake
     */
    function stake(uint256 amount) external {
        require(
            amount >= _minimumStakeAmount,
            "Too small amount"
        );

        require(
            ERC20Token(_tokenAddress).transferFrom(
                msg.sender,
                address(this),
                amount
            ),
            "Stake failed"
        );

        emit Stake(
            msg.sender,
            amount
        );

        _stakedMap[msg.sender].amount = _stakedMap[msg.sender].amount.add(amount);
        _totalStaked = _totalStaked.add(amount);
    }

    /**
     * @notice Claims reward of the provided nonce.
     *
     * @param nonce The claim nonce uniquely identifying the authorization to claim
     */
    function claim(uint256 nonce) external {
        uint256 amount = _approvedClaimMap[msg.sender][nonce];

        require(
            amount > 0,
            "Invalid amount"
        );

        require(
            ERC20Token(_tokenAddress).transfer(
                msg.sender,
                amount
            ),
            "Claim failed"
        );

        emit Claim(
            msg.sender,
            amount
        );

        return amount;
    }

    /**
     * @notice Withdraws the provided amount of staked
     *
     * @param amount The amount to withdraw
    */
    function withdraw(uint256 amount) external {
        require(
            _stakedMap[msg.sender].amount >= amount,
            "Exceeded amount"
        );

        require(
            ERC20Token(_tokenAddress).transfer(
                msg.sender,
                amount
            ),
            "Withdraw failed"
        );

        emit Withdraw(
            msg.sender,
            amount
        );

        _totalStaked = _totalStaked.sub(amount);
        _stakedMap[msg.sender].amount = _stakedMap[msg.sender].amount.sub(amount);
    }

    /*****************
     * ADMIN ACTIONS *
     *****************/

    /**
     * @notice Updates the minimum stake amount.
     *
     * @param newMinimumStakeAmount The amount to be allowed as minimum to users
     */
    function setMinimumStakeAmount(uint256 newMinimumStakeAmount) external {
        require(
            msg.sender == _owner || msg.sender == _rewardProvider,
            "Only the owner or reward provider can set the minimum stake amount"
        );

        require(
            newMinimumStakeAmount > 0,
            "Invalid amount"
        );

        uint256 oldValue = _minimumStakeAmount;
        _minimumStakeAmount = newMinimumStakeAmount;

        emit MinimumStakeAmountUpdate(oldValue, _minimumStakeAmount);
    }

    /**
     * @notice Updates the Reward Provider address, the only address that can provide reward.
     *
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
     * @notice Updates the reward policy, the only address that can provide reward.
     *
     * @param newRewardCycle New reward cycle
     * @param newRewardAmount New reward amount a cycle
     */
    function setRewardPolicy(uint256 newRewardCycle, uint256 newRewardAmount) external {
        require(
            msg.sender == _rewardProvider,
            "Only the reward provider can set the reward policy"
        );

        _prevRewardCycle = _rewardCycle;
        _prevRewardAmount = _rewardAmount;
        _prevRewardCycleTimestamp = _rewardCycleTimestamp;
        _rewardCycle = newRewardCycle;
        _rewardAmount = newRewardAmount;
        _rewardCycleTimestamp = block.timestamp;

        emit RewardPolicyUpdate(_prevRewardCycle, _prevRewardAmount, _rewardCycle, _rewardAmount, _rewardCycleTimestamp);
    }

    /**
     * @notice Deposits the provided amount into reward pool.
     *
     * @param amount The amount to deposit into reward pool
     */
    function depositRewardPool(uint256 amount) external {
        require(
            msg.sender == _rewardProvider,
            "Only the reword provider can deposit"
        );

        require(
            ERC20Token(_tokenAddress).transferFrom(
                msg.sender,
                address(this),
                amount
            ),
            "Deposit reward pool failed"
        );

        _rewardPoolAmount = _rewardPoolAmount.add(amount);

        emit DepositRewardPool(
            msg.sender,
            amount
        );
    }

    /**
     * @notice Withdraws the provided amount from reward pool.
     *
     * @param amount The amount to withdraw from reward pool
     */
    function withdrawRewardPool(uint256 amount) external {
        require(
            msg.sender == _rewardProvider,
            "Only the reword provider can withdraw"
        );

        require(
            _rewardPoolAmount >= amount,
            "Exceeded amount"
        );

        require(
            ERC20Token(_tokenAddress).transfer(
                msg.sender,
                amount
            ),
            "Withdraw failed"
        );

        _rewardPoolAmount = _rewardPoolAmount.sub(amount);

        emit WithdrawRewardPool(
            msg.sender,
            amount
        );
    }

    /**
     * @notice Approves the provided address to claim the provided amount.
     *
     * @param toAddress The address can claim reward
     * @param amount The amount to claim
     */
    function approveClaim(uint256 toAddress, uint256 amount) returns(uint256) {
        require(
            msg.sender == _rewardProvider,
            "Only the reword provider can approve"
        );

        _claimNonce = _claimNonce.add(1);
        _approvedClaimMap[toAddress][_claimNonce] = amount;

        emit ApproveClaim(
            toAddress,
            amount,
            _claimNonce
        );
        
        return _claimNonce;
    }
}