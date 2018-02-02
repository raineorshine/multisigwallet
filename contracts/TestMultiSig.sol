pragma solidity ^0.4.15;

import './MultiSig.sol';

/** A basic contract to test MultiSig functionality. */
contract TestMultiSig is MultiSig {

  function addMultiSigProxy(uint _quarum, address[] _signers) public {
    super.addMultiSig(_quarum, _signers);
  }

  function signAsProxy(uint index, address signer) public {
    super.signAs(index, signer);
  }
}
