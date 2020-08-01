require('dotenv').config()
const {use, expect} = require('chai')
const {MockProvider, deployContract, solidity} = require('ethereum-waffle')
const ethers = require('ethers')

use(solidity)

const getCalldata = require('./helpers/getCalldata')

const LOCALSXPTOKEN = require("../build/LocalSXPToken");
const REGISTRY = require('../build/Registry')
const STAKING = require('../build/Staking')

describe('Tests', () => {
    const [walletOwner, walletNewOwner, walletRewardProvider, walletNewRewardProvider, tokenHolder] = new MockProvider({ total_accounts: 5 }).getWallets()
    let localSxpToken
    let registry
    let staking

    beforeEach(async () => {
        localSxpToken = await deployContract(tokenHolder, LOCALSXPTOKEN, [])
        registry = await deployContract(walletOwner, REGISTRY, [])
        staking = await deployContract(walletOwner, STAKING, [])
    })

    describe('Settings', () => {
        beforeEach(async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletOwner.address, localSxpToken.address, walletRewardProvider.address])
            await registry.setImplementationAndCall(staking.address, calldata)
        })

        it('Get mininum stake amount', async () => {
            console.log(calldata);
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementation._minimumStakeAmount()).to.be.equal('1000000000000000000000')
        })

        it('Set mininum stake amount', async () => {
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            await implementation.setMinimumStakeAmount('2000000000000000000000')
            expect(await implementation._minimumStakeAmount()).to.be.equal('2000000000000000000000')
        })

        it('Get reward provider', async () => {
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementation._rewardProvider()).to.be.equal(walletRewardProvider.address)
        })
        
        it('Set reward provider', async () => {
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            await implementation.setRewardProvider(walletNewRewardProvider.address)
            expect(await implementation._rewardProvider()).to.be.equal(walletNewRewardProvider.address)
        })

        it('Set reward provider by wrong owner', async () => {
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletNewOwner)
            await expect(implementation.setRewardProvider(walletNewRewardProvider.address)).to.be.reverted
        })

        it('Get reward policy', async () => {
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementation._rewardCycle()).to.be.equal('86400')
            expect(await implementation._rewardAmount()).to.be.equal('40000000000000000000000')
        })

        it('Set reward policy by wrong provider', async () => {
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            await expect(implementation.setRewardPolicy('604800', '50000000000000000000000')).to.be.reverted
        })

        it('Set reward policy', async () => {
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletRewardProvider)
            await implementation.setRewardPolicy('604800', '50000000000000000000000')
            expect(await implementation._rewardCycle()).to.be.equal('604800')
            expect(await implementation._rewardAmount()).to.be.equal('50000000000000000000000')
        })
    })

    describe('Reward Pool', () => {
        beforeEach(async () => {
            const calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletOwner.address, localSxpToken.address, walletRewardProvider.address])
            await registry.setImplementationAndCall(staking.address, calldata)
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
})