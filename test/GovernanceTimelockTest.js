require('dotenv').config()

const { use, expect } = require('chai')
const BigNumber = require('bignumber.js');

const { MockProvider, deployContract, solidity} = require('ethereum-waffle')
const ethers = require('ethers')
const TIMELOCK = require('../build/GovernanceTimelock');

use(solidity);

const {
  encodeParameters,
  keccak256,
  etherUnsigned,
} = require('./utils/ETH');

describe('Governance Timelock', () => {
  /*let timelock;
  let delay = etherUnsigned(2 * 24 * 60 * 60); // 2 days
  let value = etherUnsigned(0), signature = 'setDelay(uint256)', eta, queuedTxHash;
  let data = encodeParameters(['uint256'], [delay]);
  let blockTimeStamp = etherUnsigned(100);

  const [adminNewWallet, adminWallet, pendingAdminWallet, targetWallet] = new MockProvider().getWallets();
  
  beforeEach(async() => {
    timelock = await deployContract(adminWallet, TIMELOCK, []);

    eta = blockTimeStamp.add(delay);
    queuedTxHash = keccak256(
      encodeParameters(
        ['address', 'uint256', 'string', 'bytes',  'uint256'],
        [targetWallet.address, value, signature, data, eta]
      )
    );

    await timelock.initialize(adminWallet.address, delay);
  });

  describe('Timelock Initialize', () => {
    it('Initialize address of admin', async () => {
      expect (await timelock._admin()).to.be.equal(adminWallet.address)
    })

    it('Initialize delay', async() => {
      expect (await timelock._delay()).to.be.equal(delay.toString());
    })
  })

  describe('Timelock set delay', async () => {
    it('Check msg.sender', async() => {
      expect (await timelock._admin()).to.be.equal(adminWallet.address)
    })

    it('Check minium delay time', async () => {
      let miniumDelay = delay.mul(2);
      await timelock.setDelay(miniumDelay);

      let delayTime = await timelock._delay();
      expect (await timelock._delay()).to.be.equal(miniumDelay.toString());
    })
  })

  describe('Timelock Pending Admin', async() => {
    it('Set Pending Admin', async() => {
      await expect (timelock.setPendingAdmin(pendingAdminWallet.address)).to.be.reverted
    })
  })

  describe('Timelock Accept Admin', async() => {
    it('Check msg.sender', async() => {
      await expect (timelock.setPendingAdmin(pendingAdminWallet.address)).to.be.reverted
      expect (await timelock._admin()).to.be.equal(adminWallet.address)
    })

    it('Accept Admin', async() => {
      expect(await timelock._pendingAdmin()).to.be.equal('0x0000000000000000000000000000000000000000');

      await expect (timelock.acceptAdmin()).to.be.reverted;
      expect (await timelock._pendingAdmin()).to.be.equal('0x0000000000000000000000000000000000000000');

      expect (await timelock._admin()).to.be.equal(adminWallet.address)
    })
  })

  describe('Timelock Queue Transaction', async() => {
    it('Check msg.sender', async() => {
      await expect (timelock.setPendingAdmin(pendingAdminWallet.address)).to.be.reverted
      expect (await timelock._admin()).to.be.equal(adminWallet.address)
    })

    it ('Set Hash Value true in Queue Transactions', async() => {
      expect(await timelock._queuedTransactions(queuedTxHash)).to.be.equal(false);

      const result = await timelock.queueTransaction(targetWallet.address, value, signature, data, eta);

      expect(await timelock._queuedTransactions(queuedTxHash)).to.be.equal(true);      
    })
  })

  describe('Timelock Queue Cancel', async() => {
    beforeEach(async() => {
      const result = await timelock.queueTransaction(targetWallet.address, value, signature, data, eta);
    })

    it('Check msg.sender', async() => {
      await expect (timelock.setPendingAdmin(pendingAdminWallet.address)).to.be.reverted
      expect (await timelock._admin()).to.be.equal(adminWallet.address)
    })

    it ('Set Hash Value true in Cancel Transactions', async() => {
      expect(await timelock._queuedTransactions(queuedTxHash)).to.be.equal(true);

      await timelock.cancelTransaction(targetWallet.address, value, signature, data, eta)

      expect(await timelock._queuedTransactions(queuedTxHash)).to.be.equal(false);      
    })
  })

  describe('Timelock Queue Execute', async() => {
    beforeEach(async() => {
      const result = await timelock.queueTransaction(targetWallet.address, value, signature, data, eta);
    })

    it('Check msg.sender', async() => {
      await expect (timelock.setPendingAdmin(pendingAdminWallet.address)).to.be.reverted
      expect (await timelock._admin()).to.be.equal(adminWallet.address)
    })

    it ('Execute Queue Transaction in time', async() => {
      await expect(timelock.executeTransaction(targetWallet.address, value, signature, data, eta)).to.be.reverted
    })
  })*/
});
