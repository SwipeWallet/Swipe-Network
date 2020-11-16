require('dotenv').config()
const {use, expect} = require('chai')
const {MockProvider, deployContract, solidity} = require('ethereum-waffle')
const ethers = require('ethers')

use(solidity)

const getCalldata = require('./helpers/getCalldata')
const encodeParameters = require('./helpers/encodeParameters')
const timeTravel = require('./helpers/timeTravel')

const SWIPETOKEN = require("../build/SwipeToken")
const STAKINGPROXY = require('../build/StakingProxy')
const STAKING = require('../build/Staking')
const STAKINGV2 = require('../build/StakingV2')
const SWIPECARDSPROXY = require('../build/SwipeCardsProxy')
const SWIPECARDS = require('../build/SwipeCards')
const GOVERNANCEPROXY = require('../build/GovernanceProxy')
const GOVERNANCE = require('../build/Governance')
const GOVERNANCETIMELOCKPROXY = require('../build/GovernanceTimelockProxy')
const GOVERNANCETIMELOCK = require('../build/GovernanceTimelock')

describe('SIP-3 Tests', () => {
    const provider = new MockProvider({ total_accounts: 4 })
    const [walletGuardian, walletRewardProvider, proposer, voter] = provider.getWallets()
    let swipeToken
    let stakingProxy
    let staking
    let stakingV2
    let swipeCardsProxy
    let governanceTimelockProxy
    let governanceTimelock
    let governanceProxy
    let governance
    let votingDelay
    let votingPeriod
    let timelockDelay
    let proposerStakingAmount
    let voterStakingAmount

    const swipeCardList = [{
        cardName: 'Swipe Saffron',
        lockUp: '0',
        lockUpTime: '0',
        fee: '0',
        feeSplitPercentage: '0'
    }, {
        cardName: 'Swipe Sky',
        lockUp: '300000000000000000000',
        lockUpTime: '15552000',
        fee: '0',
        feeSplitPercentage: '0'
    }, {
        cardName: 'Swipe Steel',
        lockUp: '3000000000000000000000',
        lockUpTime: '15552000',
        fee: '0',
        feeSplitPercentage: '0'
    }, {
        cardName: 'Swipe Slate',
        lockUp: '30000000000000000000000',
        lockUpTime: '15552000',
        fee: '0',
        feeSplitPercentage: '0'
    }]

    beforeEach(async () => {
        // Deploy all contracts
        swipeToken = await deployContract(proposer, SWIPETOKEN, [])
        stakingProxy = await deployContract(walletGuardian, STAKINGPROXY, [])
        staking = await deployContract(walletGuardian, STAKING, [])
        stakingV2 = await deployContract(walletGuardian, STAKINGV2, [])
        swipeCardsProxy = await deployContract(walletGuardian, SWIPECARDSPROXY, [])
        const swipeCards = await deployContract(walletGuardian, SWIPECARDS, [])
        governanceTimelockProxy = await deployContract(walletGuardian, GOVERNANCETIMELOCKPROXY, [])
        governanceTimelock = await deployContract(walletGuardian, GOVERNANCETIMELOCK, [])
        governanceProxy = await deployContract(walletGuardian, GOVERNANCEPROXY, [])
        governance = await deployContract(walletGuardian, GOVERNANCE, [], { gasLimit: 4712388 })
        let calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletGuardian.address, swipeToken.address, walletRewardProvider.address])
        await stakingProxy.setImplementationAndCall(staking.address, calldata)
        calldata = getCalldata('initialize', ['address'], [walletGuardian.address])
        await swipeCardsProxy.setImplementationAndCall(swipeCards.address, calldata)
        timelockDelay = 3600
        calldata = getCalldata('initialize', ['address', 'uint256'], [governanceProxy.address, timelockDelay])
        await governanceTimelockProxy.setImplementationAndCall(governanceTimelock.address, calldata)
        calldata = getCalldata('initialize', ['address', 'address', 'address'], [governanceTimelockProxy.address, stakingProxy.address, walletGuardian.address])
        await governanceProxy.setImplementationAndCall(governance.address, calldata)

        // Setting
        const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, walletGuardian)
        await governanceImplementation.setProposalMaxOperations(10)
        await governanceImplementation.setVotingDelay(0)
        await governanceImplementation.setVotingPeriod(1)

        // Stake
        proposerStakingAmount = '2000000000000000000000'
        await swipeToken.approve(stakingProxy.address, proposerStakingAmount)
        const stakingImplementationByProposer = new ethers.Contract(stakingProxy.address, STAKING.interface, proposer)
        await stakingImplementationByProposer.stake(proposerStakingAmount)
        voterStakingAmount = '1000000000000000000000'
        await swipeToken.transfer(voter.address, voterStakingAmount)
        await swipeToken.connect(voter).approve(stakingProxy.address, voterStakingAmount)
        const stakingImplementationByVoter = new ethers.Contract(stakingProxy.address, STAKING.interface, voter)
        await stakingImplementationByVoter.stake(voterStakingAmount)

        // Authorize staking ownership transfer to governance timelock
        await stakingProxy.authorizeOwnershipTransfer(governanceTimelockProxy.address)
        const stakingImplementation = new ethers.Contract(stakingProxy.address, STAKING.interface, walletGuardian)
        await stakingImplementation.authorizeGuardianshipTransfer(governanceTimelockProxy.address)

        // Authorize swipe cards ownership transfer to governance timelock
        await swipeCardsProxy.authorizeOwnershipTransfer(governanceTimelockProxy.address)
        const swipeCardsImplementation = new ethers.Contract(swipeCardsProxy.address, SWIPECARDS.interface, walletGuardian)
        await swipeCardsImplementation.authorizeGuardianshipTransfer(governanceTimelockProxy.address)

        // Get config
        votingDelay = await governanceImplementation._votingDelay()
        votingPeriod = await governanceImplementation._votingPeriod()

        // Execute SIP-1
        await fnSip1()
    })

    const fnSip1 = async () => {
        const stakingImplementation = new ethers.Contract(stakingProxy.address, STAKINGV2.interface, proposer)
        const rewardCycle = await stakingImplementation._rewardCycle()
        const rewardAmount = await stakingImplementation._rewardAmount()
        const rewardPendingPeriod = '604800'

        const proposalDescription = '# SIP-1'

        // 0. Assume staking ownership
        // 1. Assume staking guardianship
        // 2. Upgrade staking to v2
        // 3. Set reward policy
        const targets = [
            stakingProxy.address,
            stakingProxy.address,
            stakingProxy.address,
            stakingProxy.address
        ]
        const values = [
            '0',
            '0',
            '0',
            '0'
        ]
        const signatures = [
            'assumeOwnership()',
            'assumeGuardianship()',
            'setImplementation(address)',
            'setRewardPolicy(uint256,uint256,uint256)'
        ]
        const calldatas = [
            encodeParameters([], []),
            encodeParameters([], []),
            encodeParameters(['address'], [stakingV2.address]),
            encodeParameters(['uint256', 'uint256', 'uint256'], [rewardCycle, rewardAmount, rewardPendingPeriod])
        ]

        const governanceImplementationByProposer = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, proposer)
        await governanceImplementationByProposer.propose(targets, values, signatures, calldatas, proposalDescription)

        const governanceImplementationByVoter = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, voter)
        await governanceImplementationByVoter.castVote('1', true)

        await governanceImplementationByProposer.queue('1')

        await timeTravel(provider.provider, timelockDelay)
        await governanceImplementationByProposer.execute('1')
    }

    const fnPropose = async () => {
        const proposalDescription = '# SIP-3'

        // 0. Assume swipe cards ownership
        // 1. Assume swipe cards guardianship
        // 2. Add Swipe Saffron card
        // 3. Add Swipe Sky card
        // 4. Add Swipe Steel card
        // 5. Add Swipe Slate card
        const targets = [
            swipeCardsProxy.address,
            swipeCardsProxy.address
        ]
        const values = [
            '0',
            '0'
        ]
        const signatures = [
            'assumeOwnership()',
            'assumeGuardianship()'
        ]
        const calldatas = [
            encodeParameters([], []),
            encodeParameters([], [])
        ]
        swipeCardList.forEach(card => {
            targets.push(swipeCardsProxy.address)
            values.push('0')
            signatures.push('registerCard(string,uint256,uint256,string,string)')
            calldatas.push(encodeParameters(['string', 'uint256', 'uint256', 'string', 'string'], [
                card.cardName,
                card.lockUp,
                card.lockUpTime,
                card.fee,
                card.feeSplitPercentage
            ]))
        })

        const currentBlock = await provider.getBlock(await provider.getBlockNumber())
        const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, proposer)
        await expect(governanceImplementation.propose(targets, values, signatures, calldatas, proposalDescription)).to.emit(governanceImplementation, 'ProposalCreation').withArgs('2', proposer.address, targets, values, signatures, calldatas, currentBlock.number + 1 + Number(votingDelay), currentBlock.number + 1 + Number(votingDelay) + Number(votingPeriod), proposalDescription)
    }

    it('Propose', async () => {
        await fnPropose()
    })

    const fnVote = async () => {
        const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, voter)
        await expect(governanceImplementation.castVote('2', true)).to.emit(governanceImplementation, 'Vote').withArgs(voter.address, '2', true, voterStakingAmount)
    }

    it('Vote', async () => {
        await fnPropose()
        await fnVote()
    })

    const fnQueue = async () => {
        const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, proposer)
        await governanceImplementation.queue('2')
        const currentBlock = await provider.getBlock(await provider.getBlockNumber())
        const proposal = await governanceImplementation.getProposal('2')
        expect(proposal.eta).to.be.equal(currentBlock.timestamp + timelockDelay)
    }

    it('Queue', async () => {
        await fnPropose()
        await fnVote()
        await fnQueue()
    })

    const fnExecute = async () => {
        await timeTravel(provider.provider, timelockDelay)
        const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, proposer)
        await expect(governanceImplementation.execute('2')).to.emit(governanceImplementation, 'ProposalExecution').withArgs('2')
    }

    it('Execute', async () => {
        await fnPropose()
        await fnVote()
        await fnQueue()
        await fnExecute()
    })

    const fnCheck = async () => {
        const swipeCardsImplementation = new ethers.Contract(swipeCardsProxy.address, SWIPECARDS.interface, proposer)

        const cardCount = await swipeCardsImplementation._cardCount()
        expect(cardCount).to.be.equal(swipeCardList.length)
        for (let i = 0; i < swipeCardList.length; i++) {
            const cardData = swipeCardList[i]
            const card = await swipeCardsImplementation._cards(i + 1)
            expect(card.cardId).to.be.equal(i + 1)
            expect(card.cardName).to.be.equal(cardData.cardName)
            expect(card.lockUp).to.be.equal(cardData.lockUp)
            expect(card.lockUpTime).to.be.equal(cardData.lockUpTime)
            expect(card.fee).to.be.equal(cardData.fee)
            expect(card.feeSplitPercentage).to.be.equal(cardData.feeSplitPercentage)
        }
    }

    it('Check', async () => {
        await fnPropose()
        await fnVote()
        await fnQueue()
        await fnExecute()
        await fnCheck()
    })
})