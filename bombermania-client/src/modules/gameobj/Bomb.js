var EXPLOSION_TIME = 1060; // how long explosion fire remains on map
var EXPANSION_TIME = 70; // how fast explosion fire expands
var EXTINCTION_TIME = 70; // how fast explosion fire extincs

function Bomb(game, owner, map, force, serial, direction){
	Phaser.Sprite.call(this, game, 0, 0, 'ingame', "bomb/000");
    
	this.game = game;
	this.owner = owner;
	this.map = map;

	this.type = "bomb";
    this.serial = serial;
    this.dir = direction;
	this.anchor = { x: 0.5, y: 0.5 };
	this.width = TILE_SIZE * 1.05;
	this.scale.y = this.scale.x;
	this.smoothed = false;

	this.p_timestamp = 0; // server timestamp when bomb was planted

	this.force = force ? force : 1;

	game.physics.arcade.enable(this);
	this.body.immovable = true;

	this.animations.add('onfire', Phaser.Animation.generateFrameNames('bomb/', 0, 2, '', 3), 18, true, false);
	this.animations.play('onfire');

	this.setTiledPosition = function( tiled_position ){
		this.col = tiled_position.col;
		this.row = tiled_position.row;

		this.x = this.col * TILE_SIZE + TILE_SIZE * 0.5;
		this.y = this.row * TILE_SIZE + TILE_SIZE * 0.5;
	};

	this.removeProperly = function(){
		this.owner.bombs_planted = Math.max(this.owner.bombs_planted - 1, 0);

		if(this.countdown) game.time.events.remove( this.countdown );
		this.destroy();
	};

	this.startCountdown = function( countdown ){
		this.countdown = game.time.events.add(countdown, this.emitExplosion, this);
	};

	game.add.existing(this);
};

Bomb.prototype = Object.create(Phaser.Sprite.prototype);

Bomb.prototype.emitExplosion = function(excluded_direction){
    excluded_direction == undefined && (excluded_direction = "none");

	var explosion_chain = new ExplosionChain( this, this.map, excluded_direction);

	var explosion_indexes = [];

	for( var s = 0; s < explosion_chain.steps.length; s++ ){
		for( var t = 0; t < explosion_chain.steps[s].length; t++ ){
			var e_data = explosion_chain.steps[s][t];
			explosion_indexes.push( [e_data.col, e_data.row] );
		}
	}

	if(IS_HOST)	SOCKET.emit("bomb explode", {
		row: this.row,
		col: this.col,
		e_indexes: explosion_indexes,
        excluded_dir: excluded_direction,
	});
}

Bomb.prototype.explode = function( timestamp, excluded_direction ){
	var explosion_chain = new ExplosionChain( this, this.map, excluded_direction );

	for( var s = 0; s < explosion_chain.steps.length; s++ ){
		for( var t = 0; t < explosion_chain.steps[s].length; t++ ){
			var e_data = explosion_chain.steps[s][t];

			// if player is focused on game(browser tab) - display explosion animation as usual
			if( IS_FOCUSED ){
				var fire_delay = s * EXPANSION_TIME;
				var extinction_delay = Math.max(EXPLOSION_TIME - s * (EXPANSION_TIME + EXTINCTION_TIME), 1);
				//extinction_delay += e_data.last * EXPANSION_TIME - fire_delay; // compensate late explosion
				//extinction_delay += ( e_data.last - (s - e_data.start) % (e_data.last + 1) ) * EXTINCTION_TIME;

				var explosion_segment = new ExplosionSprite(this.game, this, e_data.direction, fire_delay, extinction_delay, e_data, timestamp, explosion_chain);
				explosion_segment.x = ( e_data.col + 0.5 ) * TILE_SIZE;
				explosion_segment.y = ( e_data.row + 0.5 ) * TILE_SIZE;
				this.map.explosions.add(explosion_segment);
			}
			// if player is not focused - instantly remove objects under explosion with powerup drop
			else{
				var obj = this.map.objects[e_data.col][e_data.row];
				if(obj && obj.type == "destructable")
					obj.destroyWithDrop(this.map, timestamp);
			}
		}
	}

	this.owner.bombs_planted--;

	this.map.resetShadows();
	this.game.add.audio('explosion_snd').play();

	this.map.objects[this.col][this.row] = false;
	this.removeProperly();
}

Bomb.prototype.areDirectionsSame = function(dir1, dir2){
	if(!dir1 || !dir2) return false;
	return dir1[0] == dir2[0] && dir1[1] == dir2[1];
}

function ExplosionSprite(game, bomb, direction, fire_delay, extinction_delay, explosion_data, timestamp, chain){
	Phaser.Sprite.call(this, game, 0, 0, 'ingame', "explosion/fire/000");

	this.owner = bomb.owner;

	fire_delay = fire_delay ? fire_delay : 150;
	extinction_delay = extinction_delay ? extinction_delay : 1000;

	this.animations.add(direction, Phaser.Animation.generateFrameNames('explosion/fire/',0,3,'',3));
	this.animations.add('spark-center', Phaser.Animation.generateFrameNames('explosion/spark/',0,0,'',3));
	this.animations.add('spark-edge', Phaser.Animation.generateFrameNames('explosion/spark/',1,1,'',3));

	this.width = TILE_SIZE;
	this.height = TILE_SIZE;

	this.smoothed = false;
	this.anchor = { x: 0.5, y: 0.5 };

	switch(direction){
		case 'center':
			break;
		case 'horizontal':
			break;
		case 'vertical':
			this.angle = 90;
			break;
		case 'left':
			break;
		case 'right':
			break;
		case 'top':
			this.angle = 90;
			break;
		case 'bottom':
			this.angle = 90;
			break;
	}

	this.animations.play('spark-center', 1, false);

    	if(!this.game) return; 
	this.game.time.events.add(fire_delay, function(){
		this.animations.play('spark-edge', 1, false);

    		if(!this.game) return; 
		this.game.time.events.add(EXPANSION_TIME, function(){
    			if(!this.game) return; 
			this.animations.play(direction, 14, true);

			game.physics.arcade.enable(this);
			this.body.setSize( TILE_SIZE * 0.2, TILE_SIZE * 0.2, 9.5, 9.5 );

			var obj = bomb.map.objects[explosion_data.col][explosion_data.row];
			var powerup = bomb.map.powerups[explosion_data.col][explosion_data.row];

			if(powerup){
				powerup.disappearPowerup();
			}
			if(obj){
				switch(obj.type){
					case "bomb":
                        if (direction == "left") direction = "right";
                        else if (direction == "right") direction = "left";
                        else if (direction == "top") direction = "bottom";
                        else if (direction == "bottom") direction = "top";
                        for( var s = 0; s < chain.steps.length; s++ ){
                            for( var t = 0; t < chain.steps[s].length; t++ ){
                                var explosion = chain.steps[s][t];
                                if(direction == explosion.direction) {
                                    last_explosion = explosion;
                                }
                            }
                        }
                        var last_obj = bomb.map.objects[last_explosion.col][last_explosion.row];
                        if(last_obj) {
                            if(last_obj.type != "destructable" && bomb.force < obj.force) {
                                direction = "none";    
                            }
                        } else {
                            if(bomb.force < obj.force) {
                                direction = "none";    
                            }
                        }
						obj.emitExplosion(direction);
						break;
					case "destructable":
						obj.destroyWithDrop(bomb.map, timestamp);
						bomb.map.resetShadows();

						// reset map if there are too few crates
						if (bomb.map.getCrateCount() < 2)
							game.time.events.add(1500, function(){
								if (IS_HOST)
									SOCKET.emit('map reset');
							}, this);
						break;
				}
			}

			this.game.time.events.add(extinction_delay, this.destroy, this);
		}, this);
	}, this );


	game.add.existing(this);
}

ExplosionSprite.prototype = Object.create(Phaser.Sprite.prototype);
ExplosionSprite.prototype.constructor = ExplosionSprite;
