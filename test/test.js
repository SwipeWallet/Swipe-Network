require('dotenv').config()
const {use, expect} = require('chai')
const {MockProvider, deployContract, solidity} = require('ethereum-waffle')
const ethers = require('ethers')

const {
    encodeParameters,
    keccak256,
    etherUnsigned
} = require('./utils/ETH');

use(solidity)

const getCalldata = require('./helpers/getCalldata')

const LOCALSXPTOKEN = require("../build/LocalSXPToken");
const REGISTRY = require('../build/Registry')
const STAKING = require('../build/Staking')
const STAKINGV2 = require('../build/StakingV2')
const TIMELOCK = require('../build/Timelock');

describe('Tests', () => {
    const [walletOwner, walletNewOwner, walletRewardProvider, walletNewRewardProvider, tokenHolder, walletAdmin, walletPendingAdmin, walletTarget] = new MockProvider({ total_accounts: 6 }).getWallets()
    let localSxpToken
    let registry
    let staking

    let timelock
    let value = etherUnsigned(0);
    let data = encodeParameters(['uint256'], [etherUnsigned(7 * 24 * 60 * 60)]);
    let eta;
    let queuedTxHash;
    let signature = 'setDelay(uint256)';

    beforeEach(async () => {
        localSxpToken = await deployContract(tokenHolder, LOCALSXPTOKEN, [])
        registry = await deployContract(walletOwner, REGISTRY, [])
        staking = await deployContract(walletOwner, STAKING, [])
        timelock = await deployContract(walletAdmin, TIMELOCK, [])
    })

    describe('Settings', () => {
        beforeEach(async () => {
            //console.log(walletOwner.address, localSxpToken.address, walletRewardProvider.address);
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletOwner.address, localSxpToken.address, walletRewardProvider.address])
            await registry.setImplementationAndCall(staking.address, calldata)
        })

        it('Get mininum stake amount', async () => {
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementation._minimumStakeAmount()).to.be.equal('1000000000000000000000')
        })

        it('Set mininum stake amount by wrong owner or reward provider', async () => {
            const newAmount = '2000000000000000000000'
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletNewOwner)
            await expect(implementation.setMinimumStakeAmount(newAmount)).to.be.reverted
        })

        it('Set mininum stake amount by owner', async () => {
            const newAmount = '2000000000000000000000'
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            await expect(implementation.setMinimumStakeAmount(newAmount)).to.emit(implementation, 'MinimumStakeAmountUpdate').withArgs('1000000000000000000000', newAmount)
            expect(await implementation._minimumStakeAmount()).to.be.equal(newAmount)
        })

        it('Set mininum stake amount by reward provider', async () => {
            const newAmount = '2000000000000000000000'
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletRewardProvider)
            await expect(implementation.setMinimumStakeAmount(newAmount)).to.emit(implementation, 'MinimumStakeAmountUpdate').withArgs('1000000000000000000000', newAmount)
            expect(await implementation._minimumStakeAmount()).to.be.equal(newAmount)
        })

        it('Get reward provider', async () => {
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementation._rewardProvider()).to.be.equal(walletRewardProvider.address)
        })
        
        it('Set reward provider by wrong owner', async () => {
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletNewOwner)
            await expect(implementation.setRewardProvider(walletNewRewardProvider.address)).to.be.reverted
        })

        it('Set reward provider', async () => {
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            await expect(implementation.setRewardProvider(walletNewRewardProvider.address)).to.emit(implementation, 'RewardProviderUpdate').withArgs(walletRewardProvider.address, walletNewRewardProvider.address)
            expect(await implementation._rewardProvider()).to.be.equal(walletNewRewardProvider.address)
        })

        it('Get reward policy', async () => {
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementation._rewardCycle()).to.be.equal('86400')
            expect(await implementation._rewardAmount()).to.be.equal('40000000000000000000000')
        })

        it('Set reward policy by wrong reward provider', async () => {
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            await expect(implementation.setRewardPolicy('604800', '50000000000000000000000')).to.be.reverted
        })

        it('Set reward policy', async () => {
            const newCycle = '604800'
            const newAmount = '50000000000000000000000'
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletRewardProvider)
            // await expect(implementation.setRewardPolicy(newCycle, newAmount)).to.emit(implementation, 'RewardProviderUpdate').withArgs('86400', '40000000000000000000000', newCycle, newAmount, timestamp)
            await implementation.setRewardPolicy(newCycle, newAmount)
            expect(await implementation._rewardCycle()).to.be.equal('604800')
            expect(await implementation._rewardAmount()).to.be.equal('50000000000000000000000')
        })
    })

    describe('Reward Pool', () => {
        beforeEach(async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletOwner.address, localSxpToken.address, walletRewardProvider.address])
            await registry.setImplementationAndCall(staking.address, calldata)
        })

        it('Deposit SXP by wrong reward provider', async () => {
            const amount = '1000000000000000000000'
            await localSxpToken.transfer(walletOwner.address, amount)
            await localSxpToken.connect(walletOwner).approve(registry.address, amount)
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            const beforeBalance = await localSxpToken.balanceOf(walletOwner.address)
            expect(beforeBalance).to.be.equal(amount)
            await expect(implementation.depositRewardPool(amount)).to.be.reverted
            const afterBalance = await localSxpToken.balanceOf(walletOwner.address)
            expect(afterBalance).to.be.equal(amount)
        })

        it('Deposit SXP', async () => {
            const amount = '1000000000000000000000'
            await localSxpToken.transfer(walletRewardProvider.address, amount)
            await localSxpToken.connect(walletRewardProvider).approve(registry.address, amount)
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletRewardProvider)
            const beforeRewardPoolAmount = await implementation._rewardPoolAmount()
            expect(beforeRewardPoolAmount).to.be.equal('0')
            await expect(implementation.depositRewardPool(amount)).to.emit(implementation, 'DepositRewardPool').withArgs(walletRewardProvider.address, amount)
            const afterBalance = await localSxpToken.balanceOf(registry.address)
            expect(afterBalance).to.be.equal(amount)
            const afterRewardPoolAmount = await implementation._rewardPoolAmount()
            expect(afterRewardPoolAmount).to.be.equal(amount)
        })

        it('Withdraw SXP by wrong reward provider', async () => {
            const depositAmount = '1000000000000000000000'
            await localSxpToken.transfer(walletRewardProvider.address, depositAmount)
            await localSxpToken.connect(walletRewardProvider).approve(registry.address, depositAmount)
            const implementationWithRewardProvider = new ethers.Contract(registry.address, STAKING.interface, walletRewardProvider)
            await implementationWithRewardProvider.depositRewardPool(depositAmount)

            const amount = '300000000000000000000'
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            const beforeBalance = await localSxpToken.balanceOf(registry.address)
            expect(beforeBalance).to.be.equal(depositAmount)
            await expect(implementation.withdrawRewardPool(amount)).to.be.reverted
            const afterBalance = await localSxpToken.balanceOf(registry.address)
            expect(afterBalance).to.be.equal(depositAmount)
            expect(await implementation._rewardPoolAmount()).to.be.equal(depositAmount)
        })

        it('Withdraw SXP', async () => {
            const depositAmount = '1000000000000000000000'
            await localSxpToken.transfer(walletRewardProvider.address, depositAmount)
            await localSxpToken.connect(walletRewardProvider).approve(registry.address, depositAmount)
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletRewardProvider)
            await implementation.depositRewardPool(depositAmount)

            const amount = '300000000000000000000'
            const remainAmount = '700000000000000000000'
            const beforeRewardProviderBalance = await localSxpToken.balanceOf(walletRewardProvider.address)
            expect(beforeRewardProviderBalance).to.be.equal('0')
            await expect(implementation.withdrawRewardPool(amount)).to.emit(implementation, 'WithdrawRewardPool').withArgs(walletRewardProvider.address, amount)
            const afterBalance = await localSxpToken.balanceOf(registry.address)
            expect(afterBalance).to.be.equal(remainAmount)
            const afterRewardPoolAmount = await implementation._rewardPoolAmount()
            expect(afterRewardPoolAmount).to.be.equal(remainAmount)
            const afterRewardProviderBalance = await localSxpToken.balanceOf(walletRewardProvider.address)
            expect(afterRewardProviderBalance).to.be.equal(beforeRewardProviderBalance.add(amount))
        })
    })

    describe('Stake', () => {
        beforeEach(async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletOwner.address, localSxpToken.address, walletRewardProvider.address])
            await registry.setImplementationAndCall(staking.address, calldata)
        })

        it('Stake SXP', async () => {
            const amount = '1000000000000000000000'
            await localSxpToken.approve(registry.address, amount)
            const beforeBalance = await localSxpToken.balanceOf(registry.address);
            expect(beforeBalance).to.be.equal('0')
            const implementation = new ethers.Contract(registry.address, STAKING.interface, tokenHolder)
            const beforeTotalStaked = await implementation._totalStaked()
            expect(beforeTotalStaked).to.be.equal('0')
            const beforeStaked = await implementation._stakedMap(tokenHolder.address)
            expect(beforeStaked).to.be.equal('0')
            await expect(implementation.stake(amount)).to.emit(implementation, 'Stake').withArgs(tokenHolder.address, amount)
            const afterBalance = await localSxpToken.balanceOf(registry.address)
            expect(afterBalance).to.be.equal(amount)
            const afterTotalStaked = await implementation._totalStaked()
            expect(afterTotalStaked).to.be.equal(amount)
            const afterStaked = await implementation._stakedMap(tokenHolder.address)
            expect(afterStaked).to.be.equal(amount)
        })

        it('Withdraw SXP by wrong staker', async () => {
            const stakeAmount = '1000000000000000000000'
            await localSxpToken.approve(registry.address, stakeAmount)
            const implementationWithTokenHolder = new ethers.Contract(registry.address, STAKING.interface, tokenHolder)
            await implementationWithTokenHolder.stake(stakeAmount)

            const amount = '300000000000000000000'
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            const beforeWithdrawerBalance = await localSxpToken.balanceOf(walletOwner.address)
            expect(beforeWithdrawerBalance).to.be.equal('0')
            await expect(implementation.withdraw(amount)).to.be.reverted
            const afterBalance = await localSxpToken.balanceOf(registry.address)
            expect(afterBalance).to.be.equal(stakeAmount)
            const afterTotalStaked = await implementation._totalStaked()
            expect(afterTotalStaked).to.be.equal(stakeAmount)
        })

        it('Withdraw SXP', async () => {
            const stakeAmount = '1000000000000000000000'
            await localSxpToken.approve(registry.address, stakeAmount)
            const implementation = new ethers.Contract(registry.address, STAKING.interface, tokenHolder)
            await implementation.stake(stakeAmount)

            const amount = '300000000000000000000'
            const remainAmount = '700000000000000000000'
            const beforeHolderBalance = await localSxpToken.balanceOf(tokenHolder.address)
            await expect(implementation.withdraw(amount)).to.emit(implementation, 'Withdraw').withArgs(tokenHolder.address, amount)
            const afterBalance = await localSxpToken.balanceOf(registry.address)
            expect(afterBalance).to.be.equal(remainAmount)
            const afterTotalStaked = await implementation._totalStaked()
            expect(afterTotalStaked).to.be.equal(remainAmount)
            const afterStaked = await implementation._stakedMap(tokenHolder.address)
            expect(afterStaked).to.be.equal(remainAmount)
            const afterHolderBalance = await localSxpToken.balanceOf(tokenHolder.address)
            expect(afterHolderBalance).to.be.equal(beforeHolderBalance.add(amount))
        })
    })

    describe('Claim Reward', () => {
        beforeEach(async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletOwner.address, localSxpToken.address, walletRewardProvider.address])
            await registry.setImplementationAndCall(staking.address, calldata)

            const amount = '1000000000000000000000'
            await localSxpToken.transfer(walletRewardProvider.address, amount)
            await localSxpToken.connect(walletRewardProvider).approve(registry.address, amount)
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletRewardProvider)
            await implementation.depositRewardPool(amount)
        })

        it('Approve by wrong reward provider', async () => {
            const amount = '300000000000000000000'
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletNewRewardProvider)
            await expect(implementation.approveClaim(tokenHolder.address, amount)).to.be.reverted
        })

        it('Approve', async () => {
            const amount = '300000000000000000000'
            const stillRemainAmount = '1000000000000000000000'
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletRewardProvider)
            const newClaimNonce = (await implementation._claimNonce()).add('1');
            await expect(implementation.approveClaim(tokenHolder.address, amount)).to.emit(implementation, 'ApproveClaim').withArgs(tokenHolder.address, amount, newClaimNonce)
            const afterRewardPoolAmount = await implementation._rewardPoolAmount()
            expect(await implementation._claimNonce()).to.be.equal(newClaimNonce)
            expect(afterRewardPoolAmount).to.be.equal(stillRemainAmount)
        })

        it('Claim SXP by wrong staker', async () => {
            const amount = '300000000000000000000'
            const implementationByRewardProvider = new ethers.Contract(registry.address, STAKING.interface, walletRewardProvider)
            await implementationByRewardProvider.approveClaim(tokenHolder.address, amount)
            const claimNonce = await implementationByRewardProvider._claimNonce()

            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            await expect(implementation.claim(claimNonce)).to.be.reverted
            const afterRewardPoolAmount = await implementation._rewardPoolAmount()
            expect(afterRewardPoolAmount).to.be.equal('1000000000000000000000')
        })

        it('Claim SXP by wrong nonce', async () => {
            const amount = '300000000000000000000'
            const implementationByRewardProvider = new ethers.Contract(registry.address, STAKING.interface, walletRewardProvider)
            const claimNonce = await implementationByRewardProvider._claimNonce()
            await implementationByRewardProvider.approveClaim(tokenHolder.address, amount)

            const implementation = new ethers.Contract(registry.address, STAKING.interface, tokenHolder)
            await expect(implementation.claim(claimNonce)).to.be.reverted
            const afterRewardPoolAmount = await implementation._rewardPoolAmount()
            expect(afterRewardPoolAmount).to.be.equal('1000000000000000000000')
        })

        it('Claim SXP', async () => {
            const amount = '300000000000000000000'
            const remainAmount = '700000000000000000000'
            const implementationByRewardProvider = new ethers.Contract(registry.address, STAKING.interface, walletRewardProvider)
            await implementationByRewardProvider.approveClaim(tokenHolder.address, amount)
            const claimNonce = await implementationByRewardProvider._claimNonce()

            const implementation = new ethers.Contract(registry.address, STAKING.interface, tokenHolder)
            await expect(implementation.claim(claimNonce)).to.emit(implementation, 'Claim').withArgs(tokenHolder.address, amount, claimNonce)
            const afterRewardPoolAmount = await implementation._rewardPoolAmount()
            expect(afterRewardPoolAmount).to.be.equal(remainAmount)
        })
    })

    describe('Ownership', () => {
        it('Get registry owner', async () => {
            expect(await registry.getOwner()).to.eq(walletOwner.address)
        })

        it('Transfer registry ownership to zero address', async () => {
            const zero = ethers.constants.AddressZero
            await expect(registry.transferOwnership(zero)).to.be.reverted
        })

        it('Transfer registry ownership to non-zero address', async () => {
            await registry.transferOwnership(walletNewOwner.address)
            expect(await registry.getOwner()).to.eq(walletNewOwner.address)
        })

        it('Get staking owner', async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletOwner.address, localSxpToken.address, walletRewardProvider.address])
            await registry.setImplementationAndCall(staking.address, calldata)
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementation._owner()).to.be.equal(walletOwner.address)
        })

        it('Transfer staking ownership to another address', async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletOwner.address, localSxpToken.address, walletRewardProvider.address])
            await registry.setImplementationAndCall(staking.address, calldata)
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            await expect(implementation.authorizeOwnershipTransfer(walletNewOwner.address)).to.emit(implementation, 'OwnershipTransferAuthorization').withArgs(walletNewOwner.address)
            expect(await implementation._owner()).to.be.equal(walletOwner.address)
            const implementationWithNewOwner = new ethers.Contract(registry.address, STAKING.interface, walletNewOwner);
            await expect(implementationWithNewOwner.assumeOwnership()).to.emit(implementation, 'OwnerUpdate').withArgs(walletOwner.address, walletNewOwner.address)
            expect(await implementation._owner()).to.be.equal(walletNewOwner.address)
            expect(await implementationWithNewOwner._owner()).to.be.equal(walletNewOwner.address)
        })
    })

    describe('Upgrade', () => {
        let stakingV2

        beforeEach(async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletOwner.address, localSxpToken.address, walletRewardProvider.address])
            await registry.setImplementationAndCall(staking.address, calldata)
            stakingV2 = await deployContract(walletOwner, STAKINGV2, [])
        })

        it('Wrong owner', async () => {
            const registryWithWrongSigner = registry.connect(walletNewOwner);
            await expect(registryWithWrongSigner.setImplementation(stakingV2.address)).to.be.reverted
        })

        it('Old implementaton', async () => {
            expect(await registry.getImplementation()).to.be.equal(staking.address)
            await expect(registry.setImplementation(staking.address)).to.be.reverted
        })

        it('Reinitialize must revert', async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletNewOwner.address, tokenHolder.address, walletNewRewardProvider.address])
            await expect(registry.setImplementationAndCall(stakingV2.address, calldata)).to.be.reverted
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementation._owner()).to.be.equal(walletOwner.address)
            expect(await implementation._tokenAddress()).to.be.equal(localSxpToken.address)
            expect(await implementation._rewardProvider()).to.be.equal(walletRewardProvider.address)
        })

        it('Storage is saved after upgrade', async () => {
            const implementationOld = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementationOld._owner()).to.be.equal(walletOwner.address)
            expect(await implementationOld._tokenAddress()).to.be.equal(localSxpToken.address)

            await registry.setImplementation(stakingV2.address)
            expect(await registry.getImplementation()).to.be.equal(stakingV2.address)
            const implementation = new ethers.Contract(registry.address, STAKINGV2.interface, walletOwner)
            expect(await implementation._owner()).to.be.equal(walletOwner.address)
            expect(await implementation._tokenAddress()).to.be.equal(localSxpToken.address)
        })

        it('Storage with new updates after upgrade', async () => {
            const implementationOld = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementationOld.name()).to.be.equal('Swipe Staking')
            expect(await implementationOld._owner()).to.be.equal(walletOwner.address)
            expect(await implementationOld._tokenAddress()).to.be.equal(localSxpToken.address)

            await registry.setImplementation(stakingV2.address)
            expect(await registry.getImplementation()).to.be.equal(stakingV2.address)

            const implementation = new ethers.Contract(registry.address, STAKINGV2.interface, walletOwner)
            expect(await implementation.name()).to.be.equal('Swipe Staking V2')
            expect(await implementation._owner()).to.be.equal(walletOwner.address)
            expect(await implementation._tokenAddress()).to.be.equal(localSxpToken.address)

            expect(await implementation._upcomingValue()).to.be.equal('0')
            await expect(implementation.upcomingFunction('123456')).to.emit(implementation, 'UpcomingEvent').withArgs('0', '123456')
            expect(await implementation._upcomingValue()).to.be.equal('123456')
        })
    })

    describe('Timelock', () => {
        beforeEach(async () => {
            const delayValue = await timelock._delay();            
            const calldata = getCalldata('initialize', ['address', 'address', 'address', 'uint'], [walletAdmin.address, walletPendingAdmin.address, walletTarget.address, delayValue.toNumber()])
            await registry.setImplementationAndCall(walletAdmin.address, calldata)

            eta = etherUnsigned(100);
            queuedTxHash = keccak256(
                encodeParameters(
                    ['address', 'uint256', 'string', 'bytes', 'uint256'],
                    [walletTarget.address, value, signature, data, eta]
                )
            )
        })

        it('Check admin address', async () => {
            expect (await registry.getImplementation()).to.be.equal(walletAdmin.address);
        })

        it('Get Delay Value', async () => {            
            expect (await timelock._delay()).to.be.equal('0');
        })

        it('Set Delay Value', async() => {
            const newDelayValue = 100000;
            await expect(timelock.setDelay(newDelayValue)).to.be.reverted
        })

        it('Accept Admin', async() => {
            await expect(timelock.acceptAdmin()).to.be.reverted
        })

        it('Set Pending Admin', async() => {
            await expect(timelock.setPendingAdmin(walletPendingAdmin.address)).to.be.reverted
        })

        it('Make Queue Transaction', async() => {
            await expect(await timelock.queueTransaction(walletTarget.address, value, signature, data, eta)).to.be.reverted
        })

        it ('Cancel Transaction', async() => {
            await expect(await timelock.cancelTransaction(walletTarget.address, value, signature, data, eta)).to.be.reverted
        })

        it ('Execute Transaction', async() => {
            await expect(await timelock.executeTransaction(walletTarget.address, value, signature, data, eta)).to.be.reverted
        })
    })
})