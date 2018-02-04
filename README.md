## Usage

```js
const multisig = await MultiSigWallet.at(0x123)

// create a wallet with 2/3 signers required for withdrawals
const creationResult = await multisig.createWallet(2, [salt, borrower, agent], { from: salt })

// anyone can deposit ETH into the wallet
const proposalLogs = findEventLogs(creationResult, 'WalletCreated')
const walletId = proposalLogs.args.id.toNumber()
await multisig.deposit(walletId, { from: other, value: web3.toWei(100) })

// a signer can propose a withdrawal to a specified address (this is the first signature)
const proposalResult = await multisig.proposeWithdrawal(walletId, destination, web3.toWei(10), { from: salt })

// a second signer is needed to reach quarum
const proposalLogs = findEventLogs(proposalResult, 'WithdrawalProposed')
const multisigId = proposalLogs.args.multisigId.toNumber()
multisig.sign(multisigId, { from: borrower })

// now the withdrawal can be executed by any signer
await multisig.executeWithdrawal(walletId, { from: agent })

// helper function
function findEventLogs(txResult, eventName) {
  return txResult.logs.find(log => log.event === eventName)
}
```

## Notes

- We cannot limit withdrawal proposals to the available balance as that would allow a single signer to fill up the withdrawal queue with phony withdrawals and block all other withdrawals.
- The creator of a withdrawal proposal *can* cancel the withdrawal after all signatures have been obtained, before the withdrawal has been excuted. This may be desirable if the deposit address is not payable.

## Installation

```
npm install
```

## Build

```
testrpc
truffle compile
truffle migrate --reset
truffle test
```
