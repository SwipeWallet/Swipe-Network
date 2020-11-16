require('dotenv').config()

const { use, expect } = require('chai')
const { MockProvider, deployContract, solidity} = require('ethereum-waffle')
const ethers = require('ethers')

use(solidity)

const getCalldata = require('./helpers/getCalldata')

const PROXY = require('../build/SwipeCardsProxy')
const CARDS = require('../build/SwipeCards')

describe('Swipe Cards Tests', async () => {
    let proxy
    let cards

    const [ 
        walletOwner, votingContract, walletNewOwner, walletNewGuardian, otherWallet 
    ] = new MockProvider({ total_accounts: 5 }).getWallets()

    const defaultCardId = 1
    const defaultCardName = 'SwipeVisa'
    const defaultLockUp = 300
    const defaultLockUpTime = 10000
    const defaultFee = '0.25'
    const defaultFeeSplitPercentage = '5'

    const default2CardId = 2
    const default2CardName = 'Venus'
    const default2LockUp = 1300
    const default2LockUpTime = 110000
    const default2Fee = '0.95'
    const default2FeeSplitPercentage = '15'

    beforeEach(async() => {
        proxy = await deployContract(walletOwner, PROXY, [])
        cards = await deployContract(walletOwner, CARDS, [])
    })

    describe('Brand', () => {
      it('Get cards proxy contract name', async () => {
        expect(await proxy.name()).to.eq('Swipe Cards Proxy')
      })

      it('Get cards contract name', async () => {
        const calldata = getCalldata('initialize', ['address'], [votingContract.address])
        await proxy.setImplementationAndCall(cards.address, calldata)
        const implementation = new ethers.Contract(proxy.address, CARDS.interface, walletOwner)
        expect(await implementation.name()).to.be.equal('Swipe Cards Proxy')
      })
    })

    describe('Swipe cards features', async () => {
        beforeEach(async () => {
            const calldata = getCalldata('initialize', ['address'], [votingContract.address])
            await proxy.setImplementationAndCall(cards.address, calldata)
        })

        describe('Register', async () => {
            it('Register card', async () => {
                const implementation = new ethers.Contract(proxy.address, CARDS.interface, votingContract)
                await expect(implementation.registerCard(
                    defaultCardName,
                    defaultLockUp,
                    defaultLockUpTime,
                    defaultFee,
                    defaultFeeSplitPercentage))
                .to.emit(implementation, 'CardRegistration')
                .withArgs(
                    defaultCardId,
                    defaultCardName,
                    defaultLockUp,
                    defaultLockUpTime,
                    defaultFee,
                    defaultFeeSplitPercentage)
                
                await expect(implementation.registerCard(
                    default2CardName,
                    default2LockUp,
                    default2LockUpTime,
                    default2Fee,
                    default2FeeSplitPercentage))
                .to.emit(implementation, 'CardRegistration')
                .withArgs(
                    default2CardId,
                    default2CardName,
                    default2LockUp,
                    default2LockUpTime,
                    default2Fee,
                    default2FeeSplitPercentage)

                const cardCount = await implementation._cardCount()
                expect(cardCount).to.be.equal(default2CardId)
            })

            it('Register card by wrong guardian', async () => {
                const implementation = new ethers.Contract(proxy.address, CARDS.interface, otherWallet)
                await expect(implementation.registerCard(
                    defaultCardName,
                    defaultLockUp,
                    defaultLockUpTime,
                    defaultFee,
                    defaultFeeSplitPercentage))
                .to.be.reverted
            })
        })

        describe('Unregister', async () => {
            beforeEach(async () => {
                const implementation = new ethers.Contract(proxy.address, CARDS.interface, votingContract)
                await implementation.registerCard(
                    defaultCardName,
                    defaultLockUp,
                    defaultLockUpTime,
                    defaultFee,
                    defaultFeeSplitPercentage)
                await implementation.registerCard(
                    default2CardName,
                    default2LockUp,
                    default2LockUpTime,
                    default2Fee,
                    default2FeeSplitPercentage)
                })

            it('Unregister card', async () => {
                const implementation = new ethers.Contract(proxy.address, CARDS.interface, votingContract)
                await expect(implementation.unregisterCard(
                    defaultCardId))
                .to.emit(implementation, 'CardUnregistration')
                .withArgs(
                    defaultCardId,
                    defaultCardName)

                const cardCount = await implementation._cardCount()
                expect(cardCount).to.be.equal(defaultCardId)
                const card = await implementation._cards(defaultCardId)
                expect(card.cardId).to.be.equal(defaultCardId)
                expect(card.cardName).to.be.equal(default2CardName)
                expect(card.lockUp).to.be.equal(default2LockUp)
                expect(card.lockUpTime).to.be.equal(default2LockUpTime)
                expect(card.fee).to.be.equal(default2Fee)
                expect(card.feeSplitPercentage).to.be.equal(default2FeeSplitPercentage)
            })

            it('Unregister card by wrong guardian', async () => {
                const implementation = new ethers.Contract(proxy.address, CARDS.interface, otherWallet)
                await expect(implementation.unregisterCard(
                    defaultCardId))
                .to.be.reverted
            })
        })

        describe('Swipe cards configuration', async () => {
            beforeEach(async () => {
                const implementation = new ethers.Contract(proxy.address, CARDS.interface, votingContract)
                await implementation.registerCard(
                    defaultCardName,
                    defaultLockUp,
                    defaultLockUpTime,
                    defaultFee,
                    defaultFeeSplitPercentage)
                await implementation.registerCard(
                    default2CardName,
                    default2LockUp,
                    default2LockUpTime,
                    default2Fee,
                    default2FeeSplitPercentage)
                })

            it('Get card', async () => {
                const implementation = new ethers.Contract(proxy.address, CARDS.interface, votingContract)
                const card = await implementation._cards(defaultCardId)
                expect(card.cardId).to.be.equal(defaultCardId)
                expect(card.cardName).to.be.equal(defaultCardName)
                expect(card.lockUp).to.be.equal(defaultLockUp)
                expect(card.lockUpTime).to.be.equal(defaultLockUpTime)
                expect(card.fee).to.be.equal(defaultFee)
                expect(card.feeSplitPercentage).to.be.equal(defaultFeeSplitPercentage)

                const card2 = await implementation._cards(default2CardId)
                expect(card2.cardId).to.be.equal(default2CardId)
                expect(card2.cardName).to.be.equal(default2CardName)
                expect(card2.lockUp).to.be.equal(default2LockUp)
                expect(card2.lockUpTime).to.be.equal(default2LockUpTime)
                expect(card2.fee).to.be.equal(default2Fee)
                expect(card2.feeSplitPercentage).to.be.equal(default2FeeSplitPercentage)
            })

            it('Set card', async () => {
                const cardId = 1
                const newCardName = 'SwipeMaster'
                const newLockUp = 200
                const newLockUpTime = 20000
                const newFee = '0.456'
                const newFeeSplitPercentage = '12.01'

                const implementation = new ethers.Contract(proxy.address, CARDS.interface, votingContract)
                await expect(implementation.setCard(
                    cardId,
                    newCardName,
                    newLockUp,
                    newLockUpTime,
                    newFee,
                    newFeeSplitPercentage))
                .to.emit(implementation, 'CardUpdate')
                .withArgs(
                    cardId,
                    newCardName,
                    newLockUp,
                    newLockUpTime,
                    newFee,
                    newFeeSplitPercentage)

                const card = await implementation._cards(cardId)
                expect(card.cardId).to.be.equal(cardId)
                expect(card.cardName).to.be.equal(newCardName)
                expect(card.lockUp).to.be.equal(newLockUp)
                expect(card.lockUpTime).to.be.equal(newLockUpTime)
                expect(card.fee).to.be.equal(newFee)
                expect(card.feeSplitPercentage).to.be.equal(newFeeSplitPercentage)
            })
      
            it('Set not-registered card', async () => {
                const wrongCardId = 3
                const newCardName = 'SwipeMaster'
                const newLockUp = 200
                const newLockUpTime = 20000
                const newFee = '0.456'
                const newFeeSplitPercentage = '12.01'

                const implementation = new ethers.Contract(proxy.address, CARDS.interface, votingContract)
                await expect(implementation.setCard(
                    wrongCardId,
                    newCardName,
                    newLockUp,
                    newLockUpTime,
                    newFee,
                    newFeeSplitPercentage)).to.be.reverted
            })
      
            it('Set card with wrong values', async () => {
                const cardId = 1
                const wrongCardName = ''
                const wrongLockUp = 0
                const wrongLockUpTime = 0
                const wrongFee = ''
                const wrongFeeSplitPercentage = ''

                const implementation = new ethers.Contract(proxy.address, CARDS.interface, votingContract)
                await expect(implementation.setCard(
                    cardId,
                    wrongCardName,
                    wrongLockUp,
                    wrongLockUpTime,
                    wrongFee,
                    wrongFeeSplitPercentage)).to.be.reverted
            })
      
            it('Set card by wrong guardian', async () => {
                const cardId = 1
                const newCardName = 'SwipeMaster'
                const newLockUp = 3000
                const newLockUpTime = 20000
                const newFee = '0.5'
                const newFeeSplitPercentage = '15'

                const implementation = new ethers.Contract(proxy.address, CARDS.interface, otherWallet)
                await expect(implementation.setCardName(cardId, newCardName)).to.be.reverted
                await expect(implementation.setCardLockUp(cardId, newLockUp)).to.be.reverted
                await expect(implementation.setCardLockUpTime(cardId, newLockUpTime)).to.be.reverted
                await expect(implementation.setCardFee(cardId, newFee)).to.be.reverted
                await expect(implementation.setCardFeeSplitPercentage(cardId, newFeeSplitPercentage)).to.be.reverted
            })
      
            it('Set individual values', async () => {
                const cardId = 1
                const newCardName = 'SwipeMaster'
                const newLockUp = 3000
                const newLockUpTime = 20000
                const newFee = '0.5'
                const newFeeSplitPercentage = '15'

                const implementation = new ethers.Contract(proxy.address, CARDS.interface, votingContract)
                await expect(implementation.setCardName(cardId, newCardName))
                    .to.emit(implementation, 'CardNameUpdate')
                    .withArgs(cardId, defaultCardName, newCardName)
                await expect(implementation.setCardLockUp(cardId, newLockUp))
                    .to.emit(implementation, 'LockUpUpdate')
                    .withArgs(cardId, defaultLockUp, newLockUp)
                await expect(implementation.setCardLockUpTime(cardId, newLockUpTime))
                    .to.emit(implementation, 'LockUpTimeUpdate')
                    .withArgs(cardId, defaultLockUpTime, newLockUpTime)
                await expect(implementation.setCardFee(cardId, newFee))
                    .to.emit(implementation, 'FeeUpdate')
                    .withArgs(cardId, defaultFee, newFee)
                await expect(implementation.setCardFeeSplitPercentage(cardId, newFeeSplitPercentage))
                    .to.emit(implementation, 'FeeSplitPercentageUpdate')
                    .withArgs(cardId, defaultFeeSplitPercentage, newFeeSplitPercentage)

                const card = await implementation._cards(cardId)
                expect(card.cardId).to.be.equal(cardId)
                expect(card.cardName).to.be.equal(newCardName)
                expect(card.lockUp).to.be.equal(newLockUp)
                expect(card.lockUpTime).to.be.equal(newLockUpTime)
                expect(card.fee).to.be.equal(newFee)
                expect(card.feeSplitPercentage).to.be.equal(newFeeSplitPercentage)
            })
      
            it('Set individual with wrong values', async () => {
                const cardId = 1
                const wrongCardName = ''
                const wrongFee = ''
                const wrongFeeSplitPercentage = ''

                const implementation = new ethers.Contract(proxy.address, CARDS.interface, votingContract)
                await expect(implementation.setCardName(cardId, wrongCardName)).to.be.reverted
                await expect(implementation.setCardFee(cardId, wrongFee)).to.be.reverted
                await expect(implementation.setCardFeeSplitPercentage(cardId, wrongFeeSplitPercentage)).to.be.reverted
            })
      
            it('Set individual values by wrong guardian', async () => {
                const cardId = 1
                const newCardName = 'SwipeMaster'
                const newLockUp = 3000
                const newLockUpTime = 20000
                const newFee = '0.5'
                const newFeeSplitPercentage = '15'

                const implementation = new ethers.Contract(proxy.address, CARDS.interface, otherWallet)
                await expect(implementation.setCardName(cardId, newCardName)).to.be.reverted
                await expect(implementation.setCardLockUp(cardId, newLockUp)).to.be.reverted
                await expect(implementation.setCardLockUpTime(cardId, newLockUpTime)).to.be.reverted
                await expect(implementation.setCardFee(cardId, newFee)).to.be.reverted
                await expect(implementation.setCardFeeSplitPercentage(cardId, newFeeSplitPercentage)).to.be.reverted
            })
        })
    })

    describe('Ownership', () => {
        it('Get cards proxy owner', async () => {
            expect(await proxy.getOwner()).to.eq(walletOwner.address)
        })

        it('Transfer cards proxy ownership by wrong owner', async () => {
            const proxyWithWrongSigner = proxy.connect(walletNewOwner)
            await expect(proxyWithWrongSigner.authorizeOwnershipTransfer(proxyWithWrongSigner.address)).to.be.reverted
            expect(await proxy.getOwner()).to.eq(walletOwner.address)
        })

        it('Transfer card proxy ownership', async () => {
            await proxy.authorizeOwnershipTransfer(walletNewOwner.address)
            expect(await proxy.getOwner()).to.eq(walletOwner.address)
            expect(await proxy.getAuthorizedNewOwner()).to.eq(walletNewOwner.address)
            const proxyWithNewOwner = proxy.connect(walletNewOwner)
            await proxyWithNewOwner.assumeOwnership()
            expect(await proxy.getOwner()).to.eq(walletNewOwner.address)
            expect(await proxy.getAuthorizedNewOwner()).to.eq(ethers.constants.AddressZero)            
        })

        it('Get cards guardian', async () => {
            const calldata = getCalldata('initialize', ['address'], [walletOwner.address])
            await proxy.setImplementationAndCall(cards.address, calldata)
            const implementation = new ethers.Contract(proxy.address, CARDS.interface, walletOwner)
            expect(await implementation._guardian()).to.be.equal(walletOwner.address)
        })

        it('Transfer cards guardianship to another address', async () => {
            const calldata = getCalldata('initialize', ['address'], [votingContract.address])
            await proxy.setImplementationAndCall(cards.address, calldata)
            const implementation = new ethers.Contract(proxy.address, CARDS.interface, votingContract)
            await expect(implementation.authorizeGuardianshipTransfer(walletNewGuardian.address))
                .to.emit(implementation, 'GuardianshipTransferAuthorization')
                .withArgs(walletNewGuardian.address)
            expect(await implementation._guardian()).to.be.equal(votingContract.address)

            const implementationWithNewGuardian = new ethers.Contract(proxy.address, CARDS.interface, walletNewGuardian)
            await expect(implementationWithNewGuardian.assumeGuardianship())
                .to.emit(implementation, 'GuardianUpdate')
                .withArgs(votingContract.address, walletNewGuardian.address)
            expect(await implementation._guardian()).to.be.equal(walletNewGuardian.address)
            expect(await implementationWithNewGuardian._guardian()).to.be.equal(walletNewGuardian.address)
        })
    })
})
