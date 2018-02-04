## Usage

```
const multisig = await MultiSigWallet.at(0x123)
await multisig.createWallet(2, signers, { from: salt })
await multisig.deposit(0, { from: other, value: web3.toWei(0.1) })
const proposalResult = await multisig.proposeWithdrawal(0, other, web3.toWei(0.01), { from: salt })

// get multisigId for signing
const proposalLogs = findEventLogs(proposalResult, 'WithdrawalProposed')
const multisigId = proposalLogs.args.multisigId.toNumber()
const initialBalance = web3.eth.getBalance(other)

// sign
multisig.sign(multisigId, { from: borrower })

// execute withdrawal
const result = await multisig.executeWithdrawal(0, { from: other })

// assert event
const logs = findEventLogs(result, 'WithdrawalExecuted')
assert(logs)
assert.equal(logs.args.withdrawalId.toNumber(), 0)
assert.equal(logs.args.sender, other)
assert.equal(logs.args.to, other)
assert.equal(web3.fromWei(logs.args.amount).toNumber(), 0.01)

// assert balance
assertBalanceApprox(other, initialBalance.plus(web3.toWei(0.01)))
```

## Notes

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
