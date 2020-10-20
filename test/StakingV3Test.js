require('dotenv').config()
const {use, expect} = require('chai')
const {MockProvider, deployContract, solidity} = require('ethereum-waffle')
const ethers = require('ethers')

use(solidity)

const getCalldata = require('./helpers/getCalldata')
const mineBlocks = require('./helpers/mineBlocks')

const LOCALSXPTOKEN = require("../build/LocalSXPToken")
const PROXY = require('../build/StakingProxy')
const STAKINGV2 = require('../build/StakingV2')
const STAKINGV3 = require('../build/StakingV3')

describe('StakingV3 Tests', () => {
    const provider = new MockProvider({ total_accounts: 5 })
    const [walletGuardian, walletNewGuardian, walletRewardProvider, walletNewRewardProvider, tokenHolder] = provider.getWallets()
    let localSxpToken
    let proxy
    let stakingV2
    let stakingV3

    beforeEach(async () => {
        localSxpToken = await deployContract(tokenHolder, LOCALSXPTOKEN, [])
        proxy = await deployContract(walletGuardian, PROXY, [])
        stakingV2 = await deployContract(walletGuardian, STAKINGV2, [])
        stakingV3 = await deployContract(walletGuardian, STAKINGV3, [])
    })

    describe('Upgrade', () => {
        beforeEach(async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletGuardian.address, localSxpToken.address, walletRewardProvider.address])
            await proxy.setImplementationAndCall(stakingV2.address, calldata)
        })

        it('Wrong owner', async () => {
            const proxyWithWrongSigner = proxy.connect(walletNewGuardian)
            await expect(proxyWithWrongSigner.setImplementation(stakingV3.address)).to.be.reverted
        })

        it('Old implementaton', async () => {
            expect(await proxy.getImplementation()).to.be.equal(stakingV2.address)
            await expect(proxy.setImplementation(stakingV2.address)).to.be.reverted
        })

        it('Reinitialize must revert', async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletNewGuardian.address, tokenHolder.address, walletNewRewardProvider.address])
            await expect(proxy.setImplementationAndCall(stakingV3.address, calldata)).to.be.reverted
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            expect(await implementation._guardian()).to.be.equal(walletGuardian.address)
            expect(await implementation._sxpTokenAddress()).to.be.equal(localSxpToken.address)
            expect(await implementation._rewardProvider()).to.be.equal(walletRewardProvider.address)
        })

        it('Storage is saved after upgrade', async () => {
            const implementationOld = new ethers.Contract(proxy.address, STAKINGV2.interface, walletGuardian)
            expect(await implementationOld._guardian()).to.be.equal(walletGuardian.address)
            expect(await implementationOld._sxpTokenAddress()).to.be.equal(localSxpToken.address)

            await proxy.setImplementation(stakingV3.address)
            expect(await proxy.getImplementation()).to.be.equal(stakingV3.address)
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            expect(await implementation._guardian()).to.be.equal(walletGuardian.address)
            expect(await implementation._sxpTokenAddress()).to.be.equal(localSxpToken.address)
            expect(await implementation._rewardPendingPeriod()).to.be.equal('86400')
        })

        it('Storage with new updates after upgrade', async () => {
            const implementationOld = new ethers.Contract(proxy.address, STAKINGV2.interface, walletGuardian)
            expect(await implementationOld._guardian()).to.be.equal(walletGuardian.address)
            expect(await implementationOld._sxpTokenAddress()).to.be.equal(localSxpToken.address)

            await proxy.setImplementation(stakingV3.address)
            expect(await proxy.getImplementation()).to.be.equal(stakingV3.address)

            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            expect(await implementation._guardian()).to.be.equal(walletGuardian.address)
            expect(await implementation._sxpTokenAddress()).to.be.equal(localSxpToken.address)

            expect(await implementation._rewardPendingPeriod()).to.be.equal('86400')
            await implementation.setRewardPolicy('3600', '50000000000000000000000', '604800')
            expect(await implementation._rewardPendingPeriod()).to.be.equal('604800')

            expect(await implementation._minimumWithdrawableAge()).to.be.equal('0')
            await implementation.setMinimumWithdrawableAge('7200')
            expect(await implementation._minimumWithdrawableAge()).to.be.equal('7200')
        })
    })

    describe('Brand', () => {
        it('Get stakingV3 proxy contract name', async () => {
            expect(await proxy.name()).to.eq('Swipe Staking Proxy')
        })

        it('Get stakingV3 contract name', async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletGuardian.address, localSxpToken.address, walletRewardProvider.address])
            await proxy.setImplementationAndCall(stakingV3.address, calldata)
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            expect(await implementation.name()).to.be.equal('Swipe Staking Proxy')
        })
    })

    describe('Settings', () => {
        beforeEach(async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletGuardian.address, localSxpToken.address, walletRewardProvider.address])
            await proxy.setImplementationAndCall(stakingV3.address, calldata)
        })

        it('Get mininum stake amount', async () => {
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            expect(await implementation._minimumStakeAmount()).to.be.equal('1000000000000000000000')
        })

        it('Set mininum stake amount by wrong guardian', async () => {
            const newAmount = '2000000000000000000000'
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletNewGuardian)
            await expect(implementation.setMinimumStakeAmount(newAmount)).to.be.reverted
        })

        it('Set mininum stake amount by guardian', async () => {
            const newAmount = '2000000000000000000000'
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            await expect(implementation.setMinimumStakeAmount(newAmount)).to.emit(implementation, 'MinimumStakeAmountUpdate').withArgs('1000000000000000000000', newAmount)
            expect(await implementation._minimumStakeAmount()).to.be.equal(newAmount)
        })

        it('Get reward provider', async () => {
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            expect(await implementation._rewardProvider()).to.be.equal(walletRewardProvider.address)
        })
        
        it('Set reward provider by wrong guardian', async () => {
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletNewGuardian)
            await expect(implementation.setRewardProvider(walletNewRewardProvider.address)).to.be.reverted
        })

        it('Set reward provider', async () => {
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            await expect(implementation.setRewardProvider(walletNewRewardProvider.address)).to.emit(implementation, 'RewardProviderUpdate').withArgs(walletRewardProvider.address, walletNewRewardProvider.address)
            expect(await implementation._rewardProvider()).to.be.equal(walletNewRewardProvider.address)
        })

        it('Get reward policy', async () => {
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            expect(await implementation._rewardCycle()).to.be.equal('86400')
            expect(await implementation._rewardAmount()).to.be.equal('40000000000000000000000')
            expect(await implementation._rewardPendingPeriod()).to.be.equal('86400')
        })

        it('Set reward policy by wrong guardian', async () => {
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletRewardProvider)
            await expect(implementation.setRewardPolicy('3600', '50000000000000000000000', '604800')).to.be.reverted
        })

        it('Set reward policy', async () => {
            const newCycle = '3600'
            const newAmount = '50000000000000000000000'
            const newPendingPeriod = '604800'
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            await implementation.setRewardPolicy(newCycle, newAmount, newPendingPeriod)
            expect(await implementation._rewardCycle()).to.be.equal('3600')
            expect(await implementation._rewardAmount()).to.be.equal('50000000000000000000000')
            expect(await implementation._rewardPendingPeriod()).to.be.equal('604800')
        })

        it('Set mininum withdrawable age by wrong guardian', async () => {
            const newAge = '7200'
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletNewGuardian)
            await expect(implementation.setMinimumWithdrawableAge(newAge)).to.be.reverted
        })

        it('Set mininum withdrawable age with wrong value', async () => {
            const newAge = '40321'
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            await expect(implementation.setMinimumWithdrawableAge(newAge)).to.be.reverted
        })

        it('Set mininum withdrawable age by guardian', async () => {
            const newAge = '7200'
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            await expect(implementation.setMinimumWithdrawableAge(newAge)).to.emit(implementation, 'MinimumWithdrawableAgeUpdate').withArgs('0', newAge)
            expect(await implementation._minimumWithdrawableAge()).to.be.equal(newAge)
        })
    })

    describe('Reward Pool', () => {
        beforeEach(async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletGuardian.address, localSxpToken.address, walletRewardProvider.address])
            await proxy.setImplementationAndCall(stakingV3.address, calldata)
        })

        it('Deposit SXP by wrong reward provider', async () => {
            const amount = '1000000000000000000000'
            await localSxpToken.transfer(walletGuardian.address, amount)
            await localSxpToken.connect(walletGuardian).approve(proxy.address, amount)
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            const beforeBalance = await localSxpToken.balanceOf(walletGuardian.address)
            expect(beforeBalance).to.be.equal(amount)
            await expect(implementation.depositRewardPool(amount)).to.be.reverted
            const afterBalance = await localSxpToken.balanceOf(walletGuardian.address)
            expect(afterBalance).to.be.equal(amount)
        })

        it('Deposit SXP', async () => {
            const amount = '1000000000000000000000'
            await localSxpToken.transfer(walletRewardProvider.address, amount)
            await localSxpToken.connect(walletRewardProvider).approve(proxy.address, amount)
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletRewardProvider)
            const beforeRewardPoolAmount = await implementation._rewardPoolAmount()
            expect(beforeRewardPoolAmount).to.be.equal('0')
            await expect(implementation.depositRewardPool(amount)).to.emit(implementation, 'DepositRewardPool').withArgs(walletRewardProvider.address, amount)
            const afterBalance = await localSxpToken.balanceOf(proxy.address)
            expect(afterBalance).to.be.equal(amount)
            const afterRewardPoolAmount = await implementation._rewardPoolAmount()
            expect(afterRewardPoolAmount).to.be.equal(amount)
        })

        it('Withdraw SXP by wrong reward provider', async () => {
            const depositAmount = '1000000000000000000000'
            await localSxpToken.transfer(walletRewardProvider.address, depositAmount)
            await localSxpToken.connect(walletRewardProvider).approve(proxy.address, depositAmount)
            const implementationWithRewardProvider = new ethers.Contract(proxy.address, STAKINGV3.interface, walletRewardProvider)
            await implementationWithRewardProvider.depositRewardPool(depositAmount)

            const amount = '300000000000000000000'
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            const beforeBalance = await localSxpToken.balanceOf(proxy.address)
            expect(beforeBalance).to.be.equal(depositAmount)
            await expect(implementation.withdrawRewardPool(amount)).to.be.reverted
            const afterBalance = await localSxpToken.balanceOf(proxy.address)
            expect(afterBalance).to.be.equal(depositAmount)
            expect(await implementation._rewardPoolAmount()).to.be.equal(depositAmount)
        })

        it('Withdraw SXP', async () => {
            const depositAmount = '1000000000000000000000'
            await localSxpToken.transfer(walletRewardProvider.address, depositAmount)
            await localSxpToken.connect(walletRewardProvider).approve(proxy.address, depositAmount)
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletRewardProvider)
            await implementation.depositRewardPool(depositAmount)

            const amount = '300000000000000000000'
            const remainAmount = '700000000000000000000'
            const beforeRewardProviderBalance = await localSxpToken.balanceOf(walletRewardProvider.address)
            expect(beforeRewardProviderBalance).to.be.equal('0')
            await expect(implementation.withdrawRewardPool(amount)).to.emit(implementation, 'WithdrawRewardPool').withArgs(walletRewardProvider.address, amount)
            const afterBalance = await localSxpToken.balanceOf(proxy.address)
            expect(afterBalance).to.be.equal(remainAmount)
            const afterRewardPoolAmount = await implementation._rewardPoolAmount()
            expect(afterRewardPoolAmount).to.be.equal(remainAmount)
            const afterRewardProviderBalance = await localSxpToken.balanceOf(walletRewardProvider.address)
            expect(afterRewardProviderBalance).to.be.equal(beforeRewardProviderBalance.add(amount))
        })
    })

    describe('Stake', () => {
        beforeEach(async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletGuardian.address, localSxpToken.address, walletRewardProvider.address])
            await proxy.setImplementationAndCall(stakingV3.address, calldata)
        })

        it('Stake SXP', async () => {
            const amount = '1000000000000000000000'
            await localSxpToken.approve(proxy.address, amount)
            const beforeBalance = await localSxpToken.balanceOf(proxy.address)
            expect(beforeBalance).to.be.equal('0')
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, tokenHolder)
            const beforeTotalStaked = await implementation._totalStaked()
            expect(beforeTotalStaked).to.be.equal('0')
            const beforeStaked = await implementation.getStakedAmount(tokenHolder.address)
            expect(beforeStaked).to.be.equal('0')
            await expect(implementation.stake(amount)).to.emit(implementation, 'Stake').withArgs(tokenHolder.address, amount)
            const afterBalance = await localSxpToken.balanceOf(proxy.address)
            expect(afterBalance).to.be.equal(amount)
            const afterTotalStaked = await implementation._totalStaked()
            expect(afterTotalStaked).to.be.equal(amount)
            const afterStaked = await implementation.getStakedAmount(tokenHolder.address)
            expect(afterStaked).to.be.equal(amount)
        })

        it('Withdraw SXP by wrong staker', async () => {
            const stakeAmount = '1000000000000000000000'
            await localSxpToken.approve(proxy.address, stakeAmount)
            const implementationWithTokenHolder = new ethers.Contract(proxy.address, STAKINGV3.interface, tokenHolder)
            await implementationWithTokenHolder.stake(stakeAmount)

            const amount = '300000000000000000000'
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            const beforeWithdrawerBalance = await localSxpToken.balanceOf(walletGuardian.address)
            expect(beforeWithdrawerBalance).to.be.equal('0')
            await expect(implementation.withdraw(amount)).to.be.reverted
            const afterBalance = await localSxpToken.balanceOf(proxy.address)
            expect(afterBalance).to.be.equal(stakeAmount)
            const afterTotalStaked = await implementation._totalStaked()
            expect(afterTotalStaked).to.be.equal(stakeAmount)
        })

        it('Withdraw SXP', async () => {
            const stakeAmount = '1000000000000000000000'
            await localSxpToken.approve(proxy.address, stakeAmount)
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, tokenHolder)
            await implementation.stake(stakeAmount)

            const amount = '300000000000000000000'
            const remainAmount = '700000000000000000000'
            const beforeHolderBalance = await localSxpToken.balanceOf(tokenHolder.address)
            await expect(implementation.withdraw(amount)).to.emit(implementation, 'Withdraw').withArgs(tokenHolder.address, amount)
            const afterBalance = await localSxpToken.balanceOf(proxy.address)
            expect(afterBalance).to.be.equal(remainAmount)
            const afterTotalStaked = await implementation._totalStaked()
            expect(afterTotalStaked).to.be.equal(remainAmount)
            const afterStaked = await implementation.getStakedAmount(tokenHolder.address)
            expect(afterStaked).to.be.equal(remainAmount)
            const afterHolderBalance = await localSxpToken.balanceOf(tokenHolder.address)
            expect(afterHolderBalance).to.be.equal(beforeHolderBalance.add(amount))
        })

        it('Withdraw SXP before withdrawable age', async () => {
            const stakeAmount = '1000000000000000000000'

            const implementationByGuardian = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            await implementationByGuardian.setMinimumWithdrawableAge('2')

            await localSxpToken.approve(proxy.address, stakeAmount)
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, tokenHolder)
            await implementation.stake(stakeAmount)
            await localSxpToken.approve(proxy.address, stakeAmount)
            await implementation.stake(stakeAmount) // double stake

            const amount = '2000000000000000000000'
            await expect(implementation.withdraw(amount)).to.be.reverted
        })

        it('Withdraw SXP after withdrawable age', async () => {
            const stakeAmount = '1000000000000000000000'

            const implementationByGuardian = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            await implementationByGuardian.setMinimumWithdrawableAge('2')

            await localSxpToken.approve(proxy.address, stakeAmount)
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, tokenHolder)
            await implementation.stake(stakeAmount)
            await localSxpToken.approve(proxy.address, stakeAmount)
            await implementation.stake(stakeAmount) // double stake

            await mineBlocks(provider.provider, 1)

            const amount = '2000000000000000000000'
            const remainAmount = '0'
            const beforeHolderBalance = await localSxpToken.balanceOf(tokenHolder.address)
            await expect(implementation.withdraw(amount)).to.emit(implementation, 'Withdraw').withArgs(tokenHolder.address, amount)
            const afterBalance = await localSxpToken.balanceOf(proxy.address)
            expect(afterBalance).to.be.equal(remainAmount)
            const afterTotalStaked = await implementation._totalStaked()
            expect(afterTotalStaked).to.be.equal(remainAmount)
            const afterStaked = await implementation.getStakedAmount(tokenHolder.address)
            expect(afterStaked).to.be.equal(remainAmount)
            const afterHolderBalance = await localSxpToken.balanceOf(tokenHolder.address)
            expect(afterHolderBalance).to.be.equal(beforeHolderBalance.add(amount))
        })

        it('Get prior staked amount', async () => {
            const amount = '1000000000000000000000'
            const amount2 = '1200000000000000000000'
            const amount3 = '200000000000000000000'
            const amountToStake = '2200000000000000000000'
            const stakedAmountAfterWithdraw = '2000000000000000000000'

            await localSxpToken.approve(proxy.address, amountToStake)
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, tokenHolder)
            const beforeBlockNumber = await provider.getBlockNumber()

            await implementation.stake(amount)
            const afterBlockNumber = await provider.getBlockNumber()

            await implementation.stake(amount2)
            const afterBlockNumber2 = await provider.getBlockNumber()
            
            await implementation.withdraw(amount3)
            const afterBlockNumber3 = await provider.getBlockNumber()
            
            const beforePriorStaked = await implementation.getPriorStakedAmount(tokenHolder.address, beforeBlockNumber)
            expect(beforePriorStaked).to.be.equal('0')
            const afterPriorStaked = await implementation.getPriorStakedAmount(tokenHolder.address, afterBlockNumber)
            expect(afterPriorStaked).to.be.equal(amount)
            const afterPriorStaked2 = await implementation.getPriorStakedAmount(tokenHolder.address, afterBlockNumber2)
            expect(afterPriorStaked2).to.be.equal(amountToStake)
            const afterPriorStaked3 = await implementation.getPriorStakedAmount(tokenHolder.address, afterBlockNumber3)
            expect(afterPriorStaked3).to.be.equal(stakedAmountAfterWithdraw)
            const afterTotalStaked = await implementation._totalStaked()
            expect(afterTotalStaked).to.be.equal(afterPriorStaked3)
        })

        it('Get withdrawable staked amount', async () => {
            const amount = '1000000000000000000000'
            const amount2 = '1200000000000000000000'
            const amountToStake = '2200000000000000000000'

            const implementationByGuardian = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            await implementationByGuardian.setMinimumWithdrawableAge('1')

            await localSxpToken.approve(proxy.address, amountToStake)
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, tokenHolder)

            await implementation.stake(amount)
            const withdrawableAmount1 = await implementation.getWithdrawableStakedAmount(tokenHolder.address)
            expect(withdrawableAmount1).to.be.equal('0')

            await implementation.stake(amount2)
            const withdrawableAmount2 = await implementation.getWithdrawableStakedAmount(tokenHolder.address)
            expect(withdrawableAmount2).to.be.equal(amount)

            await mineBlocks(provider.provider, 1)
            const withdrawableAmount3 = await implementation.getWithdrawableStakedAmount(tokenHolder.address)
            expect(withdrawableAmount3).to.be.equal(amountToStake)
        })
    })

    describe('Claim Reward', () => {
        beforeEach(async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletGuardian.address, localSxpToken.address, walletRewardProvider.address])
            await proxy.setImplementationAndCall(stakingV3.address, calldata)

            const amount = '1000000000000000000000'
            await localSxpToken.transfer(walletRewardProvider.address, amount)
            await localSxpToken.connect(walletRewardProvider).approve(proxy.address, amount)
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletRewardProvider)
            await implementation.depositRewardPool(amount)
        })

        it('Approve by wrong reward provider', async () => {
            const amount = '300000000000000000000'
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletNewRewardProvider)
            await expect(implementation.approveClaim(tokenHolder.address, amount)).to.be.reverted
        })

        it('Approve', async () => {
            const amount = '300000000000000000000'
            const stillRemainAmount = '1000000000000000000000'
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletRewardProvider)
            const newClaimNonce = (await implementation._claimNonce()).add('1')
            await expect(implementation.approveClaim(tokenHolder.address, amount)).to.emit(implementation, 'ApproveClaim').withArgs(tokenHolder.address, amount, newClaimNonce)
            const afterRewardPoolAmount = await implementation._rewardPoolAmount()
            expect(await implementation._claimNonce()).to.be.equal(newClaimNonce)
            expect(afterRewardPoolAmount).to.be.equal(stillRemainAmount)
        })

        it('Claim SXP by wrong staker', async () => {
            const amount = '300000000000000000000'
            const implementationByRewardProvider = new ethers.Contract(proxy.address, STAKINGV3.interface, walletRewardProvider)
            await implementationByRewardProvider.approveClaim(tokenHolder.address, amount)
            const claimNonce = await implementationByRewardProvider._claimNonce()

            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            await expect(implementation.claim(claimNonce)).to.be.reverted
            const afterRewardPoolAmount = await implementation._rewardPoolAmount()
            expect(afterRewardPoolAmount).to.be.equal('1000000000000000000000')
        })

        it('Claim SXP by wrong nonce', async () => {
            const amount = '300000000000000000000'
            const implementationByRewardProvider = new ethers.Contract(proxy.address, STAKINGV3.interface, walletRewardProvider)
            const claimNonce = await implementationByRewardProvider._claimNonce()
            await implementationByRewardProvider.approveClaim(tokenHolder.address, amount)

            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, tokenHolder)
            await expect(implementation.claim(claimNonce)).to.be.reverted
            const afterRewardPoolAmount = await implementation._rewardPoolAmount()
            expect(afterRewardPoolAmount).to.be.equal('1000000000000000000000')
        })

        it('Claim SXP', async () => {
            const amount = '300000000000000000000'
            const remainAmount = '700000000000000000000'
            const implementationByRewardProvider = new ethers.Contract(proxy.address, STAKINGV3.interface, walletRewardProvider)
            await implementationByRewardProvider.approveClaim(tokenHolder.address, amount)
            const claimNonce = await implementationByRewardProvider._claimNonce()

            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, tokenHolder)
            await expect(implementation.claim(claimNonce)).to.emit(implementation, 'Claim').withArgs(tokenHolder.address, amount, claimNonce)
            const afterRewardPoolAmount = await implementation._rewardPoolAmount()
            expect(afterRewardPoolAmount).to.be.equal(remainAmount)
        })
    })

    describe('Ownership', () => {
        it('Get proxy owner', async () => {
            expect(await proxy.getOwner()).to.eq(walletGuardian.address)
        })

        it('Transfer proxy ownership by wrong owner', async () => {
            const proxyWithWrongSigner = proxy.connect(walletNewGuardian)
            await expect(proxyWithWrongSigner.authorizeOwnershipTransfer(proxyWithWrongSigner.address)).to.be.reverted
            expect(await proxy.getOwner()).to.eq(walletGuardian.address)
        })

        it('Transfer proxy ownership', async () => {
            await proxy.authorizeOwnershipTransfer(walletNewGuardian.address)
            expect(await proxy.getOwner()).to.eq(walletGuardian.address)
            expect(await proxy.getAuthorizedNewOwner()).to.eq(walletNewGuardian.address)
            const proxyWithNewGuardian = proxy.connect(walletNewGuardian)
            await proxyWithNewGuardian.assumeOwnership()
            expect(await proxy.getOwner()).to.eq(walletNewGuardian.address)
            expect(await proxy.getAuthorizedNewOwner()).to.eq(ethers.constants.AddressZero)            
        })

        it('Get stakingV3 guardian', async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletGuardian.address, localSxpToken.address, walletRewardProvider.address])
            await proxy.setImplementationAndCall(stakingV3.address, calldata)
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            expect(await implementation._guardian()).to.be.equal(walletGuardian.address)
        })

        it('Transfer stakingV3 guardianship to another address', async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletGuardian.address, localSxpToken.address, walletRewardProvider.address])
            await proxy.setImplementationAndCall(stakingV3.address, calldata)
            const implementation = new ethers.Contract(proxy.address, STAKINGV3.interface, walletGuardian)
            await expect(implementation.authorizeGuardianshipTransfer(walletNewGuardian.address)).to.emit(implementation, 'GuardianshipTransferAuthorization').withArgs(walletNewGuardian.address)
            expect(await implementation._guardian()).to.be.equal(walletGuardian.address)
            const implementationWithNewGuardian = new ethers.Contract(proxy.address, STAKINGV3.interface, walletNewGuardian)
            await expect(implementationWithNewGuardian.assumeGuardianship()).to.emit(implementation, 'GuardianUpdate').withArgs(walletGuardian.address, walletNewGuardian.address)
            expect(await implementation._guardian()).to.be.equal(walletNewGuardian.address)
            expect(await implementationWithNewGuardian._guardian()).to.be.equal(walletNewGuardian.address)
        })
    })
})