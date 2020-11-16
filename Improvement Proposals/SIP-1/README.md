# SIP-1

## Description

This proposal is to add reward pending period.
- Transfer staking's ownership and guardianship to governance timelock contract
- Upgrade statking contract to V2
- Set reward policy with reward pending period, a week

## Proposal

### Mainnet
```
Action1
address - 0xeE03e3D55d52A35ee364fce45CD1373E0f53F8D9
value - 0
signature - assumeOwnership()
calldata - void

Action2:
address - 0xeE03e3D55d52A35ee364fce45CD1373E0f53F8D9
value - 0
signature - assumeGuardianship()
calldata - void

Action3:
address - 0xeE03e3D55d52A35ee364fce45CD1373E0f53F8D9
value - 0
signature - setImplementation(address)
calldata - 0xc85D3D2DEfCD3B1027D0A8259759b42c252fB943

Action4:
address - 0xeE03e3D55d52A35ee364fce45CD1373E0f53F8D9
value - 0
signature - setRewardPolicy(uint256,uint256,uint256)
calldata - 1800, 400000000000000000000, 604800 // a week
```

### Ropsten
```
Action1
address - 0x5CbFed5729bd873132e3E975273d301D8342dE11
value - 0
signature - assumeOwnership()
calldata - void

Action2:
address - 0x5CbFed5729bd873132e3E975273d301D8342dE11
value - 0
signature - assumeGuardianship()
calldata - void

Action3:
address - 0x5CbFed5729bd873132e3E975273d301D8342dE11
value - 0
signature - setImplementation(address)
calldata - 0xbfB3B39782D66Ca3414c3F32EFE2686374Bc5ACB

Action4:
address - 0x5CbFed5729bd873132e3E975273d301D8342dE11
value - 0
signature - setRewardPolicy(uint256,uint256,uint256)
calldata - 1800, 400000000000000000000, 604800 // a week
```

## Changes
- [StakingV2.sol](https://github.com/SwipeWallet/Swipe-Network/blob/master/contracts/staking/StakingV2.sol)
- [StakingStorageV2.sol](https://github.com/SwipeWallet/Swipe-Network/blob/master/contracts/staking/StakingStorageV3.sol)
- [StakingEventV2.sol](https://github.com/SwipeWallet/Swipe-Network/blob/master/contracts/staking/StakingEventV2.sol)

## Tests
- [SIP-1.js](https://github.com/SwipeWallet/Swipe-Network/blob/master/test/SIP-1.js)
- [StakingV2Test.js](https://github.com/SwipeWallet/Swipe-Network/blob/master/test/StakingV2Test.js)
