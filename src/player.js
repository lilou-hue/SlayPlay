const { mainCharacterName } = require('./gameConfig');

class Player {
  constructor(name = mainCharacterName) {
    this.name = name;
  }
}

module.exports = Player;
