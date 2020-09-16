const ethers = require('ethers')

function encodeParameters(args, values) {
  const abi = new ethers.utils.AbiCoder();
  return abi.encode(args, values);
}

module.exports = encodeParameters