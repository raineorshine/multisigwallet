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

  describe('createWallet', () => {
    it('should be deployable', async function() {
      await MultiSigWallet.new()
    })

    it('should create a wallet', async function() {
      const multisig = await MultiSigWallet.new()
      const result = await multisig.createWallet(2, signers, { from: salt })

      // assert event
      assert.equal(result.logs.length, 1)
      assert.equal(result.logs[0].event, 'WalletCreated')
      assert.equal(result.logs[0].args.id.toNumber(), 0)
      assert.equal(result.logs[0].args.sender, salt)
      assert.equal(result.logs[0].args.quarum.toNumber(), 2)
      assert.deepEqual(result.logs[0].args.signers, signers)
    })
  })

  describe('deposit', () => {
    it('should allow anyone to deposit to a wallet', async function() {
      const multisig = await MultiSigWallet.new()
      await multisig.createWallet(2, signers, { from: salt })
      const result = await multisig.deposit(0, { from: other, value: 123 })

      // assert event
      assert.equal(result.logs.length, 1)
      assert.equal(result.logs[0].event, 'WalletDeposited')
      assert.equal(result.logs[0].args.id.toNumber(), 0)
      assert.equal(result.logs[0].args.sender, other)
      assert.equal(result.logs[0].args.amount.toNumber(), 123)

      // assert event
      const wallet = await multisig.wallets(0)
      assert.equal(wallet[WALLET_BALANCE].toNumber(), 123)
    })
  })

  describe('proposeWithdrawal', () => {
    it('should allow a signer to propose a withdrawal', async function() {
      const multisig = await MultiSigWallet.new()
      await multisig.createWallet(2, signers, { from: salt })
      await multisig.deposit(0, { from: other, value: 123 })
      const result = await multisig.proposeWithdrawal(0, other, 100, { from: salt })

      // assert event
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

  describe('cancelWithdrawal', () => {
    it('should allow a signer to cancel a withdrawal they proposed', async function() {
      const multisig = await MultiSigWallet.new()
      await multisig.createWallet(2, signers, { from: salt })
      await multisig.deposit(0, { from: other, value: 123 })
      await multisig.proposeWithdrawal(0, other, 100, { from: salt })
      const result = await multisig.cancelWithdrawal(0, { from: salt })

      // assert event
      assert.equal(result.logs.length, 1)
      assert.equal(result.logs[0].event, 'WithdrawalCanceled')
      assert.equal(result.logs[0].args.withdrawalId.toNumber(), 0)
      assert.equal(result.logs[0].args.sender, salt)
    })

    it('should not allow a signer to cancel a withdrawal they did not propose', async function() {
      const multisig = await MultiSigWallet.new()
      await multisig.createWallet(2, signers, { from: salt })
      await multisig.deposit(0, { from: other, value: 123 })
      await multisig.proposeWithdrawal(0, other, 100, { from: salt })
      await assertThrow(multisig.cancelWithdrawal(0, { from: borrower }))
    })

    it.skip('should not allow a signer to cancel a completed withdrawal', async function() {
    })

  })

  describe('executeWithdrawal', () => {
    it.skip('should allow a completed withdrawal to be executed by anyone', async function() {
    })

    it.skip('should allow multiple independent withdrawals', async function() {
    })

    it.skip('should allow total withdrawals to exceed balance, but disallow execution', async function() {
    })
  })

})
