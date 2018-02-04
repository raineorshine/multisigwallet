const MultiSigWallet = artifacts.require("./MultiSigWallet.sol")
const assert = require('assert')

const assertThrow = p => new Promise((resolve, reject) => {
  return p.then(reject).catch(resolve)
})

// struct indices
const [WALLET_QUARUM, WALLET_BALANCE] = [0,1,2]
const [WITHDRAWAL_WALLETID, WITHDRAWAL_CREATOR, WITHDRAWAL_TO, WITHDRAWAL_MULTISIGID, WITHDRAWAL_AMOUNT, WITHDRAWAL_STATUS] = [0,1,2,3,4,5,6]

contract('MultiSigWallet', accounts => {

  const [salt, borrower, agent] = accounts
  const signers = accounts.slice(0,3)
  const other = accounts[3]

  it('should be deployable', async function() {
    await MultiSigWallet.new()
  })

  it('should create a wallet', async function() {
    const multisig = await MultiSigWallet.new()
    const result = await multisig.createWallet(2, signers, { from: salt })

    // assert WalletCreated event
    assert.equal(result.logs.length, 1)
    assert.equal(result.logs[0].event, 'WalletCreated')
    assert.equal(result.logs[0].args.id.toNumber(), 0)
    assert.equal(result.logs[0].args.sender, salt)
    assert.equal(result.logs[0].args.quarum.toNumber(), 2)
    assert.deepEqual(result.logs[0].args.signers, signers)
  })

  it('should allow anyone to deposit to a wallet', async function() {
    const multisig = await MultiSigWallet.new()
    await multisig.createWallet(2, signers, { from: salt })
    const result = await multisig.deposit(0, { from: other, value: 123 })

    // assert WalletDeposited event
    assert.equal(result.logs.length, 1)
    assert.equal(result.logs[0].event, 'WalletDeposited')
    assert.equal(result.logs[0].args.id.toNumber(), 0)
    assert.equal(result.logs[0].args.sender, other)
    assert.equal(result.logs[0].args.amount.toNumber(), 123)

    // assert balance updated
    const wallet = await multisig.wallets(0)
    assert.equal(wallet[WALLET_BALANCE].toNumber(), 123)
  })

  it('should allow a signer to propose a withdrawal', async function() {
    const multisig = await MultiSigWallet.new()
    await multisig.createWallet(2, signers, { from: salt })
    await multisig.deposit(0, { from: other, value: 123 })
    const result = await multisig.proposeWithdrawal(0, other, 100, { from: salt })

    // assert WithdrawalProposed event
    assert.equal(result.logs[1].event, 'WithdrawalProposed')
    assert.equal(result.logs[1].args.walletId.toNumber(), 0)
    assert.equal(result.logs[1].args.sender, salt)
    assert.equal(result.logs[1].args.to, other)
    assert.equal(result.logs[1].args.multisigId, 0)
    assert.equal(result.logs[1].args.amount.toNumber(), 100)
  })

  it('should not allow a non-signer to propose a withdrawal', async function() {
    const multisig = await MultiSigWallet.new()
    await multisig.createWallet(2, signers, { from: salt })
    await multisig.deposit(0, { from: other, value: 123 })
    await assertThrow(multisig.proposeWithdrawal(0, other, 123, { from: other }))
  })

})
