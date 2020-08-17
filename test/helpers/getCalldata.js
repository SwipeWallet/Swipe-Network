const abi = require('ethereumjs-abi')

function getCalldata(funcName, args, values) {
  const funcSignature = abi.methodID(funcName, args).toString('hex')
  const valuesEncoded = abi.rawEncode(args, values).toString('hex')
  return '0x' + funcSignature + valuesEncoded
}

module.exports = getCalldata