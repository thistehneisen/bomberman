function PowerUp(game, type){
	Phaser.Sprite.call(this, game, 0, 0, 'ingame', "powerups/"+type+"/000");

	this.animations.add('idle', Phaser.Animation.generateFrameNames('powerups/'+type+'/',0,1,'',3), 15, true, false);
	this.animations.play('idle');

	this.type = type;

	this.b_animation = null; // blinking animation
	this.b_countdown = null; // countdown until start blinking

	this.d_timestamp = 0; // timestamp when powerup was dropped
	this.d_countdown = null; // destruction countdown

	if(this.width > this.height){
		this.width = TILE_SIZE * 0.9;
		this.scale.y = this.scale.x;
	}
	else{
		this.height = TILE_SIZE * 0.9;
		this.scale.x = this.scale.y;
	}

	this.anchor = { x: 0.5, y: 0.5 };

	this.smoothed = false;

	game.physics.arcade.enable(this);
	this.body.immovable = true;
	this.body.setSize( this.width / 8, this.height / 8,
					   this.width * 3 / 16, this.height * 3 / 16 );

	this.setTiledPosition = function( col, row ){
		this.col = col;
		this.row = row;

		this.x = this.col * TILE_SIZE + TILE_SIZE * 0.5;
		this.y = this.row * TILE_SIZE + TILE_SIZE * 0.5;
	}

	this.setBlinking = function( flag ){
		if(flag){
			this.d_animation = this.game.time.events.loop(300, function(){
				this.alpha = this.alpha == 1 ? 0 : 1;
			}, this);
		}
		else{
			if(this.d_animation) this.game.time.events.remove(this.d_animation);
			this.alpha = 1;
		}
	}

	this.startBlinkingCountdown = function( countdown ){
		this.b_countdown = game.time.events.add( countdown, function(){
			SOCKET.emit('powerup blink', {
				col: this.col,
				row: this.row
			});
		}, this);
	};

	this.startDisappearCountdown = function( countdown ){
		this.d_countdown = game.time.events.add( countdown, function(){
			SOCKET.emit('powerup disappear', {
				col: this.col,
				row: this.row
			});
		}, this);
	};

	this.disappearPowerup = function(){
		SOCKET.emit('powerup disappear', {
			col: this.col,
			row: this.row
		});
	};
/*
	this.disappearAfter = function(delay){
		var animation_iterator = 0;
		var blinking_speed = 250;
		var last_iteration = Math.floor(delay / 50);

		this.countdown = this.game.time.events.repeat(50, last_iteration, function(){
			animation_iterator++;

			if(animation_iterator == last_iteration){
				SOCKET_CLIENT.emit('powerup disappear', {
					col: this.col,
					row: this.row,
					type: this.type
				});
				this.destroy();
			}
			else if((animation_iterator * 50 > delay / 2.6) && ((animation_iterator * 50) % blinking_speed == 0))
				this.alpha = this.alpha == 1 ? 0 : 1;

		}, this);
	};*/

	//if(this.type == "protection") this.disappearAfter(10000);
};

PowerUp.prototype = Object.create(Phaser.Sprite.prototype);
PowerUp.prototype.constructor = PowerUp;
