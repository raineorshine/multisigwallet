const TestMultiSig = artifacts.require("./TestMultiSig.sol")
const assert = require('assert')

const assertThrow = p => new Promise((resolve, reject) => {
  return p.then(reject).catch(resolve)
})

contract('TestMultiSig', accounts => {

  it('should be deployable', async function() {
    await TestMultiSig.new()
  })

  it('should not expose private/internal functions', async function() {
    const multisig = await TestMultiSig.new()
    assert(!multisig.addMultiSig)
    assert(!multisig.signAs)
  })

  it('should create a new multisig', async function() {
    const multisig = await TestMultiSig.new()
    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
  })

  it('should fire MultiSigAdded', async function() {
    const multisig = await TestMultiSig.new()
    const result = await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    assert.equal(result.logs.length, 1)
    assert.equal(result.logs[0].event, 'MultiSigAdded')
    assert.equal(result.logs[0].args.index.toNumber(), 0)
    assert.equal(result.logs[0].args.quarum.toNumber(), 2)
    assert.deepEqual(result.logs[0].args.signers, [accounts[0], accounts[1], accounts[2]])
  })

  it('should get the quarum', async function() {
    const multisig = await TestMultiSig.new()
    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    const quarum = await multisig.getQuarum(0)
    assert.equal(quarum.toNumber(), 2)
  })

  it('should get the signers', async function() {
    const multisig = await TestMultiSig.new()
    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    const signers = await multisig.getSigners(0)
    assert.deepEqual(signers, [accounts[0], accounts[1], accounts[2]])
  })

  it('should check if a signer has NOT MultiSigSigned', async function() {
    const multisig = await TestMultiSig.new()
    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    assert(!await multisig.hasSigned(0, accounts[1]))
  })

  it('should check if a signer HAS MultiSigSigned', async function() {
    const multisig = await TestMultiSig.new()
    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    await multisig.sign(0, { from: accounts[1] })
    assert(await multisig.hasSigned(0, accounts[1]))
  })

  it('should fire MultiSigSigned', async function() {
    const multisig = await TestMultiSig.new()
    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    const result = await multisig.sign(0, { from: accounts[1] })
    assert.equal(result.logs.length, 1)
    assert.equal(result.logs[0].event, 'MultiSigSigned')
    assert.equal(result.logs[0].args.index.toNumber(), 0)
    assert.equal(result.logs[0].args.signer, accounts[1])
  })

  it('should not allow a signer to sign twice', async function() {
    const multisig = await TestMultiSig.new()
    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    await multisig.sign(0, { from: accounts[1] })
    await assertThrow(multisig.sign(0, { from: accounts[1] }))
  })

  it('should sign on behalf of an account (internal)', async function() {
    const multisig = await TestMultiSig.new()
    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    await multisig.signAsProxy(0, accounts[1])
    assert(await multisig.hasSigned(0, accounts[1]))
  })

  it('should check if the multisig is complete', async function() {
    const multisig = await TestMultiSig.new()
    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    assert(!await multisig.isComplete(0))
    await multisig.sign(0, { from: accounts[1] })
    assert(!await multisig.isComplete(0))
    await multisig.sign(0, { from: accounts[2] })
    assert(await multisig.isComplete(0))
  })

  it('should fire MultiSigCompleted', async function() {
    const multisig = await TestMultiSig.new()
    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    await multisig.sign(0, { from: accounts[1] })
    const result = await multisig.sign(0, { from: accounts[2] })

    assert.equal(result.logs.length, 2)
    assert.equal(result.logs[1].event, 'MultiSigCompleted')
    assert.equal(result.logs[1].args.index.toNumber(), 0)
  })

  it('should allow multiple signers with the same address', async function() {
    const multisig = await TestMultiSig.new()
    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[1]])
    const result = await multisig.sign(0, { from: accounts[1] })

    assert.equal(result.logs.length, 2)
    assert.equal(result.logs[1].event, 'MultiSigCompleted')
    assert.equal(result.logs[1].args.index.toNumber(), 0)
  })

  it('should allow beyond quarum', async function() {
    const multisig = await TestMultiSig.new()
    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    await multisig.sign(0, { from: accounts[1] })
    await multisig.sign(0, { from: accounts[2] })
    await multisig.sign(0, { from: accounts[3] })
    assert(await multisig.isComplete(0))
  })

  it('should NOT fire MultiSigSigned or isComplete after isComplete', async function() {
    const multisig = await TestMultiSig.new()
    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    await multisig.sign(0, { from: accounts[0] })
    await multisig.sign(0, { from: accounts[1] })
    const result = await multisig.sign(0, { from: accounts[2] })

    assert.equal(result.logs.length, 0)
  })

  it('should allow signatures in any order', async function() {
    const multisig = await TestMultiSig.new()
    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    await multisig.sign(0, { from: accounts[2] })
    await multisig.sign(0, { from: accounts[1] })
    assert(await multisig.isComplete(0))
  })

  it('should allow multiple multisigs', async function() {
    const multisig = await TestMultiSig.new()
    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    await multisig.sign(0, { from: accounts[1] })

    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    await multisig.sign(1, { from: accounts[0] })
    await multisig.sign(1, { from: accounts[1] })
    assert(await multisig.isComplete(1))
    assert(!await multisig.isComplete(0))
  })

  it('should allow any quarum of signatures', async function() {
    const multisig = await TestMultiSig.new()
    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    await multisig.sign(0, { from: accounts[0] })
    await multisig.sign(0, { from: accounts[2] })
    assert(await multisig.isComplete(0))

    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    await multisig.sign(1, { from: accounts[1] })
    await multisig.sign(1, { from: accounts[2] })
    assert(await multisig.isComplete(1))

    await multisig.addMultiSigProxy(2, [accounts[0], accounts[1], accounts[2]])
    await multisig.sign(2, { from: accounts[2] })
    await multisig.sign(2, { from: accounts[0] })
    assert(await multisig.isComplete(2))
  })

})
