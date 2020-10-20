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
const STAKINGV2 = require('../build/StakingV2')
const GOVERNANCEPROXY = require('../build/GovernanceProxy')
const GOVERNANCE = require('../build/Governance')
const GOVERNANCETIMELOCKPROXY = require('../build/GovernanceTimelockProxy')
const GOVERNANCETIMELOCK = require('../build/GovernanceTimelock')

describe('SXP with Governance Tests', () => {
    const provider = new MockProvider({ total_accounts: 4 })
    const [walletGuardian, walletRewardProvider, proposer, voter] = provider.getWallets()
    let swipeToken
    let stakingProxy
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
    let sxpNewTotalSupply
    let amountToBurn

    beforeEach(async () => {
        // Deploy all contracts
        swipeToken = await deployContract(proposer, SWIPETOKEN, [])
        stakingProxy = await deployContract(walletGuardian, STAKINGPROXY, [])
        stakingV2 = await deployContract(walletGuardian, STAKINGV2, [])
        governanceTimelockProxy = await deployContract(walletGuardian, GOVERNANCETIMELOCKPROXY, [])
        governanceTimelock = await deployContract(walletGuardian, GOVERNANCETIMELOCK, [])
        governanceProxy = await deployContract(walletGuardian, GOVERNANCEPROXY, [])
        governance = await deployContract(walletGuardian, GOVERNANCE, [], { gasLimit: 4712388 })
        let calldata = getCalldata('initialize', ['address', 'address', 'address'], [walletGuardian.address, swipeToken.address, walletRewardProvider.address])
        await stakingProxy.setImplementationAndCall(stakingV2.address, calldata)
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
        const stakingImplementationByProposer = new ethers.Contract(stakingProxy.address, STAKINGV2.interface, proposer)
        await stakingImplementationByProposer.stake(proposerStakingAmount)
        voterStakingAmount = '1000000000000000000000'
        await swipeToken.transfer(voter.address, voterStakingAmount)
        await swipeToken.connect(voter).approve(stakingProxy.address, voterStakingAmount)
        const stakingImplementationByVoter = new ethers.Contract(stakingProxy.address, STAKINGV2.interface, voter)
        await stakingImplementationByVoter.stake(voterStakingAmount)

        // Transfer swipe token ownership to governance timelock
        await swipeToken.transferOwnership(governanceTimelockProxy.address)

        // Transfer amount to governance timelock to burn
        amountToBurn = '1000000000000000000000'
        await swipeToken.transfer(governanceTimelockProxy.address, amountToBurn)

        // Get config
        votingDelay = await governanceImplementation._votingDelay()
        votingPeriod = await governanceImplementation._votingPeriod()

        // Get SXP total supply
        sxpNewTotalSupply = '299999000000000000000000000'
    })

    it('Burn and LockUser', async () => {
        // Propose        
        {
            const proposalDescription = '# Burn and LockUser'

            // 0. Burn `amountToBurn`
            // 1. Lock proposer
            const targets = [
                swipeToken.address,
                swipeToken.address
            ]
            const values = [
                '0',
                '0'
            ]
            const signatures = [
                'burn(uint256)',
                'lockUser(address)'
            ]
            const calldatas = [
                encodeParameters(['uint256'], [amountToBurn]),
                encodeParameters(['address'], [proposer.address])
            ]

            const currentBlock = await provider.getBlock(await provider.getBlockNumber())
            const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, proposer)
            await expect(governanceImplementation.propose(targets, values, signatures, calldatas, proposalDescription)).to.emit(governanceImplementation, 'ProposalCreation').withArgs('1', proposer.address, targets, values, signatures, calldatas, currentBlock.number + 1 + Number(votingDelay), currentBlock.number + 1 + Number(votingDelay) + Number(votingPeriod), proposalDescription)
        }

        // Vote
        {
            const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, voter)
            await expect(governanceImplementation.castVote('1', true)).to.emit(governanceImplementation, 'Vote').withArgs(voter.address, '1', true, voterStakingAmount)
        }

        // Queue
        {
            const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, proposer)
            await governanceImplementation.queue('1')
            const currentBlock = await provider.getBlock(await provider.getBlockNumber())
            const proposal = await governanceImplementation.getProposal('1')
            expect(proposal.eta).to.be.equal(currentBlock.timestamp + timelockDelay)
        }
        
        // Execute
        {
            await timeTravel(provider.provider, timelockDelay)
            const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, proposer)
            await expect(governanceImplementation.execute('1')).to.emit(governanceImplementation, 'ProposalExecution').withArgs('1')
        }

        // Check
        {
            const amountToTransfer = '1000000000000000000'
            expect(await swipeToken.totalSupply()).to.be.equal(sxpNewTotalSupply)
            await expect(swipeToken.transfer(governanceTimelockProxy.address, amountToTransfer)).to.be.reverted
        }
    })

    it('UnlockUser and FreezeSXP', async () => {
        // Propose        
        {
            const proposalDescription = '# UnlockUser and FreezeSXP'

            // 0. Unlock proposer
            // 1. Freeze SXP
            const targets = [
                swipeToken.address,
                swipeToken.address
            ]
            const values = [
                '0',
                '0'
            ]
            const signatures = [
                'unlockUser(address)',
                'freeze()'
            ]
            const calldatas = [
                encodeParameters(['address'], [proposer.address]),
                encodeParameters([], [])
            ]

            const currentBlock = await provider.getBlock(await provider.getBlockNumber())
            const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, proposer)
            await expect(governanceImplementation.propose(targets, values, signatures, calldatas, proposalDescription)).to.emit(governanceImplementation, 'ProposalCreation').withArgs('1', proposer.address, targets, values, signatures, calldatas, currentBlock.number + 1 + Number(votingDelay), currentBlock.number + 1 + Number(votingDelay) + Number(votingPeriod), proposalDescription)
        }

        // Vote
        {
            const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, voter)
            await expect(governanceImplementation.castVote('1', true)).to.emit(governanceImplementation, 'Vote').withArgs(voter.address, '1', true, voterStakingAmount)
        }

        // Queue
        {
            const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, proposer)
            await governanceImplementation.queue('1')
            const currentBlock = await provider.getBlock(await provider.getBlockNumber())
            const proposal = await governanceImplementation.getProposal('1')
            expect(proposal.eta).to.be.equal(currentBlock.timestamp + timelockDelay)
        }
        
        // Execute
        {
            await timeTravel(provider.provider, timelockDelay)
            const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, proposer)
            await expect(governanceImplementation.execute('1')).to.emit(governanceImplementation, 'ProposalExecution').withArgs('1')
        }

        // Check
        {
            const amountToTransfer = '1000000000000000000'
            await expect(swipeToken.transfer(governanceTimelockProxy.address, amountToTransfer)).to.be.reverted
        }
    })

    it('UnfreezeSXP', async () => {
        // Propose        
        {
            const proposalDescription = '# UnfreezeSXP'

            // 0. Unfreeze SXP
            const targets = [
                swipeToken.address
            ]
            const values = [
                '0'
            ]
            const signatures = [
                'unfreeze()'
            ]
            const calldatas = [
                encodeParameters([], [])
            ]

            const currentBlock = await provider.getBlock(await provider.getBlockNumber())
            const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, proposer)
            await expect(governanceImplementation.propose(targets, values, signatures, calldatas, proposalDescription)).to.emit(governanceImplementation, 'ProposalCreation').withArgs('1', proposer.address, targets, values, signatures, calldatas, currentBlock.number + 1 + Number(votingDelay), currentBlock.number + 1 + Number(votingDelay) + Number(votingPeriod), proposalDescription)
        }

        // Vote
        {
            const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, voter)
            await expect(governanceImplementation.castVote('1', true)).to.emit(governanceImplementation, 'Vote').withArgs(voter.address, '1', true, voterStakingAmount)
        }

        // Queue
        {
            const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, proposer)
            await governanceImplementation.queue('1')
            const currentBlock = await provider.getBlock(await provider.getBlockNumber())
            const proposal = await governanceImplementation.getProposal('1')
            expect(proposal.eta).to.be.equal(currentBlock.timestamp + timelockDelay)
        }
        
        // Execute
        {
            await timeTravel(provider.provider, timelockDelay)
            const governanceImplementation = new ethers.Contract(governanceProxy.address, GOVERNANCE.interface, proposer)
            await expect(governanceImplementation.execute('1')).to.emit(governanceImplementation, 'ProposalExecution').withArgs('1')
        }

        // Check
        {
            const amountToTransfer = '1000000000000000000'
            await expect(swipeToken.transfer(voter.address, amountToTransfer)).to.emit(swipeToken, 'Transfer').withArgs(proposer.address, voter.address, amountToTransfer)
        }
    })
})