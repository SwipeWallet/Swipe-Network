require('dotenv').config()
const {use, expect} = require('chai')
const {MockProvider, deployContract, solidity} = require('ethereum-waffle')
const ethers = require('ethers')

use(solidity)

const getCalldata = require('./helpers/getCalldata')
const encodeParameters = require('./helpers/encodeParameters')
const timeTravel = require('./helpers/timeTravel')
const mineBlocks = require('./helpers/mineBlocks')

const SWIPETOKEN = require("../build/SwipeToken")
const STAKINGPROXY = require('../build/StakingProxy')
const STAKING = require('../build/Staking')
const STAKINGV2 = require('../build/StakingV2')
const STAKINGV3 = require('../build/StakingV3')
const GOVERNANCEPROXY = require('../build/GovernanceProxy')
const GOVERNANCE = require('../build/Governance')
const GOVERNANCETIMELOCKPROXY = require('../build/GovernanceTimelockProxy')
const GOVERNANCETIMELOCK = require('../build/GovernanceTimelock')

describe('SIP-2 Tests', () => {
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
    let minimumWithdrawableAge
    let stakedBlockNumber

    beforeEach(async () => {
        // Deploy all contracts
        swipeToken = await deployContract(proposer, SWIPETOKEN, [])
        stakingProxy = await deployContract(walletGuardian, STAKINGPROXY, [])
        staking = await deployContract(walletGuardian, STAKING, [])
        stakingV2 = await deployContract(walletGuardian, STAKINGV2, [])
        stakingV3 = await deployContract(walletGuardian, STAKINGV3, [])
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
        stakedBlockNumber = await provider.getBlockNumber()
  
        // Authorize staking ownership transfer to governance timelock
        await stakingProxy.authorizeOwnershipTransfer(governanceTimelockProxy.address)
        const stakingImplementation = new ethers.Contract(stakingProxy.address, STAKING.interface, walletGuardian)
        await stakingImplementation.authorizeGuardianshipTransfer(governanceTimelockProxy.address)

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
        minimumWithdrawableAge = 240 // just for test, an hour

        const proposalDescription = '# SIP-2'

        // 1. Upgrade staking v2 to v3
        // 2. Set minimum withdrawable age
        const targets = [
            stakingProxy.address,
            stakingProxy.address
        ]
        const values = [
            '0',
            '0'
        ]
        const signatures = [
            'setImplementation(address)',
            'setMinimumWithdrawableAge(uint256)'
        ]
        const calldatas = [
            encodeParameters(['address'], [stakingV3.address]),
            encodeParameters(['uint256'], [minimumWithdrawableAge])
        ]

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
        const stakingImplementation = new ethers.Contract(stakingProxy.address, STAKINGV3.interface, proposer)
        expect(await stakingImplementation._minimumWithdrawableAge()).to.be.equal(minimumWithdrawableAge)
        expect(await stakingImplementation.getWithdrawableStakedAmount(voter.address)).to.be.equal('0')
        const blocksToMine = minimumWithdrawableAge + stakedBlockNumber - await provider.getBlockNumber()
        await mineBlocks(provider.provider, blocksToMine)
        expect(await stakingImplementation.getWithdrawableStakedAmount(voter.address)).to.be.equal(voterStakingAmount)
    }

    it('Check', async () => {
        await fnPropose()
        await fnVote()
        await fnQueue()
        await fnExecute()
        await fnCheck()
    })
})