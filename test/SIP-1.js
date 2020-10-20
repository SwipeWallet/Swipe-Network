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
const GOVERNANCEPROXY = require('../build/GovernanceProxy')
const GOVERNANCE = require('../build/Governance')
const GOVERNANCETIMELOCKPROXY = require('../build/GovernanceTimelockProxy')
const GOVERNANCETIMELOCK = require('../build/GovernanceTimelock')

describe('SIP-1 Tests', () => {
    const provider = new MockProvider({ total_accounts: 4 })
    const [walletGuardian, walletRewardProvider, proposer, voter] = provider.getWallets()
    let swipeToken
    let stakingProxy
    let staking
    let stakingV2
    let governanceTimelockProxy
    let governanceTimelock
    let governanceProxy
    let governance
    let votingDelay
    let votingPeriod
    let timelockDelay
    let proposerStakingAmount
    let voterStakingAmount
    let rewardPendingPeriod

    beforeEach(async () => {
        // Deploy all contracts
        swipeToken = await deployContract(proposer, SWIPETOKEN, [])
        stakingProxy = await deployContract(walletGuardian, STAKINGPROXY, [])
        staking = await deployContract(walletGuardian, STAKING, [])
        stakingV2 = await deployContract(walletGuardian, STAKINGV2, [])
        governanceTimelockProxy = await deployContract(walletGuardian, GOVERNANCETIMELOCKPROXY, [])
        governanceTimelock = await deployContract(walletGuardian, GOVERNANCETIMELOCK, [])
        governanceProxy = await deployContract(walletGuardian, GOVERNANCEPROXY, [])
        governance = await deployContract(walletGuardian, GOVERNANCE, [], { gasLimit: 4712388 })
        let calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletGuardian.address, swipeToken.address, walletRewardProvider.address])
        await stakingProxy.setImplementationAndCall(staking.address, calldata)
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

        // Get config
        votingDelay = await governanceImplementation._votingDelay()
        votingPeriod = await governanceImplementation._votingPeriod()
    })

    const fnPropose = async () => {
        const stakingImplementation = new ethers.Contract(stakingProxy.address, STAKINGV2.interface, proposer)
        const rewardCycle = await stakingImplementation._rewardCycle()
        const rewardAmount = await stakingImplementation._rewardAmount()
        rewardPendingPeriod = '604800'

        const proposalDescription = '# SIP-1'

        // 0. Assume staking ownership
        // 1. Assume staking guardianship
        // 2. Upgrade staking to v2
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

        const currentBlock = await provider.getBlock(await provider.getBlockNumber())
        const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, proposer)
        await expect(governanceImplementation.propose(targets, values, signatures, calldatas, proposalDescription)).to.emit(governanceImplementation, 'ProposalCreation').withArgs('1', proposer.address, targets, values, signatures, calldatas, currentBlock.number + 1 + Number(votingDelay), currentBlock.number + 1 + Number(votingDelay) + Number(votingPeriod), proposalDescription)
    }

    it('Propose', async () => {
        await fnPropose()
    })

    const fnVote = async () => {
        const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, voter)
        await expect(governanceImplementation.castVote('1', true)).to.emit(governanceImplementation, 'Vote').withArgs(voter.address, '1', true, voterStakingAmount)
    }

    it('Vote', async () => {
        await fnPropose()
        await fnVote()
    })

    const fnQueue = async () => {
        const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, proposer)
        await governanceImplementation.queue('1')
        const currentBlock = await provider.getBlock(await provider.getBlockNumber())
        const proposal = await governanceImplementation.getProposal('1')
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
        await expect(governanceImplementation.execute('1')).to.emit(governanceImplementation, 'ProposalExecution').withArgs('1')
    }

    it('Execute', async () => {
        await fnPropose()
        await fnVote()
        await fnQueue()
        await fnExecute()
    })

    const fnCheck = async () => {
        const stakingImplementation = new ethers.Contract(stakingProxy.address, STAKINGV2.interface, proposer)
        expect(await stakingImplementation._rewardPendingPeriod()).to.be.equal(rewardPendingPeriod)
        expect(await stakingImplementation.getStakedAmount(voter.address)).to.be.equal(voterStakingAmount)
    }

    it('Check', async () => {
        await fnPropose()
        await fnVote()
        await fnQueue()
        await fnExecute()
        await fnCheck()
    })
})