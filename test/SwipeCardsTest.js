require('dotenv').config()

const { use, expect } = require('chai')
const BigNumber = require('bignumber.js')

const { MockProvider, deployContract, solidity} = require('ethereum-waffle')
const ethers = require('ethers')
const CARDS = require('../build/SwipeCards')

use(solidity)

describe('Swipe Cards Test', async () => {
  let cards
  let voting

  const [ cardsWalletOwner, votingContract, otherWallet ] = new MockProvider({ total_accounts: 3 }).getWallets()
  
  beforeEach(async() => {
    cards = await deployContract(cardsWalletOwner, CARDS, [])
    let lockUp = 300
    let fee = "0.25"
    let lockUpTime = 10000
    let feeSplitPct = "5"
    await cards.initialize(votingContract.address, lockUp, fee, lockUpTime, feeSplitPct)
  })

  describe('Brand', async () => {
    it('Get cards contract name', async () => {
      expect(await cards.name()).to.be.equal('Swipe Cards')
    })
  })

  describe('Swipe Cards Features', async () => {
    it('Initialize', async () => {
      expect (await cards.getCardLockUp()).to.be.equal(300)
      expect (await cards.getCardFee()).to.be.equal("0.25")
      expect (await cards.getCardLockUpTime()).to.be.equal(10000)
      expect (await cards.getCardFeeSplitPct()).to.be.equal("5")
    })
  
    it('Get values', async () => {
      expect (await cards.getCardLockUp()).to.be.equal(300)
      expect (await cards.getCardFee()).to.be.equal("0.25")
      expect (await cards.getCardLockUpTime()).to.be.equal(10000)
      expect (await cards.getCardFeeSplitPct()).to.be.equal("5")
    })
  
    it('Set values', async () => {
      await cards.connect(votingContract.address).setCardLockUp(3000)
      await cards.connect(votingContract.address).setCardFee("0.5")
      await cards.connect(votingContract.address).setCardLockUpTime(20000)
      await cards.connect(votingContract.address).setCardFeeSplitPct("15")
      
      expect (await cards.getCardFee()).to.be.equal(3000)
      expect (await cards.getCardLockUp()).to.be.equal("0.5")
      expect (await cards.getCardLockUpTime()).to.be.equal(20000)
      expect (await cards.getCardFeeSplitPct()).to.be.equal("15")
    })
  
    it('Set wrong values', async () => {
      expect (await cards.setCardLockUp(-1)).to.be.reverted
      expect (await cards.setCardFee("")).to.be.reverted
      expect (await cards.setCardLockUpTime(-1)).to.be.reverted
      expect (await cards.setCardFeeSplitPct("")).to.be.reverted
    })
  
    it('Set values from wrong address', async () => {
      expect (await cards.connect(otherWallet.address).setCardLockUp(3000)).to.be.reverted
      expect (await cards.connect(otherWallet.address).setCardFee("0.5")).to.be.reverted
      expect (await cards.connect(otherWallet.address).setCardLockUpTime(20000)).to.be.reverted
      expect (await cards.connect(otherWallet.address).setCardFeeSplitPct("15")).to.be.reverted
    })
  })
})
