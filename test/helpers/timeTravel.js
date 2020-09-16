const jsonrpc = '2.0'
const id = 0
const send = (provider, method, params = [], callback) =>
  provider.send({ id, jsonrpc, method, params }, callback)

const timeTravel = async (provider, seconds) => {
  await new Promise((resolve, reject) => {
    send(provider, 'evm_increaseTime', [seconds], () => {
      send(provider, 'evm_mine', [], () => {
        resolve()
      })
    })    
  })
}

module.exports = timeTravel