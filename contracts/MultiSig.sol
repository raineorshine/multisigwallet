pragma solidity ^0.4.15;

/*
MultiSig inheritable contract. Allows multiple one-off multisigs.

Usage:
1. Inherit main contract from MultiSig
2. Call addMultiSig with the expected signers each time a multisig is needed
3. Signers can call
*/

contract MultiSig {

  /***********************************************************
   * EVENTS
   ***********************************************************/

  event MultiSigAdded(uint index, uint quarum, address[] signers);
  event MultiSigSigned(uint index, address signer);
  event MultiSigCompleted(uint index);

  /***********************************************************
   * DATA
   ***********************************************************/

  struct MultiSigData {
    // the minimum number of signatures required to execute
    // must be at least 1; used to determine existence within multisigs mapping
    uint quarum;

    // the addresses that can sign
    address[] signers;

    // the signatures from signers
    mapping (address => bool) signatures;

    // record when a multisig is MultiSigcompleted to avoid recalculating every time
    bool completed;
  }

  MultiSigData[] internal multisigs;

  /***********************************************************
   * MODIFIERS
   ***********************************************************/

  // throw if a quarum of signatures has not been reached
  modifier onlyMultiSig(uint index) {
    require(isComplete(index));
    _;
  }

  /***********************************************************
   * INTERNAL
   ***********************************************************/

  function addMultiSig(uint _quarum, address[] _signers) internal {

    // quarum must be at least 1 (used to determine existence)
    require(_quarum > 0);

    // autoincrement
    uint index = multisigs.length;

    // create new multisig
    multisigs.push(MultiSigData(_quarum, _signers, false));

    // log
    MultiSigAdded(index, _quarum, _signers);
  }

  // sign as any address
  // INTERNAL ONLY
  // useful for relays or other abstraction methods
  function signAs(uint index, address signer) internal {

    // do not allow signer to sign more than once
    if (multisigs[index].signatures[signer]) revert();

    // record the new signature
    multisigs[index].signatures[signer] = true;

    // if already MultiSigcompleted, return immediately without firing events
    if (multisigs[index].completed) return;

    // log
    MultiSigSigned(index, signer);

    // check for completion
    if (isCompleteCheck(index)) {
      multisigs[index].completed = true;
      MultiSigCompleted(index);
    }
  }

  // returns true if a quarum of signatures has been reached
  function isCompleteCheck(uint index) internal constant returns(bool) {
    uint256 count = 0;
    for (uint256 i=0; i<multisigs[index].signers.length; i++) {
      if (multisigs[index].signatures[multisigs[index].signers[i]]) {
        if (++count >= multisigs[index].quarum) {
          return true;
        }
      }
    }
    return false;
  }

  /***********************************************************
   * NON-CONSTANT PUBLIC FUNCTIONS
   ***********************************************************/

  function sign(uint index) public {
    signAs(index, msg.sender);
  }

  /***********************************************************
   * CONSTANT FUNCTIONS
   ***********************************************************/

  // gets the quarum for a given multisig
  function getQuarum(uint index) public constant returns(uint) {
    return multisigs[index].quarum;
  }

  // gets the signers for a given multisig
  function getSigners(uint index) public constant returns(address[]) {
    return multisigs[index].signers;
  }

  // returns true if the given multisig has been MultiSigcompleted in O(1)
  function isComplete(uint index) public constant returns(bool) {
    return multisigs[index].completed;
  }

  // returns true if the given signer has MultiSigsigned
  function hasSigned(uint index, address signer) public constant returns(bool) {
    return multisigs[index].signatures[signer];
  }
}
