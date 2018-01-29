var SOCKET = io();

var Retoosh = {
    WIDTH: 1500,
    HEIGHT: 1000
};

Retoosh.Boot = function (game) { };
Retoosh.Boot.prototype = {
  preload: function () {

  },

  create: function () {
      this.game.scale.scaleMode = Phaser.ScaleManager.SHOW_ALL;
      this.game.scale.parentIsWindow = false;
      this.game.scale.pageAlignVertically = true;
      this.game.scale.pageAlignHorizontally = true;
      this.game.stage.disableVisibilityChange = true;

	  this.game.add.plugin(PhaserInput.Plugin);

      this.game.state.start('Preloader');
  }
};
