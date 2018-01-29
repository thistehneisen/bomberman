function Bomberman(game){
	Phaser.Sprite.call(this, game, 0, 0, 'ingame', "bomberman/body/000");
	this.game = game;

	this.type = "bomberman";
	this.smoothed = false;
	this.active_animation = "idle";
	this.color = "#FF0000"
	this.serial = 0;

	this.base_velocity = CONFIG.base_velocity;
	this.real_velocity = this.base_velocity;
	this.max_velocity = CONFIG.velocity_threshold;

	this.blast_power = 1;
	this.max_blast_power = CONFIG.blast_threshold;

	this.bombs_capacity = 1;
	this.max_bombs_capacity = CONFIG.capacity_threshold;
	this.bombs_planted = 0;

	this.is_invincible = false;
	this.i_animation = false;
	this.i_countdown = false;
 	this.i_timestamp = 0;

	this.is_dying = false;
	this.is_dead = true;
    this.is_infire = 0;

	this.width = TILE_SIZE * 1.25;
	this.scale.y = this.scale.x;
	this.anchor = { x: 0.5, y: 0.5 };

	game.physics.arcade.enable(this);
	this.body.collideWorldBounds = true;
	this.body.setSize( TILE_SIZE * 0.25, TILE_SIZE * 0.25, 7.5, 4 );

	this.tint_sprite = game.add.sprite(0, 0, 'ingame', "bomberman/tint/000");
	this.tint_sprite.anchor = this.anchor;
	this.tint_sprite.smoothed = false;
	this.addChild(this.tint_sprite);

	this.addAnimation('idle', 0, 0, 1, false);
	this.addAnimation('downwalk', 0, 2, 6, true);
	this.addAnimation('sidewalk', 3, 5, 4, true);
	this.addAnimation('upwalk', 6, 8, 6, true);
	this.addAnimation('death', 9, 11, 6, false);

	this.playAnimation = function(key, frame_rate, is_looping){
		if(this.tint_sprite.animations.paused) this.tint_sprite.animations.paused = false;
		if(this.animations.paused) this.animations.paused = false;

		if(this.active_animation == key) return;
		this.active_animation = key;

		this.tint_sprite.animations.play(key);
		return this.animations.play(key, frame_rate, is_looping);
	};

	this.pauseAnimation = function(){
		if(this.animations.paused) return;

		this.tint_sprite.animations.paused = true;
		this.animations.paused = true;
	};

	this.startInvincibilityCountdown = function( countdown ){
		this.i_countdown = game.time.events.add( countdown, function(){
			//this.setInvincible(false);
			SOCKET.emit('player lost invincibility', {
				serial: this.serial
			})
		}, this );
	};

	this.setInvincible = function( flag ){
		if(flag){
		    if (!this.i_animation) {
			    this.i_animation = this.game.time.events.loop(300, function(){
				    this.alpha = this.alpha == 1 ? 0 : 1;
			    }, this);
		    } else {
			this.game.time.events.remove(this.i_animation);
			this.i_animation = this.game.time.events.loop(300, function(){
			    this.alpha = this.alpha == 1 ? 0 : 1;
			}, this);
		    }
		}
		else{
		    if(this.i_animation) { 
			this.game.time.events.remove(this.i_animation);
			this.i_animation = false;
            	    }
		    this.alpha = 1;
		}

		this.is_invincible = flag;
	};

    
	this.countInFire = function() {
		game.time.events.add(1300, function() {
		    console.log("countInFire", this.is_infire);
		    this.is_infire = 0;
		}, this);
	};

	this.setTint = function(tint_color){
		this.color = tint_color;
		this.tint_sprite.tint = tint_color;
	};

	this.plantBomb = function( map, direction ){
		if(this.is_dead || this.is_dying) return;
        	if(this.is_invincible && this.is_infire > 0) return;

		var tp = this.getTiledPosition();
		if(map.objects[tp.col][tp.row] || this.bombs_planted >= this.bombs_capacity) return;

		SOCKET.emit('player plant bomb', {
			owner_serial: this.serial,
			blast_power: this.blast_power,
			col: tp.col,
			row: tp.row,
            dir: direction
		});

		this.bombs_planted++;

		return true;
	};

	this.die = function( nickname_label ){
		this.game.add.audio('death_snd').play();

		this.is_dying = true;
		console.log("die", this.is_dying);

		this.death_animation = this.playAnimation('death', 1.5, false);
		// if(this.death_animation){
		    this.death_animation.onComplete.add(function(){
			var animation_iterator = 0;
			var blinking_speed = 300;
			var last_iteration = 10;

			var blinking_timer = this.game.time.events.repeat(300, last_iteration, function(){
			    animation_iterator++;

			    console.log("death_animation", animation_iterator);
			    if(animation_iterator < last_iteration)
				this.alpha = this.alpha == 1 ? 0 : 1;
			    else {
				this.alpha = 1;
				this.killProperly();
				nickname_label.visible = false;
			    }
			}, this);

		    }, this);
		// }
	};

	this.resetUpgrades = function(){
		this.real_velocity = this.base_velocity;
		this.bombs_capacity = 1;
		this.blast_power = 1;
	};

	this.revive = function(col, row){
		this.is_dead = false;
        	this.is_dying = false;
        	this.is_infire = 0;
		this.resetUpgrades();
		this.reset(col * TILE_SIZE + TILE_SIZE / 2, row * TILE_SIZE + TILE_SIZE / 2);

		this.playAnimation('idle');

		this.game.add.audio('revive_snd').play();
	};

	this.killProperly = function(){
		if(this.death_animation) this.death_animation.onComplete.removeAll();
        	this.is_infire = 0;
		this.is_dead = true;
		this.is_dying = false;
		this.kill();
	}

	game.add.existing(this);
};

Bomberman.prototype = Object.create(Phaser.Sprite.prototype);
Bomberman.prototype.constructor = Bomberman;

Bomberman.prototype.getTiledPosition = function(){
	return {
		col: Math.floor(this.x / TILE_SIZE),
		row: Math.floor(this.y / TILE_SIZE)
	};
}

Bomberman.prototype.addAnimation = function(key, start_frame, end_frame, frame_rate, is_looping){
	this.animations.add( key, Phaser.Animation.generateFrameNames('bomberman/body/',
						 start_frame, end_frame, '', 3 ), frame_rate, is_looping );
	this.tint_sprite.animations.add( key, Phaser.Animation.generateFrameNames('bomberman/tint/',
									 start_frame, end_frame, '', 3), frame_rate, is_looping );
}
