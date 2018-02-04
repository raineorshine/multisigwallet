const MultiSigWallet = artifacts.require("./MultiSigWallet.sol")
const assert = require('assert')

const assertThrow = p => new Promise((resolve, reject) => {
  return p.then(reject).catch(resolve)
})

// struct indices
const [WALLET_QUARUM, WALLET_BALANCE] = [0,1,2]
const [WITHDRAWAL_WALLETID, WITHDRAWAL_CREATOR, WITHDRAWAL_TO, WITHDRAWAL_MULTISIGID, WITHDRAWAL_AMOUNT, WITHDRAWAL_STATUS] = [0,1,2,3,4,5,6]

contract('MultiSigWallet', accounts => {

  const signers = [salt, borrower, agent] = accounts
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

  it.only('should allow anyone to deposit to a wallet', async function() {
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

})
