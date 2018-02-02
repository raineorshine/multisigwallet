const assertThrow = p => new Promise((resolve, reject) => {
  return p.then(reject).catch(resolve)
})

/** Returns true if the difference between the two values is less than the given margin of error */
const within = (margin, a, b) => {
  // BigInt duck typing
  return a.minus && a.abs && a.cmp
    ? a.minus(b).abs().cmp(margin) === -1
    : Math.abs(a - b) < margin
}

/** Returns true if the balance of the given address is within "margin" of "value". Supports BigInt values. Useful for ignoring gas costs. */
const assertBalanceWithin = (margin, address, value, msg) => {
  const balance = web3.eth.getBalance(address)
  return assert(within(margin, balance, value), msg || `Balance of ${web3.fromWei(balance)} ETH not within ${web3.fromWei(margin)} ETH of expected ${web3.fromWei(value)} ETH. ${web3.fromWei(balance.minus(value))} ETH from expected value.`)
}

/** Asserts that the balance of the given address is within 0.01 ETH of "value". Useful for ignoring gas costs. */
const assertBalanceApprox = (address, value, msg) => assertBalanceWithin(web3.toWei(0.01), address, value, msg)

const sleep = seconds => new Promise((resolve, reject) => {
  setTimeout(resolve, seconds * 1000)
})

module.exports = {
  assertThrow,
  assertBalanceApprox,
  assertBalanceWithin,
  sleep,
  within
}
