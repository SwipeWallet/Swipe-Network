# SIP-3

## Description

This proposal is to add swipe card list into swipe cards contract.
- Transfer swipe cards contract's ownership and guardianship to governance timelock contract
- Register 4 swipe cards, Swipe Saffron, Swipe Sky, Swipe Steel, Swipe Slate

## Proposal

### Mainnet
```
Action1
address - Swipe Cards Proxy contract address
value - 0
signature - assumeOwnership()
calldata - void

Action2:
address - Swipe Cards Proxy contract address
value - 0
signature - assumeGuardianship()
calldata - void

Action3:
address - Swipe Cards Proxy contract address
value - 0
signature - registerCard(string,uint256,uint256,string,string)
calldata - Swipe Saffron, 0, 0, 0, 0

Action4:
address - Swipe Cards Proxy contract address
value - 0
signature - registerCard(string,uint256,uint256,string,string)
calldata - Swipe Sky, 300000000000000000000, 15552000, 0, 0

Action5:
address - Swipe Cards Proxy contract address
value - 0
signature - registerCard(string,uint256,uint256,string,string)
calldata - Swipe Steel, 3000000000000000000000, 15552000, 0, 0

Action6:
address - Swipe Cards Proxy contract address
value - 0
signature - registerCard(string,uint256,uint256,string,string)
calldata - Swipe Slate, 30000000000000000000000, 15552000, 0, 0
```

### Ropsten
```
Action1
address - 0xB23Fa86E875F4276D672f600b1Fe51B24A296c1b // Swipe Cards Proxy contract address
value - 0
signature - assumeOwnership()
calldata - void

Action2:
address - 0xB23Fa86E875F4276D672f600b1Fe51B24A296c1b // Swipe Cards Proxy contract address
value - 0
signature - assumeGuardianship()
calldata - void

Action3:
address - 0xB23Fa86E875F4276D672f600b1Fe51B24A296c1b // Swipe Cards Proxy contract address
value - 0
signature - registerCard(string,uint256,uint256,string,string)
calldata - Swipe Saffron, 0, 0, 0, 0

Action4:
address - 0xB23Fa86E875F4276D672f600b1Fe51B24A296c1b // Swipe Cards Proxy contract address
value - 0
signature - registerCard(string,uint256,uint256,string,string)
calldata - Swipe Sky, 300000000000000000000, 15552000, 0, 0

Action5:
address - 0xB23Fa86E875F4276D672f600b1Fe51B24A296c1b // Swipe Cards Proxy contract address
value - 0
signature - registerCard(string,uint256,uint256,string,string)
calldata - Swipe Steel, 3000000000000000000000, 15552000, 0, 0

Action6:
address - 0xB23Fa86E875F4276D672f600b1Fe51B24A296c1b // Swipe Cards Proxy contract address
value - 0
signature - registerCard(string,uint256,uint256,string,string)
calldata - Swipe Slate, 30000000000000000000000, 15552000, 0, 0
```

## Changes
- [SwipeCardsProxy.sol](https://github.com/SwipeWallet/Swipe-Network/blob/master/contracts/card/SwipeCardsProxy.sol)
- [SwipeCards.sol](https://github.com/SwipeWallet/Swipe-Network/blob/master/contracts/card/SwipeCards.sol)
- [SwipeCardsStorage.sol](https://github.com/SwipeWallet/Swipe-Network/blob/master/contracts/card/SwipeCardsStorage.sol)
- [SwipeCardsEvent.sol](https://github.com/SwipeWallet/Swipe-Network/blob/master/contracts/card/SwipeCardsEvent.sol)

## Tests
- [SIP-3.js](https://github.com/SwipeWallet/Swipe-Network/blob/master/test/SIP-3.js)
- [SwipeCardsTest.js](https://github.com/SwipeWallet/Swipe-Network/blob/master/test/SwipeCardsTest.js)
