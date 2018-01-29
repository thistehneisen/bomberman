function SocketHandler( context ){

	// when OTHER player joins current room
	this.onPlayerJoinRoom = function( player_data ){
		console.log("Player " + player_data.id + " joined room");
		context.chat_panel.addPlayer(player_data.id, player_data.name, player_data.serial, player_data.frags);
		context.chat_panel.sortPreviews();
	};

	// when OTHER player exits current room
	this.onPlayerExitRoom = function( player_data ){
		console.log("Player " + player_data.id + " exited room");

		// hide player avatar and nickname label
		var bomberman = context.players[player_data.serial];
		bomberman.visible = false;
		bomberman.is_dead = true;
		context.nicknames[player_data.serial].visible = false;

		// remove player preview from chat panel
		context.chat_panel.removePlayer( player_data.id );
		context.chat_panel.sortPreviews();

		// destroy all bombs planted by player_data
		var map = context.map;
		for(var col = 0; col < map.cols; col++ ){
			for(var row = 0; row < map.rows; row++ ){
				var object = map.objects[col][row];

				if(object.type == "bomb" && object.owner == bomberman){
					map.objects[col][row] = false;
					object.removeProperly();
				}
			}
		}
	};

	// when getting chat message from OTHER player
	this.onChatMessage = function( message ){
		console.log('Got message from ' + message.sender_id + ": " + message.body);
		context.chat_panel.setMessage(message.sender_id, message.body);
	}

	// when CURRENT player becomes host
	this.onBecomeHost = function( data/*timestamp*/ ){
		context.startBeingHost( data/*timestamp*/ );
	}

	// when OTHER player spawns somewhere on map
	this.onPlayerSpawn = function( player_data ){
		console.log('Player ' + player_data.serial + " spawn at " + player_data.x + ", "+player_data.y + " nick: " + player_data.nickname);

		var nickname = game.add.text(0, 0, player_data.nickname, { font: "22px Arial", fill: "#"+Phaser.Color.componentToHex(0x7CFC00) });
		nickname.anchor.set( 0.5, 1 );

		var bomberman = context.players[player_data.serial];
		bomberman.x = player_data.x;
		bomberman.y = player_data.y;

		var sp = bomberman.getTiledPosition();
		bomberman.revive(sp.col, sp.row);
		bomberman.alpha = 1;
		bomberman.visible = true;
		bomberman.playAnimation("idle");
		bomberman.setInvincible(true);
		bomberman.i_timestamp = player_data.timestamp;

		context.nicknames[player_data.serial].visible = true;

		if(IS_HOST) bomberman.startInvincibilityCountdown( CONFIG.invincibility_time );
	}

	// when OTHER player changes position or walking animation
	this.onPlayerMove = function( move_data ){
		var serial = move_data[0];
		var x = move_data[1];
		var y = move_data[2];
		var animation_id = move_data[3];
		var iterator = move_data[4];

		var bomberman = context.players[serial];
		var nickname = context.nicknames[serial];

		bomberman.x = x;
		bomberman.y = y;

		var animation_key = "idle";
		switch(animation_id){
			case 0: animation_key = "idle"; break;
			case 1: // left
				if(bomberman.scale.x < 0) bomberman.scale.x *= -1;
				animation_key = "sidewalk";
				break;
			case 2: // right
				if(bomberman.scale.x > 0) bomberman.scale.x *= -1;
				animation_key = "sidewalk";
				break;
			case 3: animation_key = "upwalk"; break;
			case 4: animation_key = "downwalk"; break;
			case 5: //dance
				if(iterator % 5 == 0){
					bomberman.scale.x *= -1;
					animation_key = "sidewalk";
					break;
				}
		}
		if(animation_key == "idle")
			bomberman.pauseAnimation();
		else
			bomberman.playAnimation(animation_key);

	};

	// when ANY player becomes dead
	this.onPlayerDeath = function( death_data ){
        if (death_data.victim_frags < 0) context.chat_panel.setColor(death_data.victim_id, "#ff0000");
        if (death_data.killer_frags >= 0) context.chat_panel.setColor(death_data.killer_id, "#ffffff");
		context.chat_panel.setFrags(death_data.victim_id, death_data.victim_frags);
		context.chat_panel.setFrags(death_data.killer_id, death_data.killer_frags);
		context.chat_panel.sortPreviews();

		var victim = context.players[death_data.victim_serial];
		victim.die( context.nicknames[death_data.victim_serial] );
		console.log("Player death", death_data);
	};

	// when OTHER player collected powerup
	this.onPlayerCollectPowerup = function( powerup_data ){
		console.log("powerup ["+powerup_data.col+";"+powerup_data.row+"] collected");

		var powerup = context.map.powerups[powerup_data.col][powerup_data.row];

		var bomberman = context.players[powerup_data.c_serial];
		switch(powerup.type){
			case "speed":
				if(bomberman.real_velocity >= bomberman.max_velocity) break;

				var i = CONFIG.velocity_increment;
				bomberman.real_velocity = Math.min(bomberman.real_velocity + i, bomberman.max_velocity);

				break;
			case "blast":
				bomberman.blast_power = Math.min(++bomberman.blast_power, bomberman.max_blast_power);
				break;
			case "capacity":
				bomberman.bombs_capacity = Math.min(++bomberman.bombs_capacity, bomberman.max_bombs_capacity);
				break;
			case "protection":
				bomberman.setInvincible( true );
				if(IS_HOST) bomberman.startInvincibilityCountdown( CONFIG.invincibility_time );
				break;
		}

		context.map.powerups[powerup_data.col][powerup_data.row] = false;
		if(powerup) powerup.destroy();

		//disabled audio for other players collect powerup
		// context.game.add.audio('pickup_snd').play();
	};

	// when ANY player loses invincibility
	this.onPlayerLostInvicibility = function( player_data ){
		var bomberman = context.players[player_data.serial];
		bomberman.setInvincible( false );
	}

	// when ANY player planted a bomb somewhere on the map
	this.onPlayerPlantBomb = function( bomb_data ){
		console.log("bomb planted at [" + bomb_data.col + ";" + bomb_data.row+"]");

		var owner = context.players[bomb_data.owner_serial];

		var bomb = new Bomb(context.game, owner, context.map, bomb_data.blast_power, bomb_data.owner_serial, bomb_data.dir);
		bomb.setTiledPosition({col: bomb_data.col, row: bomb_data.row});
		bomb.p_timestamp = bomb_data.timestamp;

		context.map.objects[bomb_data.col][bomb_data.row] = bomb;
		context.map.objects.add(bomb);

		// start bomb countdown timer if host
		if(IS_HOST) bomb.startCountdown( CONFIG.bombs_countdown );
	};

	// when ANY bomb had exploded on the map
	this.onBombExplode = function( bomb_data ){
		var bomb = context.map.objects[bomb_data.col][bomb_data.row];
		if(bomb && bomb.explode) bomb.explode(bomb_data.timestamp, bomb_data.excluded_dir);
	};

	// when ANY powerup had started blinking
	this.onPowerupBlink = function( powerup_data ){
		var powerup = context.map.powerups[powerup_data.col][powerup_data.row];
		if(powerup) powerup.setBlinking(true);
	};

	// when ANY powerup had disappeared on the map
	this.onPowerupDisappear = function( powerup_data ){
		var powerup = context.map.powerups[powerup_data.col][powerup_data.row];
		if(powerup) powerup.destroy();
		context.map.powerups[powerup_data.col][powerup_data.row] = false;
	};

	this.onMapReset = function( room ){
		console.log("map reset", room);
		context.room = room;
		context.resetMap();
	}
}
