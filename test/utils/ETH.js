"use strict";

const BigNumber = require('bignumber.js');
const ethers = require('ethers');

function encodeParameters(types, values) {
  const abi = new ethers.utils.AbiCoder();
  return abi.encode(types, values);
}

function keccak256(values) {
  return ethers.utils.keccak256(values);
}

function etherUnsigned(num) {
  return ethers.utils.bigNumberify(new BigNumber(num).toFixed());
}

async function freezeTime(seconds) {
  await rpc({ method: 'evm_freezeTime', params: [seconds] });
  return rpc({ method: 'evm_mine' });
}

module.exports = {
  encodeParameters,
  keccak256,
  etherUnsigned,
  freezeTime
} 