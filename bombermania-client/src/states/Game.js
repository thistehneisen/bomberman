var showDebug = false;

var TILE_SIZE = 64;
var IS_HOST = false;
var IS_FOCUSED = true;

Retoosh.Game = function(game) {

    this.game = game;
	this.map = null;
	this.players = [];
	this.avatar = null;
	this.nicknames = [];
    this.direction = "none";
    this.key_timer = false;

	this.player_colors = [
		0x7CFC00,
		0xFF0000,
		0xFFFF00,
		0x00008B,
		0xFF1493,
		0xADD8E6,
		0xFF8C00,
		0x000000,
		0x7CFC00, // additional colors (if room size > 8)
		0xFF0000,
		0xFFFF00,
		0x00008B,
		0xFF1493,
		0xADD8E6,
		0xFF8C00,
		0x000000
	];
};

Retoosh.Game.prototype = {

	init: function( room ){
		this.room = room;
        //this.game.stage.disableVisibilityChange = true;

		IS_HOST = this.room.host_id == SOCKET.id;
		console.log("Is host? "+IS_HOST);
	},

    create: function() {
		var context = this;
		this.is_game_started = false;
		this.updateIterator = 0;
        this.isSpaceKeyPressed = false;
        this.nextRound = false;

		/*
		-----------------------------------------------------
				Initialize static game objects
		-----------------------------------------------------
		*/

		game.physics.startSystem(Phaser.Physics.ARCADE);

		// init bombermen and nickname labels
		for(var i = 0; i < this.room.max_players; i++){
			var bomberman = new Bomberman(this.game);
			bomberman.setTint(this.player_colors[i]);
			bomberman.serial = i;
			bomberman.visible = false;

			// update bomberman status according to data from the server
			var player_data = this.room.players[i];
			

			if(player_data){
                var nickname = game.add.text(0, 0, player_data.name, { font: "22px Arial", fill: "#"+Phaser.Color.componentToHex(this.player_colors[i]) });
  			    nickname.anchor.set( 0.5, 1 );
				console.log(player_data);
				bomberman.i_timestamp = player_data.i_timestamp;
				bomberman.setInvincible( player_data.is_invincible );

				bomberman.is_dead = player_data.is_dead;
				bomberman.visible = !player_data.is_dead;
				nickname.visible = bomberman.visible;

				bomberman.x = player_data.x;
				bomberman.y = player_data.y;

                bomberman.nickname = player_data.name;

				if(player_data.id == SOCKET.id) this.avatar = bomberman;
			}

			this.players[i] = bomberman;
			this.nicknames[i] = nickname;
		}

		/*
		-----------------------------------------------------
				Initialize interface
		-----------------------------------------------------
		*/
		this.chat_panel = new ChatPanel(this.game, this);
		this.message_sender = new MessageSender(this.game);

		// fill chat panel with active players
		for( var p = 0; p < this.room.max_players; p++ ){
			if(!this.room.players[p]) continue;

			var player = this.room.players[p];
            if(this.avatar.serial == player.serial)
			    this.chat_panel.addPlayer( player.id, player.name, player.serial, player.frags, true);
            else
                this.chat_panel.addPlayer( player.id, player.name, player.serial, player.frags );
			this.chat_panel.setMessage( player.id, player.last_message );
		}

		this.chat_panel.sortPreviews();

		/*
		-----------------------------------------------------
				Initialize interface
		-----------------------------------------------------
		*/

		this.resetMap();

		// set active and alive bombermen visible
		for(var i = 0; i < this.room.max_players; i++){
			var player_data = this.room.players[i];
			if(player_data){
				this.players[i].visible = !player_data.is_dead;
				this.nicknames[i].visible = !player_data.is_dead;
			}
		}

		/*
		-----------------------------------------------------
				Handle key events
		-----------------------------------------------------
		*/

		this.cursors = game.input.keyboard.createCursorKeys();
		this.spaceKey = game.input.keyboard.addKey(Phaser.Keyboard.SPACEBAR);
		this.chatKey = game.input.keyboard.addKey(Phaser.KeyCode.C);
		this.chatKey.onUp.add( function() {
			this.message_sender.visible = !this.message_sender.visible;
			if(this.message_sender.visible)
				this.message_sender.startFocus();
		}, this );

		this.spaceKey.onDown.add(function(){
			if(!this.is_game_started) return;
            this.isSpaceKeyPressed = true;
			this.avatar.plantBomb(this.map, this.getKeysDirection());
            if (!this.key_timer) {
                this.key_timer = this.game.time.events.loop( 500, function(){
                    this.avatar.plantBomb(this.map, this.getKeysDirection());
                }, this );
            }
		}, this);

		this.spaceKey.onUp.add(function() {
            this.isSpaceKeyPressed = false;
            if(this.key_timer) { 
                this.game.time.events.remove(this.key_timer);
                this.key_timer = false;
            }
			if(this.is_game_started && this.avatar.is_dead) this.respawnAvatar();
		}, this);

		/*
		-----------------------------------------------------
				Add socket event handlers
		-----------------------------------------------------
		*/

		this.socket_handler = new SocketHandler( this );
		SOCKET.on('player join room', this.socket_handler.onPlayerJoinRoom);
		SOCKET.on('player exit room', this.socket_handler.onPlayerExitRoom);

		SOCKET.on('chat message', this.socket_handler.onChatMessage);

		SOCKET.on('become host', this.socket_handler.onBecomeHost);

		SOCKET.on('player spawn', this.socket_handler.onPlayerSpawn);
		SOCKET.on('player move', this.socket_handler.onPlayerMove);
		SOCKET.on('player death', this.socket_handler.onPlayerDeath);
		SOCKET.on('player collect powerup', this.socket_handler.onPlayerCollectPowerup);
		SOCKET.on('player lost invincibility', this.socket_handler.onPlayerLostInvicibility);
		SOCKET.on('player plant bomb', this.socket_handler.onPlayerPlantBomb);
		SOCKET.on('bomb explode', this.socket_handler.onBombExplode);
		SOCKET.on('powerup blink', this.socket_handler.onPowerupBlink);
		SOCKET.on('powerup disappear', this.socket_handler.onPowerupDisappear);

		SOCKET.on('map reset', this.socket_handler.onMapReset);

		/*
		-----------------------------------------------------
				Add focus event handlers
		-----------------------------------------------------
		*/

		this.game.onPause.add(function(){
			SOCKET.emit('player unavailable');
			if(IS_HOST) this.stopBeingHost();

			IS_FOCUSED = false;
		}, this);

		this.game.onResume.add(function(){
			SOCKET.emit('player available');

			IS_FOCUSED = true;
		}, this);

        // Game pause
        window.onblur = (function (_this) {
            return function () {
                SOCKET.emit('player unavailable');
                if(IS_HOST) _this.stopBeingHost();

                IS_FOCUSED = false;
            if(_this.key_timer) { 
                _this.game.time.events.remove(_this.key_timer);
                _this.key_timer = false;
            }
            }
        })(this);

        // Game resume
        window.onfocus = function () { 
            SOCKET.emit('player available');

            IS_FOCUSED = true;
        }; 
		// --------------------------------------------------

		this.is_game_started = true;
		if(IS_HOST) this.startBeingHost();
    },

    update: function() {
  		if(!this.is_game_started) return;
        
        //if(this.isSpaceKeyPressed) this.avatar.plantBomb(this.map);

		this.game.physics.arcade.collide(this.avatar, this.chat_panel);
  		this.game.physics.arcade.collide(this.avatar, this.map.objects);

		if(IS_HOST) {
	  		this.game.physics.arcade.overlap(this.map.characters, this.map.explosions,
	  										 this.onBombermanInExplosion, null, this);
            this.game.physics.arcade.overlap(this.map.objects, this.map.explosions,
                                           this.onBombInExplosion, null, this);
        }

  		this.game.physics.arcade.overlap(this.avatar, this.map.powerups,
  										 this.onAvatarCollectPowerup, null, this);

		var prev_velocity = { x: this.avatar.body.velocity.x,
							  y: this.avatar.body.velocity.y };

  		this.avatar.body.velocity.x = 0;
  		this.avatar.body.velocity.y = 0;
      	var move_key_pressed = false;

		this.nicknames[this.avatar.serial].x = this.avatar.x;
		this.nicknames[this.avatar.serial].y = this.avatar.y - 20;

      	if(!this.avatar.is_dying && !this.avatar.is_dead){
			var in_tile_x = ( this.avatar.x / TILE_SIZE ) % 1;
			var in_tile_y = ( this.avatar.y / TILE_SIZE ) % 1;
			var tiled_pos = this.avatar.getTiledPosition();
			var obj_on_path;
			// area of certainty - where bomberman is in the middle of tile
			var c_area = { left: 0.48, right: 0.52, top: 0.48, bottom: 0.52 }
			var u_area = { left: 0.48, right: 0.52, top: 0.48, bottom: 0.52 }
			var keys_direction = this.getKeysDirection();

			var final_direction = "idle";

            // checking indestructable objects
            var lefcenter = tiled_pos.col - 1 < 0?false:this.map.objects[tiled_pos.col - 1][tiled_pos.row]?this.map.objects[tiled_pos.col - 1][tiled_pos.row].type:false;
            var botcenter = tiled_pos.row + 1 >= this.map.rows?false:this.map.objects[tiled_pos.col][tiled_pos.row + 1]?this.map.objects[tiled_pos.col][tiled_pos.row + 1].type:false;
            var topcenter = tiled_pos.row - 1 < 0?false:this.map.objects[tiled_pos.col][tiled_pos.row - 1]?this.map.objects[tiled_pos.col][tiled_pos.row - 1].type:false;
            var rigcenter = tiled_pos.col + 1 >= this.map.cols?false:this.map.objects[tiled_pos.col + 1][tiled_pos.row]?this.map.objects[tiled_pos.col + 1][tiled_pos.row].type:false;
            var leftop = tiled_pos.col - 1 < 0?false:this.map.objects[tiled_pos.col - 1][tiled_pos.row - 1]?this.map.objects[tiled_pos.col - 1][tiled_pos.row - 1].type:false;
            var lefbottom = tiled_pos.col - 1 < 0?false:this.map.objects[tiled_pos.col - 1][tiled_pos.row + 1]?this.map.objects[tiled_pos.col - 1][tiled_pos.row + 1].type:false;
            var rigtop = tiled_pos.col + 1 >= this.map.cols?false:this.map.objects[tiled_pos.col + 1][tiled_pos.row - 1]?this.map.objects[tiled_pos.col + 1][tiled_pos.row - 1].type:false;
            var rigbottom = tiled_pos.col + 1 >= this.map.cols?false:this.map.objects[tiled_pos.col + 1][tiled_pos.row + 1]?this.map.objects[tiled_pos.col + 1][tiled_pos.row + 1].type:false;
            
			switch(keys_direction){
				case "none":
					final_direction = "idle";
					break;
				case "left":
					// inner tile check: move bomberman to the tile center
					if(in_tile_x > 0.55) 
						final_direction = keys_direction;
					// outer tile check: check next tile on the way
					else {
						if( tiled_pos.col - 1 < 0 ) // next tile is outside map bounds
                        {
                             final_direction = "idle";
                             keys_direction = "none";
                        }
						else { // next tile is inside map bounds - check if path is free
							blockers = {
								leftop: tiled_pos.row - 1 >= 0 ? this.map.objects[tiled_pos.col - 1][tiled_pos.row - 1] : false,
								lefcenter: this.map.objects[tiled_pos.col - 1][tiled_pos.row],
								lefbottom: tiled_pos.row + 1 < this.map.rows ? this.map.objects[tiled_pos.col - 1][tiled_pos.row + 1] : false,
								top: tiled_pos.row - 1 >= 0 ? this.map.objects[tiled_pos.col][tiled_pos.row - 1] : false,
								bottom: tiled_pos.row + 1 < this.map.rows ? this.map.objects[tiled_pos.col][tiled_pos.row + 1] : false
							};

							// there is a block next to current tile position
							if(blockers.lefcenter){
                                //this is only for indestructable blockers
								// if(blockers.lefcenter.type === "indestructable") {
									final_direction = "idle";
									keys_direction = "none";
								// }
								// else if(in_tile_y < c_area.top)
								// 	final_direction = blockers.top ? keys_direction + "-idle" : blockers.leftop ? keys_direction + "-idle" : "up";
								// else if(in_tile_y > c_area.bottom)
								// 	final_direction = blockers.bottom ? keys_direction + "-idle" : blockers.leftop ? keys_direction + "-idle" : "down";
							}
							else {
                                //this value handles the auto movement along edges
								if(in_tile_y > c_area.bottom + 0.05 && blockers.lefbottom) final_direction = "up", keys_direction = "up";
								else if(in_tile_y < c_area.top - 0.05 && blockers.leftop) final_direction = "down", keys_direction = "down";
                                // if(in_tile_y > c_area.bottom + 0.05 && blockers.lefbottom) final_direction = "certain";
								// else if(in_tile_y < c_area.top - 0.05 && blockers.leftop) final_direction = "certain";
								else final_direction = keys_direction;
							}
						}
					}
					break;
				case "right":
					// inner tile check: move bomberman to the tile center
					if(in_tile_x < 0.45)
						final_direction = keys_direction;
					// outer tile check: check next tile on the way
					else{
						if( tiled_pos.col + 1 >= this.map.cols ) // next tile is outside map bounds
                        {
                          final_direction = "idle";
                          keys_direction = "none";
                        }
						else{ // next tile is inside map bounds - check if path is free

							blockers = {
								rigtop: tiled_pos.row - 1 >= 0 ? this.map.objects[tiled_pos.col + 1][tiled_pos.row - 1] : false,
								rigcenter: this.map.objects[tiled_pos.col + 1][tiled_pos.row],
								rigbottom: tiled_pos.row + 1 < this.map.rows ? this.map.objects[tiled_pos.col + 1][tiled_pos.row + 1] : false,
								top: tiled_pos.row - 1 >= 0 ? this.map.objects[tiled_pos.col][tiled_pos.row - 1] : false,
								bottom: tiled_pos.row + 1 < this.map.rows ? this.map.objects[tiled_pos.col][tiled_pos.row + 1] : false
							};

							// there is a block next to current tile position
							if(blockers.rigcenter){
								// if(blockers.rigcenter.type === "indestructable") {
									final_direction = "idle";
									keys_direction = "none";
								// }
								// else if(in_tile_y < c_area.top)
								// 	final_direction = blockers.top ? keys_direction + "-idle" : blockers.rigtop ? keys_direction + "-idle" : "up";
								// else if(in_tile_y > c_area.bottom)
								// 	final_direction = blockers.bottom ? keys_direction + "-idle" : blockers.rigbottom ? keys_direction + "-idle" : "down";
							}
							else{
								if(in_tile_y > c_area.bottom + 0.05 && blockers.rigbottom) final_direction = "up", keys_direction = "up";
								else if(in_tile_y < c_area.top - 0.05 && blockers.rigtop) final_direction = "down", keys_direction = "down";
								// if(in_tile_y > c_area.bottom + 0.05 && blockers.rigbottom) final_direction = "certain";
								// else if(in_tile_y < c_area.top - 0.05 && blockers.rigtop) final_direction = "certain";
								else final_direction = keys_direction;
							}
						}
					}
					break;
				case "up":
					// inner tile check: move bomberman to the tile center
					if(in_tile_y > 0.55)
						final_direction = keys_direction;
					// outer tile check: check next tile on the way
					else{
						if( tiled_pos.row - 1 < 0 ) // next tile is outside map bounds
                        {
                          final_direction = "idle";
                          keys_direction = "none";
                        }
						else { // next tile is inside map bounds - check if path is free

							blockers = {
								topleft: tiled_pos.col - 1 >= 0 ? this.map.objects[tiled_pos.col - 1][tiled_pos.row - 1] : false,
								topcenter: this.map.objects[tiled_pos.col][tiled_pos.row - 1],
								topright: tiled_pos.col + 1 < this.map.cols ? this.map.objects[tiled_pos.col + 1][tiled_pos.row - 1] : false,
								left: tiled_pos.col - 1 >= 0 ? this.map.objects[tiled_pos.col - 1][tiled_pos.row] : false,
								right: tiled_pos.col + 1 < this.map.cols ? this.map.objects[tiled_pos.col + 1][tiled_pos.row] : false
							};

							// there is a block next to current tile position
							if(blockers.topcenter){
								// if(blockers.topcenter.type === "indestructable") {
									final_direction = "idle";
									keys_direction = "none";
								// }
								// else if(in_tile_x < c_area.left)
								// 	final_direction = blockers.left ? keys_direction + "-idle" : blockers.topleft ? keys_direction + "-idle" : "left";
								// else if(in_tile_x > c_area.right)
								// 	final_direction = blockers.right ? keys_direction + "-idle" : blockers.topright ? keys_direction + "-idle" : "right";
							}
							else{
								if(in_tile_x > c_area.right + 0.05 && blockers.topright) final_direction = "left", keys_direction = "left";
								else if(in_tile_x < c_area.left - 0.05 && blockers.topleft) final_direction = "right", keys_direction = "right";
								// if(in_tile_x > c_area.right + 0.05 && blockers.topright) final_direction = "certain";
								// else if(in_tile_x < c_area.left - 0.05 && blockers.topleft) final_direction = "certain";
								else final_direction = keys_direction;
							}
						}
					}
					break;
				case "down":
					// inner tile check: move bomberman to the tile center
					if(in_tile_y < 0.45)
						final_direction = keys_direction;
					// outer tile check: check next tile on the way
					else{
						if( tiled_pos.row + 1 >= this.map.rows ) // next tile is outside map bounds
                        {
                          final_direction = "idle";
                          keys_direction = "none";
                        }
						else { // next tile is inside map bounds - check if path is free

							blockers = {
								botleft: tiled_pos.col - 1 >= 0 ? this.map.objects[tiled_pos.col - 1][tiled_pos.row + 1] : false,
								botcenter: this.map.objects[tiled_pos.col][tiled_pos.row + 1],
								botright:  tiled_pos.col + 1 < this.map.cols ? this.map.objects[tiled_pos.col + 1][tiled_pos.row + 1] : false,
								left: tiled_pos.col - 1 >= 0 ? this.map.objects[tiled_pos.col - 1][tiled_pos.row] : false,
								right:  tiled_pos.col + 1 < this.map.cols ? this.map.objects[tiled_pos.col + 1][tiled_pos.row] : false
							};

							// there is a block next to current tile position
							if(blockers.botcenter){
								// if(blockers.botcenter.type === "indestructable") {
									final_direction = "idle";
									keys_direction = "none";
								// }
								// else if(in_tile_x < c_area.left)
								// 	final_direction = blockers.left ? keys_direction + "-idle" : blockers.botleft ? keys_direction + "-idle" : "left";
								// else if(in_tile_x > c_area.right)
								// 	final_direction = blockers.right ? keys_direction + "-idle" : blockers.botright ? keys_direction + "-idle" : "right";
							}
							else {
								if(in_tile_x > c_area.right + 0.05 && blockers.botright) final_direction = "left", keys_direction = "left";
								else if(in_tile_x < c_area.left - 0.05 && blockers.botleft) final_direction = "right", keys_direction = "right";
								// if(in_tile_x > c_area.right + 0.05 && blockers.botright) final_direction = "certain";
								// else if(in_tile_x < c_area.left - 0.05 && blockers.botleft) final_direction = "certain";
								else final_direction = keys_direction;
							}
						}
					}
					break;
				case "uncertain":
					final_direction = "certain";
					break;
                // case "upleft":
		                // 	if(lefcenter !== "indestructable" && topcenter !== "indestructable") {
		                // 		final_direction = "uncertain";
		                // 	}
		                // 	break;
                // case "upright":
		                // 	if(topcenter !== "indestructable" && rigcenter !== "indestructable") {
		                // 		final_direction = "uncertain";
		                // 	}
		                // 	break;
                // case "downleft":
		                // 	if(lefcenter !== "indestructable" && botcenter !== "indestructable") {
		                // 		final_direction = "uncertain";
		                // 	}
		                // 	break;
                // case "downright":
		                // 	if(botcenter !== "indestructable" && rigcenter !== "indestructable") {
		                // 		final_direction = "uncertain";
		                // 	}
		                // 	break;
				default:
                    if((lefcenter === "indestructable" || lefcenter === "destructable") && (rigcenter === "indestructable" || rigcenter === "destructable")) {
                        if (keys_direction.indexOf("up") >= 0) {
                            if (topcenter) final_direction = "idle", keys_direction = "none";
                            else final_direction = "up", keys_direction = "up";
                        } else if (keys_direction.indexOf("down") >= 0) {
                            if (botcenter) final_direction = "idle", keys_direction = "none";
                            else final_direction = "down", keys_direction = "down";
                        }
                    } else if ((botcenter === "indestructable" || botcenter === "destructable") && (topcenter === "indestructable" || topcenter === "destructable")) {
                        if (keys_direction.indexOf("left") >= 0) {
                            if (lefcenter) final_direction = "idle", keys_direction = "none";
                            else final_direction = "left", keys_direction = "left";
                        } else if (keys_direction.indexOf("right") >= 0) {
                            if (rigcenter) final_direction = "idle", keys_direction = "none";
                            else final_direction = "right", keys_direction = "right";
                        }
                    } else if((lefcenter === "indestructable" || lefcenter === "destructable" ) && tiled_pos.col + 1 >= this.map.cols) {
                        if (keys_direction.indexOf("up") >= 0) {
                            if (topcenter) final_direction = "idle", keys_direction = "none";
                            else final_direction = "up", keys_direction = "up";
                        } else if (keys_direction.indexOf("down") >= 0) {
                            if (botcenter) final_direction = "idle", keys_direction = "none";
                            else final_direction = "down", keys_direction = "down";
                        }
                    } else if((rigcenter === "indestructable" || rigcenter === "destructable") && tiled_pos.col - 1 < 0) {
                        if (keys_direction.indexOf("up") >= 0) {
                            if (topcenter) final_direction = "idle", keys_direction = "none";
                            else final_direction = "up", keys_direction = "up";
                        } else if (keys_direction.indexOf("down") >= 0) {
                            if (botcenter) final_direction = "idle", keys_direction = "none";
                            else final_direction = "down", keys_direction = "down";
                        }
                    } else if((botcenter === "indestructable" || botcenter === "destructable") && tiled_pos.row - 1 < 0) {
                        if (keys_direction.indexOf("left") >= 0) {
                            if (lefcenter) final_direction = "idle", keys_direction = "none";
                            else final_direction = "left", keys_direction = "left";
                        } else if (keys_direction.indexOf("right") >= 0) {
                            if (rigcenter) final_direction = "idle", keys_direction = "none";
                            else final_direction = "right", keys_direction = "right";
                        }
                    } else if((topcenter === "indestructable" || topcenter === "destructable") && tiled_pos.row + 1 >= this.map.rows) {
                        if (keys_direction.indexOf("left") >= 0) {
                            if (lefcenter) final_direction = "idle", keys_direction = "none";
                            else final_direction = "left", keys_direction = "left";
                        } else if (keys_direction.indexOf("right") >= 0) {
                            if (rigcenter) final_direction = "idle", keys_direction = "none";
                            else final_direction = "right", keys_direction = "right";
                        }
                    }
                    else {
                        var left = 0.40, right = 0.60, top = 0.40, bottom = 0.60;
                        if (in_tile_x < left && leftop && lefbottom) {
                            if (keys_direction.indexOf("left") >= 0) final_direction = "left", keys_direction = "left";
                            else if (keys_direction.indexOf("right") >= 0) final_direction = "right", keys_direction = "right";
                        } else if (in_tile_x > right && rigtop && rigbottom) {
                            if (keys_direction.indexOf("left") >= 0) final_direction = "left", keys_direction = "left";
                            else if (keys_direction.indexOf("right") >= 0) final_direction = "right", keys_direction = "right";
                        } else if (in_tile_y < top && rigtop && leftop) {
                            if (keys_direction.indexOf("up") >= 0) final_direction = "up", keys_direction = "up";
                            else if(keys_direction.indexOf("down") >= 0) final_direction = "down", keys_direction = "down";
                        } else if (in_tile_y > bottom && rigbottom && lefbottom) {
                            if (keys_direction.indexOf("up") >= 0) final_direction = "up", keys_direction = "up";
                            else if(keys_direction.indexOf("down") >= 0) final_direction = "down", keys_direction = "down";
                        } else if (in_tile_x < left && leftop && tiled_pos.row + 1 >= this.map.rows) {
                            if (keys_direction.indexOf("left") >= 0) final_direction = "left", keys_direction = "left";
                            else if (keys_direction.indexOf("right") >= 0) final_direction = "right", keys_direction = "right";
                        } else if (in_tile_x > right && rigtop && tiled_pos.row + 1 >= this.map.rows) {
                            if (keys_direction.indexOf("left") >= 0) final_direction = "left", keys_direction = "left";
                            else if (keys_direction.indexOf("right") >= 0) final_direction = "right", keys_direction = "right";
                        } else if (in_tile_x < left && lefbottom && tiled_pos.row - 1 < 0) {
                            if (keys_direction.indexOf("left") >= 0) final_direction = "left", keys_direction = "left";
                            else if (keys_direction.indexOf("right") >= 0) final_direction = "right", keys_direction = "right";
                        } else if (in_tile_x > right && rigbottom && tiled_pos.row - 1 < 0) {
                            if (keys_direction.indexOf("left") >= 0) final_direction = "left", keys_direction = "left";
                            else if (keys_direction.indexOf("right") >= 0) final_direction = "right", keys_direction = "right";
                        } else if (in_tile_y < top && rigtop && tiled_pos.col - 1 < 0) {
                            if (keys_direction.indexOf("up") >= 0) final_direction = "up", keys_direction = "up";
                            else if(keys_direction.indexOf("down") >= 0) final_direction = "down", keys_direction = "down";
                        } else if (in_tile_y > bottom && rigbottom && tiled_pos.col - 1 < 0) {
                            if (keys_direction.indexOf("up") >= 0) final_direction = "up", keys_direction = "up";
                            else if(keys_direction.indexOf("down") >= 0) final_direction = "down", keys_direction = "down";
                        } else if (in_tile_y < top && leftop && tiled_pos.col + 1 >= this.map.cols) {
                            if (keys_direction.indexOf("up") >= 0) final_direction = "up", keys_direction = "up";
                            else if(keys_direction.indexOf("down") >= 0) final_direction = "down", keys_direction = "down";
                        } else if (in_tile_y > bottom && lefbottom && tiled_pos.col + 1 >= this.map.cols) {
                            if (keys_direction.indexOf("up") >= 0) final_direction = "up", keys_direction = "up";
                            else if(keys_direction.indexOf("down") >= 0) final_direction = "down", keys_direction = "down";
                        } else {
                            final_direction = "uncertain";
                        }
                    }
                    break;
			}

            var object = this.map.objects[tiled_pos.col][tiled_pos.row];

            if (object.type == "bomb") {
                if (keys_direction == "left") {
                    if(this.avatar.serial > object.serial && keys_direction == object.dir && in_tile_x > 0.9) {
                        final_direction = "idle", keys_direction = "none";
                    }
                } else if (keys_direction == "right") {
                    if(this.avatar.serial > object.serial && keys_direction == object.dir && in_tile_x < 0.1) {
                        final_direction = "idle", keys_direction = "none";
                    }
                } else if (keys_direction == "up") {
                    if(this.avatar.serial > object.serial && keys_direction == object.dir && in_tile_y > 0.9) {
                        final_direction = "idle", keys_direction = "none";
                    }
                } else if (keys_direction == "down") {
                    if(this.avatar.serial > object.serial && keys_direction == object.dir && in_tile_y < 0.1) {
                        final_direction = "idle", keys_direction = "none";
                    }
                }
            };
             



			switch( final_direction ){
				case "up":
					//this.avatar.playAnimation('upwalk');
					this.avatar.body.velocity.y = -this.avatar.real_velocity;
					break;
				case "down":
					//this.avatar.playAnimation('downwalk');
					this.avatar.body.velocity.y = this.avatar.real_velocity;
					break;
				case "left":
					//if(this.avatar.scale.x < 0) this.avatar.scale.x *= -1;
		          	//this.avatar.playAnimation('sidewalk');
					this.avatar.body.velocity.x = -this.avatar.real_velocity;
					break;
				case "right":
					//if(this.avatar.scale.x > 0) this.avatar.scale.x *= -1;
		          	//this.avatar.playAnimation('sidewalk');
					this.avatar.body.velocity.x = this.avatar.real_velocity;
					break;
				case "up-idle":
					//this.avatar.playAnimation('upwalk');
					break;
				case "down-idle":
					//this.avatar.playAnimation('downwalk');
					break;
				case "left-idle":
					//if(this.avatar.scale.x < 0) this.avatar.scale.x *= -1;
					//this.avatar.playAnimation('sidewalk');
					break;
				case "right-idle":
					//if(this.avatar.scale.x > 0) this.avatar.scale.x *= -1;
			        //this.avatar.playAnimation('sidewalk');
					break;
				case "uncertain":
					if(this.updateIterator % 5 == 0)
						this.avatar.scale.x *= -1;
					this.avatar.playAnimation('sidewalk');
					break;
				case "idle":
					//this.avatar.pauseAnimation();
					break;
			}

			switch( keys_direction ){
				case "up":
					this.avatar.playAnimation('upwalk');
					break;
				case "down":
					this.avatar.playAnimation('downwalk');
					break;
				case "left":
					if(this.avatar.scale.x < 0) this.avatar.scale.x *= -1;
					this.avatar.playAnimation('sidewalk');
					break;
				case "right":
					if(this.avatar.scale.x > 0) this.avatar.scale.x *= -1;
					this.avatar.playAnimation('sidewalk');
					break;
				case "none":
					this.avatar.pauseAnimation();
					break;
				// case "uncertain":
				// 	if(this.updateIterator % 3 == 0)
				// 	this.avatar.scale.x *= -1;
				// 	break;
			}

			var emitPlayerMove = function( context ){
				var animation_id = 0;
				switch(keys_direction){
					case "none": animation_id = 0; break;
					case "left": animation_id = 1; break;
					case "right": animation_id = 2; break;
					case "up": animation_id = 3; break;
					case "down": animation_id = 4; break;
				}
                
                if(final_direction==="uncertain")
                    animation_id=5;

				SOCKET.emit("player move", [
					context.avatar.serial,
					context.avatar.x,
					context.avatar.y,
					animation_id,
                    context.updateIterator
				]);
			};

    	    if(keys_direction != "none")
			    emitPlayerMove( this );
		    else {
			    this.avatar.pauseAnimation();

			    if(prev_velocity.x != 0 || prev_velocity.y != 0 )
				    emitPlayerMove( this );
		    }

		    this.updateIterator++;

  		    this.cleanUp();
        }
    },

	render: function(){
		if(showDebug && this.is_game_started){
			this.map.objects.forEachAlive(function(member){ this.game.debug.body(member); }, this);
      		this.map.powerups.forEachAlive(function(member){ this.game.debug.body(member); }, this);
			this.map.explosions.forEachAlive(function(member){ this.game.debug.body(member); }, this);

			game.debug.body(this.avatar);
			game.debug.bodyInfo(this.avatar, 32, 32);
		}
	},

	getRandomSpawnLocation: function(){
		var random_index = Math.floor(Math.random() * this.map.spawn_points.length);
		return this.map.spawn_points[random_index];
	},

	onBombermanInExplosion: function(bomberman, explosion){
		console.log(bomberman.is_invincible, bomberman.is_dead, bomberman.is_dying, bomberman.is_infire);
		//if(bomberman.is_invincible || bomberman.is_dead || bomberman.is_dying) return;
		console.log(bomberman.serial," in explosion", bomberman.is_infire);

        if (bomberman.is_infire == 0) {
            bomberman.countInFire();    
        }
        
        bomberman.is_infire++;
        if(bomberman.is_invincible) return;
        if (bomberman.is_infire > 12 && !bomberman.is_dying && !bomberman.is_dead) {
		    SOCKET.emit('player death', {
			    victim_serial: bomberman.serial,
			    killer_serial: explosion.owner.serial
		    });
            bomberman.is_dying = true;
        }
        //bomberman.is_dying = true;
		/*
		if(!avatar.is_dying) SOCKET_CLIENT.emit('player death', {
			victim_serial: avatar.serial,
			killer_serial: explosion.owner.serial
		});*/

		//avatar.die( this.nicknames[this.avatar.serial] );
	},
    
    onBombInExplosion: function(object, explosion) {
        //console.log("onBombInExplosion", object);
        if (object.type == "bomb") object.emitExplosion();    
    },

	onAvatarCollectPowerup: function(avatar, collected_powerup){
		if(avatar.is_dead || avatar.is_dying) return;

		SOCKET.emit('player collect powerup', {
			col: collected_powerup.col,
			row: collected_powerup.row,
			type: collected_powerup.type
		});
	},

	respawnAvatar: function(){
		var spawn_point = this.getRandomSpawnLocation();
/*
		this.avatar.visible = true;
		this.avatar.revive(spawn_point.col, spawn_point.row);
		this.nicknames[this.avatar.serial].visible = true;

		this.avatar.setInvincible(true);*/

		SOCKET.emit("player spawn", {
			serial: this.avatar.serial,
			x: TILE_SIZE,//(spawn_point.col + 0.5) * TILE_SIZE,
			y: (spawn_point.row + 0.5) * TILE_SIZE,
            nickname: this.avatar.nickname
		})
	},

	cleanUp: function()
	{
	    var aCleanup = [];
	    this.map.objects.forEachDead(function(item){
	        aCleanup.push(item);
	    });

	    var i = aCleanup.length - 1;
	    while(i > -1)
	    {
	        var getitem = aCleanup[i];
	        getitem.destroy();
	        i--;
	    }
	},

	getKeysDirection: function(){
		var keys_direction = "none";

        if( this.direction == "right" && this.cursors.left.isDown && this.cursors.right.isDown) {
            keys_direction = "left";
            return keys_direction;    
        } else if( this.direction == "down" && this.cursors.up.isDown && this.cursors.down.isDown) {
            keys_direction = "up";
            return keys_direction;    
        } else {
            this.direction = "none";
        }
        
		if( this.cursors.left.isDown ){
			if( this.cursors.up.isDown )
				keys_direction = "upleft";
			else if( this.cursors.down.isDown)
				keys_direction = "downleft";
			else if( this.cursors.right.isDown )
				keys_direction = "right"; 
			else
				keys_direction = "left";

		}
		else if( this.cursors.right.isDown ){
			if( this.cursors.up.isDown )
				keys_direction = "upright";
			else if( this.cursors.down.isDown)
				keys_direction = "downright";
			else {
				keys_direction = "right";
                this.direction = keys_direction;
            }

		}
		else if( this.cursors.up.isDown ){
			if( this.cursors.down.isDown)
				keys_direction = "down";
			else
				keys_direction = "up";

		}
		else if( this.cursors.down.isDown ){
			keys_direction = "down";
            this.direction = keys_direction;
		}

		return keys_direction;
	},

	resetMap: function(){
		if (this.map) {
			for (var i = 0; i < this.players.length; i++) {
				var player = this.players[i];
				this.map.characters.remove(player);
				//player.killProperly();

				var nickname = this.nicknames[i];
				this.map.characters.remove(nickname);
			}

			for (var col = 0; col < this.map.cols; col++) {
				for (var row = 0; row < this.map.rows; row++) {
					var object = this.map.objects[col][row];
					if (object) {
						this.map.objects.remove(object);

						if (object.type=="bomb")
							object.removeProperly();
						else
							object.destroy();
					}
				}
			}

			this.map.destroy();
            this.nextRound = true;
		}

		var map_data = this.room.map;
		this.map = new Map(this.game, map_data);

		// parse bombs
		for(var l = 0; l < map_data.layers.length; l++){
			var layer = map_data.layers[l];
			if(layer.name == "bombs"){

				for(var col = 0; col < map_data.width; col++ ){
					for(var row = 0; row < map_data.height; row++ ){
						var i = row * map_data.width + col;

						if(layer.data[i] == 0) continue;

						var owner_serial = layer.data[i] - 1;
						var owner = this.players[owner_serial];

						console.log("found bomb on "+i+" owner " + owner_serial);

						var bomb = new Bomb(this.game, owner, this.map, owner.blast_power);
						bomb.setTiledPosition({ col: col, row: row });
						this.map.objects[col][row] = bomb;
						this.map.objects.add(bomb);
					}
				}
				break;
			}
		};

		for(var i = 0; i < this.players.length; i++){
			var bomberman = this.players[i];
			bomberman.is_dead = true;
            bomberman.is_dying = false;
			bomberman.visible = false;
			this.map.characters.add(bomberman);

			var nickname = this.nicknames[i];
			nickname.visible = false;
			this.map.characters.add(nickname);
		}

		this.game.world.bringToTop(this.chat_panel);
		this.game.world.bringToTop(this.message_sender);

		if (this.nextRound)
			this.respawnAvatar();
	},

	stopBeingHost: function(){
		console.log('Stop host countdowns!');

		// stop countdowns of all bombs and disappering countdowns of all powerups
		for( var col = 0; col < this.map.cols; col++ ){
			for( var row = 0; row < this.map.rows; row++ ){
				var object = this.map.objects[col][row];
				var powerup = this.map.powerups[col][row];

				if(object && object.type == "bomb" && object.countdown)
					this.game.time.events.remove( object.countdown );

				if(powerup){
					if(powerup.d_countdown) this.game.time.events.remove( powerup.d_countdown );
					if(powerup.b_countdown) this.game.time.events.remove( powerup.b_countdown );
				}
			}
		}

		// stop invisibility countdowns of all bombermen
		for( var p = 0; p < this.players.length; p++ )
			if(this.players[p].i_countdown) this.game.time.events.remove( this.players[p].i_countdown );

		IS_HOST = false;
	},

	startBeingHost: function( data/*timestamp*/ ){
		console.log('Resume host countdowns!');
        var timestamp = 0;
        if (data != undefined) {
            timestamp = data.timestamp;
            /*
            for (var i = 0; i < data.players.length; i++) {
                var player = data.players[i];
                if (player) {
                    this.players[i].is_dead = player.is_dead;
                    this.players[i].is_invincible = player.is_invincible;
                }
            }
            */
        }

		// resume countdowns of all bombs and powerups
		for( var col = 0; col < this.map.cols; col++ ){
			for( var row = 0; row < this.map.rows; row++ ){
				var object = this.map.objects[col][row];
				var powerup = this.map.powerups[col][row];

				if(object && object.type == "bomb"){
					var countdown_time_left = CONFIG.bombs_countdown - ( timestamp - object.p_timestamp );

					object.startCountdown(countdown_time_left);
				}

				if( powerup && powerup.type == "protection" ){
					console.log(timestamp - powerup.d_timestamp);
					console.log("Resume blinking? "+(timestamp - powerup.d_timestamp < CONFIG.powerup_disappear_countdown / 2))
					var d_t = timestamp - powerup.d_timestamp;

					if(d_t < CONFIG.powerup_disappear_countdown / 2)
						powerup.startBlinkingCountdown( CONFIG.powerup_disappear_countdown / 2 - d_t );

					var countdown_time_left = CONFIG.powerup_disappear_countdown - d_t;
					powerup.startDisappearCountdown( countdown_time_left );
				}
			}
		}

		// resume invisibility countdowns of all bombermen
		for( var p = 0; p < this.players.length; p++ ){
			var bomberman = this.players[p];

			if(bomberman.is_invincible){
				var countdown_time_left = CONFIG.invincibility_time - (timestamp - bomberman.i_timestamp);
				bomberman.startInvincibilityCountdown( countdown_time_left );
			}
		}

		IS_HOST = true;
	}
};
