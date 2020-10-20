
const timeTravel = require('./timeTravel')

const mineBlocks = async (provider, blocks) => {
  for (let i = 0; i < blocks; i++) {
    await timeTravel(provider, 15)
  }
}

module.exports = mineBlocks