require('dotenv').config()
const {use, expect} = require('chai')
const {createMockProvider, getWallets, deployContract, solidity} = require('ethereum-waffle')
const ethers = require('ethers')

use(solidity)

const getCalldata = require('./helpers/getCalldata')

const LOCALSXPTOKEN = require("../build/LocalSXPToken");
const REGISTRY = require('../build/Registry')
const STAKING = require('../build/Staking')

describe('Tests', () => {
    const [walletOwner, walletNewOwner, walletRewardProvider, walletNewRewardProvider] = getWallets(createMockProvider())
    let localSxpToken
    let registry
    let staking

    beforeEach(async () => {
        localSxpToken = await deployContract(walletOwner, LOCALSXPTOKEN, [])
        registry = await deployContract(walletOwner, REGISTRY, [])
        staking = await deployContract(walletOwner, STAKING, [localSxpToken.address, walletRewardProvider.address])
    })

    describe('Settings', () => {
        it('Get mininum stake amount', async () => {
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementation._minimumStakeAmount()).to.be.equal(1000 * (10**18))
        })

        it('Set mininum stake amount', async () => {
            const calldata = getCalldata('setMininumStakeAmount', ['uint256'], [2000 * (10**18)])
            await registry.setImplementationAndCall(staking.address, calldata)
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementation._mininumStakeAmount()).to.be.equal(2000 * (10**18))
        })

        it('Get reward provider', async () => {
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementation._rewardProvider()).to.be.equal(walletRewardProvider.address)
        })
        
        it('Set reward provider', async () => {
            const calldata = getCalldata('setRewardProvider', ['address'], [walletNewRewardProvider.address])
            await registry.setImplementationAndCall(staking.address, calldata)
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementation._rewardProvider()).to.be.equal(walletNewRewardProvider.address)
        })

        it('Get reward policy', async () => {
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementation._rewardCycle()).to.be.equal(1 * 24 * 3600 * 1000)
            expect(await implementation._rewardAmount()).to.be.equal(40000 * (10**18))
        })

        it('Set reward policy', async () => {
            const calldata = getCalldata('setRewardPolicy', ['uint256', 'uint256'], [7 * 24 * 3600 * 1000, 50000 * (10**18)])
            await registry.setImplementationAndCall(staking.address, calldata)
            expect(await registry.getOwner()).to.eq(walletNewRewardProvider.address)
            const implementation = new ethers.Contract(registry.address, STAKING.interface, walletOwner)
            expect(await implementation._rewardCycle()).to.be.equal(7 * 24 * 3600 * 1000)
            expect(await implementation._rewardAmount()).to.be.equal(50000 * (10**18))
        })
    })

    /*describe('Deposit', () => {
        it('Get owner', async () => {
            expect(await registry.getOwner()).to.eq(wallet.address)
        })

        it('Transfer ownership to zero address', async () => {
            const zero = ethers.constants.AddressZero
            await expect(registry.transferOwnership(zero)).to.be.reverted
        })

        it('Transfer ownership to non-zero address', async () => {
            await registry.transferOwnership(walletTo.address)
            expect(await registry.getOwner()).to.eq(walletTo.address)
        })
    })

    describe('Upgrade', () => {
        let contract1
        let contract2

        beforeEach(async () => {
            contract1 = await deployContract(wallet, TEST_CONTRACT_1, [])
            contract2 = await deployContract(wallet, TEST_CONTRACT_2, [])
        })

        it('Wrong owner', async () => {
            const calldata = getCalldata('initialize', ['uint256'], [17])
            const registryWithWrongSigner = registry.connect(walletTo);
            await expect(registryWithWrongSigner.setImplementationAndCall(contract1.address, calldata)).to.be.reverted
        })

        it('Old implementaton', async () => {
            const calldata = getCalldata('initialize', ['uint256'], [17])
            await registry.setImplementationAndCall(contract1.address, calldata)
            expect(await registry.getImplementation()).to.be.equal(contract1.address)
            await expect(registry.setImplementation(contract1.address)).to.be.reverted
        })

        it('Wrong calldata', async () => {
            const calldata = getCalldata('initialize', ['address'], [ethers.constants.AddressZero])
            await expect(registry.setImplementationAndCall(contract1.address, calldata)).to.be.reverted
        })

        it('Reinitialize must revert', async () => {
            const oldCalldata = getCalldata('initialize', ['uint256'], [17])
            await registry.setImplementationAndCall(contract1.address, oldCalldata)
            expect(await registry.getImplementation()).to.be.equal(contract1.address)
            const newCalldata = getCalldata('initialize', ['uint256'], [1])
            await expect(registry.setImplementationAndCall(contract2.address, newCalldata)).to.be.reverted
        })
    })
    
    describe('Storage', () => {
        let contract1
        let contract2

        beforeEach(async () => {
            contract1 = await deployContract(wallet, TEST_CONTRACT_1, [])
            contract2 = await deployContract(wallet, TEST_CONTRACT_2, [])
        })

        it('Storage is saved after upgrade', async () => {
            const value = 17
            const calldata = getCalldata('initialize', ['uint256'], [value])
            await registry.setImplementationAndCall(contract1.address, calldata)
            expect(await registry.getImplementation()).to.be.equal(contract1.address)

            const implementationOld = new ethers.Contract(registry.address, TEST_CONTRACT_1.interface, wallet)
            expect(await implementationOld.testAddress()).to.be.equal(registry.address)
            expect(await implementationOld.testUInt()).to.be.equal(17)
            expect(await implementationOld.testMapping(17)).to.be.equal(registry.address)

            await registry.setImplementation(contract2.address)
            expect(await registry.getImplementation()).to.be.equal(contract2.address)

            const implementationNew = new ethers.Contract(registry.address, TEST_CONTRACT_2.interface, wallet)
            expect(await implementationNew.testAddress()).to.be.equal(registry.address)
            expect(await implementationNew.testUInt()).to.be.equal(17)
            expect(await implementationNew.testMapping(17)).to.be.equal(registry.address)
            expect(await implementationNew.testUInt16()).to.be.equal(0)
        })
    })  

    describe('Ownership', () => {
        it('Get owner', async () => {
            expect(await registry.getOwner()).to.eq(wallet.address)
        })

        it('Transfer ownership to zero address', async () => {
            const zero = ethers.constants.AddressZero
            await expect(registry.transferOwnership(zero)).to.be.reverted
        })

        it('Transfer ownership to non-zero address', async () => {
            await registry.transferOwnership(walletTo.address)
            expect(await registry.getOwner()).to.eq(walletTo.address)
        })
    })*/
})