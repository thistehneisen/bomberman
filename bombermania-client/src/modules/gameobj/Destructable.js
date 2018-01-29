function Destructable(game){
	Phaser.Sprite.call(this, game, 0, 0, 'ingame', "objects/destructable");

	this.type = "destructable";
	this.width = TILE_SIZE;
	this.height = TILE_SIZE;

	this.smoothed = false;

	game.physics.arcade.enable(this);
	this.body.immovable = true;

	this.drop_powerup = 0;

	this.setTiledPosition = function( col, row ){
		this.col = col;
		this.row = row;

		this.x = this.col * TILE_SIZE;
		this.y = this.row * TILE_SIZE;
	}

	this.destroyWithDrop = function(map, timestamp){
		if(this.drop_powerup != 0){
			var powerup_key = "speed";

			switch(this.drop_powerup){
				case 1: powerup_key = "blast"; break;
				case 2: powerup_key = "capacity"; break;
				case 3: powerup_key = "speed"; break;
				case 4: powerup_key = "protection"; break;
			}

			var powerup = new PowerUp(game, powerup_key);
			powerup.d_timestamp = timestamp;
			powerup.setTiledPosition(this.col, this.row);
			map.powerups[this.col][this.row] = powerup;
			map.powerups.add(powerup);

			if(IS_HOST && powerup_key == "protection"){
				powerup.startBlinkingCountdown(CONFIG.powerup_disappear_countdown / 2);
				powerup.startDisappearCountdown(CONFIG.powerup_disappear_countdown);
			}
		}

		map.objects[this.col][this.row] = false;
		this.game.time.events.add(1000,function() {this.kill();}, this );

	}
};

Destructable.prototype = Object.create(Phaser.Sprite.prototype);
Destructable.prototype.constructor = Destructable;
