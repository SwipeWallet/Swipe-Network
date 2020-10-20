# SIP-2

## Description

This proposal is to add minimum withdrawable age of users stakes
- Upgrade statking contract to V3
- Set minimum withdrawable age to 2 days

## Proposal

### Mainnet
```
Action1
address - 0xeE03e3D55d52A35ee364fce45CD1373E0f53F8D9
value - 0
signature - setImplementation(address)
calldata - [Staking V3 contract address]

Action2:
address - 0xeE03e3D55d52A35ee364fce45CD1373E0f53F8D9
value - 0
signature - setMinimumWithdrawableAge(uint256)
calldata - 11520 // 2 days
```

### Ropsten
```
Action1
address - 0x5CbFed5729bd873132e3E975273d301D8342dE11
value - 0
signature - setImplementation(address)
calldata - [Staking V3 contract address]

Action2:
address - 0x5CbFed5729bd873132e3E975273d301D8342dE11
value - 0
signature - setMinimumWithdrawableAge(uint256)
calldata - 11520 // 2 days
```

## Changes
- [StakingV3.js](https://github.com/SwipeWallet/Swipe-Network/blob/feature/SIP-2/contracts/staking/StakingV3.sol)
- [StakingStorageV3.js](https://github.com/SwipeWallet/Swipe-Network/blob/feature/SIP-2/contracts/staking/StakingStorageV3.sol)
- [StakingEventV3.js](https://github.com/SwipeWallet/Swipe-Network/blob/feature/SIP-2/contracts/staking/StakingEventV3.sol)

## Tests
- [SIP-2.js](https://github.com/SwipeWallet/Swipe-Network/blob/feature/SIP-2/test/SIP-2.js)
- [StakingV3Test.js](https://github.com/SwipeWallet/Swipe-Network/blob/feature/SIP-2/test/StakingV3Test.js)
