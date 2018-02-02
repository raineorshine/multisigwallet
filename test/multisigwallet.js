const MultiSigWallet = artifacts.require("./MultiSigWallet.sol")
const assert = require('assert')

const assertThrow = p => new Promise((resolve, reject) => {
  return p.then(reject).catch(resolve)
})

contract('MultiSigWallet', accounts => {

  it('should be deployable', async function() {
    await MultiSigWallet.new()
  })

})
