require('dotenv').config()

const { use, expect } = require('chai')
const { MockProvider, deployContract, solidity} = require('ethereum-waffle')
const ethers = require('ethers')

const REGISTRY = require('../build/SwipeRegistry')
const CARDS = require('../build/SwipeCards')

use(solidity)

const getCalldata = require('./helpers/getCalldata')

describe('Swipe Cards Test', async () => {
    let registry
    let cards

    const [ 
        cardsWalletOwner, votingContract, walletNewOwner, walletNewGuardian, otherWallet 
    ] = new MockProvider({ total_accounts: 5 }).getWallets()

    const defaultLockUp = 300
    const defaultFee = "0.25"
    const defaultLockUpTime = 10000
    const defaultFeeSplitPercentage = "5"
    
    beforeEach(async() => {
        registry = await deployContract(cardsWalletOwner, REGISTRY, ['Swipe Cards Proxy'])
        cards = await deployContract(cardsWalletOwner, CARDS, [])
    })

    describe('Brand', () => {
        it('Get cards contract name', async () => {
            expect(await cards.name()).to.be.equal('Swipe Cards')
        })

        it('Get registry contract name', async () => {
            expect(await registry.name()).to.eq('Swipe Cards Proxy')
        })

        it('Get cards contract name', async () => {
            const calldata = getCalldata(
              'initialize',
              ['address', 'uint256', 'string', 'uint256', 'string'],
              [votingContract.address, defaultLockUp, defaultFee, defaultLockUpTime, defaultFeeSplitPercentage]
            )
            await registry.setImplementationAndCall(cards.address, calldata)
            const implementation = new ethers.Contract(registry.address, CARDS.interface, cardsWalletOwner)
            expect(await implementation.name()).to.be.equal('Swipe Cards Proxy')
        })
    })

    describe('Swipe Cards Features', async () => {
        beforeEach(async () => {
            const calldata = getCalldata(
                'initialize',
                ['address', 'uint256', 'string', 'uint256', 'string'],
                [votingContract.address, defaultLockUp, defaultFee, defaultLockUpTime, defaultFeeSplitPercentage]
            )
            await registry.setImplementationAndCall(cards.address, calldata)
        })

        it('Get values', async () => {
            const implementation = new ethers.Contract(registry.address, CARDS.interface, cardsWalletOwner)
            expect(await implementation.getCardLockUp()).to.be.equal(defaultLockUp)
            expect(await implementation.getCardFee()).to.be.equal(defaultFee)
            expect(await implementation.getCardLockUpTime()).to.be.equal(defaultLockUpTime)
            expect(await implementation.getCardFeeSplitPercentage()).to.be.equal(defaultFeeSplitPercentage)
        })
      
        it('Set values', async () => {
            const newLockUp = 3000
            const newFee = "0.5"
            const newLockUpTime = 20000
            const newFeeSplitPercentage = "15"

            const implementation = new ethers.Contract(registry.address, CARDS.interface, cardsWalletOwner)
            await expect(implementation.connect(votingContract).setCardLockUp(newLockUp))
                .to.emit(implementation, 'LockUpUpdate')
                .withArgs(defaultLockUp, newLockUp)
            await expect(implementation.connect(votingContract).setCardFee(newFee))
                .to.emit(implementation, 'FeeUpdate')
                .withArgs(defaultFee, newFee)
            await expect(implementation.connect(votingContract).setCardLockUpTime(newLockUpTime))
                .to.emit(implementation, 'LockUpTimeUpdate')
                .withArgs(defaultLockUpTime, newLockUpTime)
            await expect(implementation.connect(votingContract).setCardFeeSplitPercentage(newFeeSplitPercentage))
                .to.emit(implementation, 'FeeSplitPercentageUpdate')
                .withArgs(defaultFeeSplitPercentage, newFeeSplitPercentage)

            expect(await implementation.getCardLockUp()).to.be.equal(newLockUp)
            expect(await implementation.getCardFee()).to.be.equal(newFee)
            expect(await implementation.getCardLockUpTime()).to.be.equal(newLockUpTime)
            expect(await implementation.getCardFeeSplitPercentage()).to.be.equal(newFeeSplitPercentage)
        })
      
        it('Set wrong values', async () => {
            const wrongFee = ""
            const wrongFeeSplitPercentage = ""

            const implementation = new ethers.Contract(registry.address, CARDS.interface, cardsWalletOwner)
            await expect(implementation.connect(votingContract).setCardFee(wrongFee)).to.be.reverted
            await expect(implementation.connect(votingContract).setCardFeeSplitPercentage(wrongFeeSplitPercentage)).to.be.reverted
        })
      
        it('Set values from wrong address', async () => {
            const lockUp = 3000
            const fee = "0.5"
            const lockUpTime = 20000
            const feeSplitPercentage = "15"

            const implementation = new ethers.Contract(registry.address, CARDS.interface, cardsWalletOwner)
            await expect(implementation.connect(otherWallet).setCardLockUp(lockUp)).to.be.reverted
            await expect(implementation.connect(otherWallet).setCardFee(fee)).to.be.reverted
            await expect(implementation.connect(otherWallet).setCardLockUpTime(lockUpTime)).to.be.reverted
            await expect(implementation.connect(otherWallet).setCardFeeSplitPercentage(feeSplitPercentage)).to.be.reverted
        })
    })

    describe('Ownership', () => {
        it('Get registry owner', async () => {
            expect(await registry.getOwner()).to.eq(cardsWalletOwner.address)
        })

        it('Transfer registry ownership by wrong owner', async () => {
            const registryWithWrongSigner = registry.connect(walletNewOwner)
            await expect(registryWithWrongSigner.authorizeOwnershipTransfer(registryWithWrongSigner.address)).to.be.reverted
            expect(await registry.getOwner()).to.eq(cardsWalletOwner.address)
        })

        it('Transfer registry ownership', async () => {
            await registry.authorizeOwnershipTransfer(walletNewOwner.address)
            expect(await registry.getOwner()).to.eq(cardsWalletOwner.address)
            expect(await registry.getAuthorizedNewOwner()).to.eq(walletNewOwner.address)
            const registryWithNewOwner = registry.connect(walletNewOwner)
            await registryWithNewOwner.assumeOwnership()
            expect(await registry.getOwner()).to.eq(walletNewOwner.address)
            expect(await registry.getAuthorizedNewOwner()).to.eq(ethers.constants.AddressZero)            
        })

        it('Get cards guardian', async () => {
            const calldata = getCalldata(
                'initialize',
                ['address', 'uint256', 'string', 'uint256', 'string'],
                [cardsWalletOwner.address, defaultLockUp, defaultFee, defaultLockUpTime, defaultFeeSplitPercentage]
            )
            await registry.setImplementationAndCall(cards.address, calldata)
            const implementation = new ethers.Contract(registry.address, CARDS.interface, cardsWalletOwner)
            expect(await implementation._guardian()).to.be.equal(cardsWalletOwner.address)
        })

        it('Transfer cards guardianship to another address', async () => {
            const calldata = getCalldata(
                'initialize',
                ['address', 'uint256', 'string', 'uint256', 'string'],
                [votingContract.address, defaultLockUp, defaultFee, defaultLockUpTime, defaultFeeSplitPercentage]
            )
            await registry.setImplementationAndCall(cards.address, calldata)
            const implementation = new ethers.Contract(registry.address, CARDS.interface, cardsWalletOwner)
            await expect(implementation.connect(votingContract).authorizeGuardianshipTransfer(walletNewGuardian.address))
                .to.emit(implementation, 'GuardianshipTransferAuthorization')
                .withArgs(walletNewGuardian.address)
            expect(await implementation._guardian()).to.be.equal(votingContract.address)

            const implementationWithNewGuardian = new ethers.Contract(registry.address, CARDS.interface, walletNewGuardian)
            await expect(implementationWithNewGuardian.assumeGuardianship())
                .to.emit(implementation, 'GuardianUpdate')
                .withArgs(votingContract.address, walletNewGuardian.address)
            expect(await implementation._guardian()).to.be.equal(walletNewGuardian.address)
            expect(await implementationWithNewGuardian._guardian()).to.be.equal(walletNewGuardian.address)
        })
    })
})
