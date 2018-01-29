Retoosh.Preloader = function (game) { this.game = game;};

Retoosh.Preloader.prototype = {
  preload: function () {

	  game.load.atlasJSONArray('ingame', '/assets/spritesheets/ingame.png', '/assets/spritesheets/ingame.json');

	  //game.load.image('background', 'assets/textures/background.png')
      game.load.image('header', 'assets/textures/header.png')
      game.load.image('left', 'assets/textures/c_left.png')
      game.load.image('center', 'assets/textures/c_center.png')
      game.load.image('right', 'assets/textures/c_right.png')
      game.load.image('footer', 'assets/textures/footer.png')
      game.load.image('guest', 'assets/textures/btn_guest.png')
      game.load.image('guest_over', 'assets/textures/btn_guest_over.png')
      game.load.image('member', 'assets/textures/btn_member.png')
      game.load.image('member_over', 'assets/textures/btn_member_over.png')
      game.load.image('community', 'assets/textures/btn_community.png')
      game.load.image('community_over', 'assets/textures/btn_community_over.png')
	  game.load.image('soundon', 'assets/textures/soundon.png')
	  game.load.image('soundoff', 'assets/textures/soundoff.png')
	  game.load.image('donate_icon', 'assets/textures/donate_icon.png')

	  game.load.audio('death_snd', '/assets/sounds/death.wav');
	  game.load.audio('explosion_snd', '/assets/sounds/explosion.wav');
	  game.load.audio('pickup_snd', '/assets/sounds/pickup.wav');
	  game.load.audio('revive_snd', '/assets/sounds/revive.wav');
  },
  create: function () {
      this.game.state.start('Main');
  }
};
