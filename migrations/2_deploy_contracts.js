const MultiSig = artifacts.require("./MultiSig.sol")
const MultiSigWallet = artifacts.require("./MultiSigWallet.sol")

module.exports = function(deployer) {
  const [salt, borrower, agent] = web3.eth.accounts

  // links each of the given libraries to the given Contract and then deploys the contract with the given arguments
  const deploy = (Contract, libs=[], args=[]) => {
    libs.forEach(lib => deployer.link(lib, Contract))
    deployer.deploy(Contract, ...args)
  }

  deploy(MultiSig)
  deploy(MultiSigWallet, [MultiSig], [salt, borrower, agent])
}
