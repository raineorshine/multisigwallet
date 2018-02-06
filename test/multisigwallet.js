const MultiSigWallet = artifacts.require("./MultiSigWallet.sol")
const assert = require('assert')
const { assertThrow, assertBalanceApprox, findEventLogs } = require('./test-util.js')

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
      const logs = findEventLogs(result, 'WalletCreated')
      assert(logs)
      assert.equal(logs.args.id.toNumber(), 0)
      assert.equal(logs.args.sender, salt)
      assert.equal(logs.args.quarum.toNumber(), 2)
      assert.deepEqual(logs.args.signers, signers)
    })

    it('should get wallet info', async function() {
      const multisig = await MultiSigWallet.new()
      await multisig.createWallet(2, signers, { from: salt })

      const wallet = await multisig.wallets(0)
      assert.equal(wallet[WALLET_QUARUM].toNumber(), 2)
      assert.equal(wallet[WALLET_BALANCE].toNumber(), 0)

      const walletSigners = await multisig.getWalletSigners(0)
      assert.deepEqual(walletSigners, signers)
    })
  })

  describe('deposit', () => {
    it('should allow anyone to deposit to a wallet', async function() {
      const multisig = await MultiSigWallet.new()
      await multisig.createWallet(2, signers, { from: salt })
      const result = await multisig.deposit(0, { from: other, value: 123 })

      // assert event
      const logs = findEventLogs(result, 'WalletDeposited')
      assert(logs)
      assert.equal(logs.args.id.toNumber(), 0)
      assert.equal(logs.args.sender, other)
      assert.equal(logs.args.amount.toNumber(), 123)

      // assert balance
      const wallet = await multisig.wallets(0)
      assert.equal(wallet[WALLET_BALANCE].toNumber(), 123)
    })

    it('should not allow deposits to a nonexistent wallet', async function() {
      const multisig = await MultiSigWallet.new()
      await assertThrow(multisig.deposit(0, { from: other, value: 123 }))
    })
  })

  describe('proposeWithdrawal', () => {
    it('should allow a signer to propose a withdrawal', async function() {
      const multisig = await MultiSigWallet.new()
      await multisig.createWallet(2, signers, { from: salt })
      await multisig.deposit(0, { from: other, value: 123 })
      const result = await multisig.proposeWithdrawal(0, other, 100, { from: salt })

      // assert event
      const logs = findEventLogs(result, 'WithdrawalProposed')
      assert(logs)
      assert.equal(logs.args.walletId.toNumber(), 0)
      assert.equal(logs.args.sender, salt)
      assert.equal(logs.args.to, other)
      assert.equal(logs.args.multisigId, 0)
      assert.equal(logs.args.amount.toNumber(), 100)
    })

    it('should get withdrawal data', async function() {
      const multisig = await MultiSigWallet.new()
      await multisig.createWallet(2, signers, { from: salt })
      await multisig.deposit(0, { from: other, value: 123 })
      await multisig.proposeWithdrawal(0, other, 100, { from: salt })
      const withdrawal = await multisig.withdrawals(0)

      assert.equal(withdrawal[WITHDRAWAL_WALLETID].toNumber(), 0)
      assert.equal(withdrawal[WITHDRAWAL_CREATOR], salt)
      assert.equal(withdrawal[WITHDRAWAL_TO], other)
      assert.equal(withdrawal[WITHDRAWAL_MULTISIGID], 0)
      assert.equal(withdrawal[WITHDRAWAL_AMOUNT].toNumber(), 100)
      assert.equal(withdrawal[WITHDRAWAL_STATUS].toNumber(), 0)
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
      const logs = findEventLogs(result, 'WithdrawalCanceled')
      assert(logs)
      assert.equal(logs.event, 'WithdrawalCanceled')
      assert.equal(logs.args.withdrawalId.toNumber(), 0)
      assert.equal(logs.args.sender, salt)
    })

    it('should not allow a signer to cancel a withdrawal they did not propose', async function() {
      const multisig = await MultiSigWallet.new()
      await multisig.createWallet(2, signers, { from: salt })
      await multisig.deposit(0, { from: other, value: 123 })
      await multisig.proposeWithdrawal(0, other, 100, { from: salt })
      await assertThrow(multisig.cancelWithdrawal(0, { from: borrower }))
    })

    it('should not allow a signer to cancel a completed withdrawal', async function() {
      const multisig = await MultiSigWallet.new()
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
      await multisig.executeWithdrawal(0, { from: other })

      // cannot cancel completed withdrawal
      await assertThrow(multisig.cancelWithdrawal(0, { from: borrower }))
    })

  })

  describe('executeWithdrawal', () => {
    it('should allow a withdrawal with a quarum of signatures to be executed by any signer', async function() {
      const multisig = await MultiSigWallet.new()
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
      const result = await multisig.executeWithdrawal(0, { from: agent })

      // assert event
      const logs = findEventLogs(result, 'WithdrawalExecuted')
      assert(logs)
      assert.equal(logs.args.withdrawalId.toNumber(), 0)
      assert.equal(logs.args.sender, agent)
      assert.equal(logs.args.to, other)
      assert.equal(web3.fromWei(logs.args.amount).toNumber(), 0.01)

      // assert wallet balance
      const wallet = await multisig.wallets(0)
      assert.equal(web3.fromWei(wallet[WALLET_BALANCE]).toNumber(), 0.09)

      // assert ETH balance
      assertBalanceApprox(other, initialBalance.plus(web3.toWei(0.01)))
    })

    it('should not allow a withdrawal with a quarum of signatures to be executed by a non-signer', async function() {
      const multisig = await MultiSigWallet.new()
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
    })

    it('should allow a withdrawal with a different quarum of signatures to be executed', async function() {
      const multisig = await MultiSigWallet.new()
      await multisig.createWallet(2, signers, { from: salt })
      await multisig.deposit(0, { from: other, value: web3.toWei(0.1) })
      const initialBalance = web3.eth.getBalance(other)
      const proposalResult = await multisig.proposeWithdrawal(0, other, web3.toWei(0.01), { from: salt })

      // get multisigId for signing
      const proposalLogs = findEventLogs(proposalResult, 'WithdrawalProposed')
      const multisigId = proposalLogs.args.multisigId.toNumber()

      // sign
      await multisig.sign(multisigId, { from: agent }) // only difference from above test

      // execute withdrawal
      const result = await multisig.executeWithdrawal(0, { from: other })

      // assert event
      const logs = findEventLogs(result, 'WithdrawalExecuted')
      assert.equal(logs.event, 'WithdrawalExecuted')
      assert.equal(logs.args.withdrawalId.toNumber(), 0)
      assert.equal(logs.args.sender, other)
      assert.equal(logs.args.to, other)
      assert.equal(web3.fromWei(logs.args.amount).toNumber(), 0.01)

      // assert balance
      assertBalanceApprox(other, initialBalance.plus(web3.toWei(0.01)))
    })

    it('should not allow a withdrawal without a quarum of signatures to be executed', async function() {
      const multisig = await MultiSigWallet.new()
      await multisig.createWallet(2, signers, { from: salt })
      await multisig.deposit(0, { from: other, value: 123 })
      const proposalResult = await multisig.proposeWithdrawal(0, other, 100, { from: salt })

      // get multisigId for signing
      const logs = findEventLogs(proposalResult, 'WithdrawalProposed')
      const multisigId = logs.args.multisigId.toNumber()

      // execute withdrawal
      await assertThrow(multisig.executeWithdrawal(0, { from: other }))
    })

    it('should allow multiple independent withdrawals', async function() {
      const multisig = await MultiSigWallet.new()
      await multisig.createWallet(2, signers, { from: salt })
      await multisig.deposit(0, { from: other, value: web3.toWei(0.1) })
      const initialBalance = web3.eth.getBalance(other)

      await multisig.proposeWithdrawal(0, other, web3.toWei(0.010), { from: salt })
      await multisig.proposeWithdrawal(0, other, web3.toWei(0.015), { from: salt })
      await multisig.proposeWithdrawal(0, other, web3.toWei(0.020), { from: salt })

      // sign
      await multisig.sign(2, { from: borrower })
      await multisig.sign(1, { from: borrower })
      await multisig.sign(0, { from: borrower })

      // execute withdrawal and assert balance
      await multisig.executeWithdrawal(2, { from: salt })
      assertBalanceApprox(other, initialBalance.plus(web3.toWei(0.020)))

      // execute withdrawal and assert balance
      await multisig.executeWithdrawal(0, { from: salt })
      assertBalanceApprox(other, initialBalance.plus(web3.toWei(0.020 + 0.010)))

      // execute withdrawal and assert balance
      await multisig.executeWithdrawal(1, { from: salt })
      assertBalanceApprox(other, initialBalance.plus(web3.toWei(0.020 + 0.010 + 0.015)))
    })

    it('should allow total withdrawals to exceed balance, but disallow execution', async function() {
      const multisig = await MultiSigWallet.new()
      await multisig.createWallet(2, signers, { from: salt })
      await multisig.deposit(0, { from: other, value: web3.toWei(0.1) })
      const initialBalance = web3.eth.getBalance(other)

      await multisig.proposeWithdrawal(0, other, web3.toWei(0.04), { from: salt })
      await multisig.proposeWithdrawal(0, other, web3.toWei(0.04), { from: salt })
      await multisig.proposeWithdrawal(0, other, web3.toWei(0.04), { from: salt })

      // sign
      await multisig.sign(0, { from: borrower })
      await multisig.sign(1, { from: borrower })
      await multisig.sign(2, { from: borrower })

      // execute withdrawals as long as there is enough balance
      await multisig.executeWithdrawal(0, { from: salt })
      await multisig.executeWithdrawal(1, { from: salt })
      await assertThrow(multisig.executeWithdrawal(2, { from: salt }))
    })
  })

})
