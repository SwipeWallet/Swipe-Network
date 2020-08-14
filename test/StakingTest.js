require('dotenv').config()
const {use, expect} = require('chai')
const {MockProvider, deployContract, solidity} = require('ethereum-waffle')
const ethers = require('ethers')

use(solidity)

const getCalldata = require('./helpers/getCalldata')

const LOCALSXPTOKEN = require("../build/LocalSXPToken")
const REGISTRY = require('../build/SwipeRegistry')
const STAKING = require('../build/Staking')
const STAKINGV2 = require('../build/StakingV2')

describe('Staking Tests', () => {
    const [walletOwner, walletNewOwner, walletRewardProvider, walletNewRewardProvider, tokenHolder] = new MockProvider({ total_accounts: 5 }).getWallets()
    let localSxpToken
    let registry
    let staking

    beforeEach(async () => {
        localSxpToken = await deployContract(tokenHolder, LOCALSXPTOKEN, [])
        registry = await deployContract(walletOwner, REGISTRY, ['Swipe Staking Proxy'])
        staking = await deployContract(walletOwner, STAKING, [])
    })

    describe('Brand', () => {
        it('Get registry contract name', async () => {
            expect(await registry.name()).to.eq('Swipe Staking Proxy')
        })

        it('Get staking contract name', async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletOwner.address, localSxpToken.address, walletRewardProvider.address])
            await registry.setImplementationAndCall(staking.address, calldata)
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementation.name()).to.be.equal('Swipe Staking Proxy')
        })
    })

    describe('Settings', () => {
        beforeEach(async () => {
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
            const beforeBalance = await localSxpToken.balanceOf(registry.address)
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
            const newClaimNonce = (await implementation._claimNonce()).add('1')
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

        it('Transfer registry ownership by wrong owner', async () => {
            const registryWithWrongSigner = registry.connect(walletNewOwner)
            await expect(registryWithWrongSigner.authorizeOwnershipTransfer(registryWithWrongSigner.address)).to.be.reverted
            expect(await registry.getOwner()).to.eq(walletOwner.address)
        })

        it('Transfer registry ownership', async () => {
            await registry.authorizeOwnershipTransfer(walletNewOwner.address)
            expect(await registry.getOwner()).to.eq(walletOwner.address)
            expect(await registry.getAuthorizedNewOwner()).to.eq(walletNewOwner.address)
            const registryWithNewOwner = registry.connect(walletNewOwner)
            await registryWithNewOwner.assumeOwnership()
            expect(await registry.getOwner()).to.eq(walletNewOwner.address)
            expect(await registry.getAuthorizedNewOwner()).to.eq(ethers.constants.AddressZero)            
        })

        it('Get staking guardian', async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletOwner.address, localSxpToken.address, walletRewardProvider.address])
            await registry.setImplementationAndCall(staking.address, calldata)
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementation._guardian()).to.be.equal(walletOwner.address)
        })

        it('Transfer staking guardianship to another address', async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletOwner.address, localSxpToken.address, walletRewardProvider.address])
            await registry.setImplementationAndCall(staking.address, calldata)
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            await expect(implementation.authorizeGuardianshipTransfer(walletNewOwner.address)).to.emit(implementation, 'GuardianshipTransferAuthorization').withArgs(walletNewOwner.address)
            expect(await implementation._guardian()).to.be.equal(walletOwner.address)
            const implementationWithNewGuardian = new ethers.Contract(registry.address, STAKING.interface, walletNewOwner)
            await expect(implementationWithNewGuardian.assumeGuardianship()).to.emit(implementation, 'GuardianUpdate').withArgs(walletOwner.address, walletNewOwner.address)
            expect(await implementation._guardian()).to.be.equal(walletNewOwner.address)
            expect(await implementationWithNewGuardian._guardian()).to.be.equal(walletNewOwner.address)
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
            const registryWithWrongSigner = registry.connect(walletNewOwner)
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
            expect(await implementation._guardian()).to.be.equal(walletOwner.address)
            expect(await implementation._tokenAddress()).to.be.equal(localSxpToken.address)
            expect(await implementation._rewardProvider()).to.be.equal(walletRewardProvider.address)
        })

        it('Storage is saved after upgrade', async () => {
            const implementationOld = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementationOld._guardian()).to.be.equal(walletOwner.address)
            expect(await implementationOld._tokenAddress()).to.be.equal(localSxpToken.address)

            await registry.setImplementation(stakingV2.address)
            expect(await registry.getImplementation()).to.be.equal(stakingV2.address)
            const implementation = new ethers.Contract(registry.address, STAKINGV2.interface, walletOwner)
            expect(await implementation._guardian()).to.be.equal(walletOwner.address)
            expect(await implementation._tokenAddress()).to.be.equal(localSxpToken.address)
        })

        it('Storage with new updates after upgrade', async () => {
            const implementationOld = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementationOld._guardian()).to.be.equal(walletOwner.address)
            expect(await implementationOld._tokenAddress()).to.be.equal(localSxpToken.address)

            await registry.setImplementation(stakingV2.address)
            expect(await registry.getImplementation()).to.be.equal(stakingV2.address)

            const implementation = new ethers.Contract(registry.address, STAKINGV2.interface, walletOwner)
            expect(await implementation._guardian()).to.be.equal(walletOwner.address)
            expect(await implementation._tokenAddress()).to.be.equal(localSxpToken.address)

            expect(await implementation._upcomingValue()).to.be.equal('0')
            await expect(implementation.upcomingFunction('123456')).to.emit(implementation, 'UpcomingEvent').withArgs('0', '123456')
            expect(await implementation._upcomingValue()).to.be.equal('123456')
        })
    })
})