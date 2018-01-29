var SERIAL = 0;
var ID = "";

function SocketClient( context ){
	var socket = io();

	socket.on("player connect", this.onPlayerConnect); // when CURRENT player connects to the game
	socket.on("player disconnect", this.onPlayerDisconnect); // when OTHER player disconnects from the game
	socket.on("player spawn", this.onPlayerSpawn); // when OTHER player spawns
	socket.on("player move", this.onPlayerMove); // when OTHER player changes position
	socket.on("player death", this.onPlayerDeath);
	socket.on("new player", this.onNewPlayer); // when OTHER player connects to the game
	socket.on("powerup collect", this.onPowerupCollect); // when OTHER player collects powerup
	socket.on("bomb plant", this.onBombPlant); // when OTHER player plants a bomb
	socket.on("bomb explode", this.onBombExplode); // when bomb planted by OTHER player explodes
	socket.on("map change", this.onMapChange);
	socket.on("chat message", this.onChatMessage);
	socket.on("name update", this.onNameUpdate);

	this.emit = function(key, data){
		socket.emit(key, data);
	};

	// helper functions
	socket.isMe = this.isMe;
	socket.resetMap = this.resetMap;
	socket.context = context;

	this.socket = socket;
};

SocketClient.prototype.onPlayerConnect = function( data ){
	console.log("Socket event 'player connect'");
	console.log(data);

	SERIAL = data.player.serial;
	ID = this.id;

	// set avatar from list of available bombermen
	this.context.avatar = this.context.players[SERIAL];
	this.context.nicknames[SERIAL].text = USERNAME.substring(0, 3);

	this.context.chat_panel.addPlayer(ID, USERNAME, SERIAL, data.player.frags);
	this.context.chat_panel.sortPreviews();

	this.emit('name update', { id: ID, name: USERNAME, serial: SERIAL } );

	var map_data = data.map;

	if(map_data){
		// init map if data was passed
		this.resetMap( this.context, map_data );
		this.context.is_game_started = true;
	}
	else{
		// if data is empty - map has not yet been created by anyone
		// create it yourself and push to the server
		var map_loader = new MapLoader();
		var socket = this;

		console.log("no map data - loading from default.json");

		// load map from default.json file
		map_loader.load("/data/maps/default.json", function( map_data ){
			console.log("map loading finished");

			// populate default map with random objects
			var random_map = map_loader.insertRandomObjects( map_data );

			console.log("send map data to the server");

			// send changes to the server
			socket.emit('map change', random_map);
		});
	}
}

SocketClient.prototype.onNewPlayer = function( player_data ){
	console.log("Socket event 'new player'");
	console.log(player_data);

	this.context.chat_panel.addPlayer(player_data.id, player_data.name, player_data.serial, player_data.frags);
	this.context.chat_panel.sortPreviews();

	var bomberman = this.context.players[player_data.serial];
	this.context.nicknames[player_data.serial].text = player_data.name.substring(0, 3);

	// add bomberman to game
	bomberman.visible = player_data.is_dead;
	bomberman.is_dead = player_data.is_dead;

	bomberman.x = player_data.x - TILE_SIZE / 2;
	bomberman.y = player_data.y - bomberman.height / 2;
};

SocketClient.prototype.onNameUpdate = function( player_data ){
	console.log("Socket event 'name update'");

	this.context.chat_panel.setName(player_data.id, player_data.name);
}

SocketClient.prototype.onMapChange = function(map_data){
	this.resetMap(this.context, map_data);
	this.context.is_game_started = true;
};

SocketClient.prototype.onPlayerSpawn = function( player_data ){
	console.log("Socket event 'player spawn'");
	console.log(player_data);

	var bomberman = this.context.players[player_data.serial];
	bomberman.x = player_data.x;
	bomberman.y = player_data.y;

	var sp = bomberman.getTiledPosition();
	bomberman.revive(sp.col, sp.row);
	bomberman.alpha = 1;
	bomberman.visible = true;
	bomberman.playAnimation("idle");
	bomberman.setTemporatyInvinsible(10000);
};

SocketClient.prototype.onBombPlant = function( bomb_data ){
	console.log("bomb planted by player " + bomb_data.owner_serial)

	var owner = this.context.players[bomb_data.owner_serial];

	var bomb = new Bomb(this.context.game, owner, this.context.map, 5000, bomb_data.blast_power, this);
	bomb.setTiledPosition({col: bomb_data.col, row: bomb_data.row});

	this.context.map.objects[bomb_data.col][bomb_data.row] = bomb;
	this.context.map.objects.add(bomb);
}

SocketClient.prototype.onBombExplode = function( explosion_data ){
	console.log("bomb explode ["+explosion_data.col+";"+explosion_data.row+"]");

	var bomb = this.context.map.objects[explosion_data.col][explosion_data.row];
	if(bomb.explode) bomb.explode();

	this.context.map.resetShadows();
}

SocketClient.prototype.onPlayerMove = function( player_data ){
	var serial = player_data[0];

	var bomberman = this.context.players[serial];
	var nickname = this.context.nicknames[serial];

	var prev_x = bomberman.x;
	var prev_y = bomberman.y;

	bomberman.x = player_data[1];
	bomberman.y = player_data[2];

	nickname.x = player_data[1];
	nickname.y = player_data[2];

	var d_x = prev_x - bomberman.x;
	var d_y = prev_y - bomberman.y;

	if(d_x < 0 && bomberman.scale.x > 0)
		bomberman.scale.x *= -1;
	else if(d_x > 0 && bomberman.scale.x < 0)
		bomberman.scale.x *= -1;

	var animation_id = player_data[3];
	var animation_key = "idle";
	switch (animation_id){
		case 0: animation_key = "idle"; break;
		case 1: animation_key = "downwalk"; break;
		case 2: animation_key = "sidewalk"; break;
		case 3: animation_key = "upwalk"; break;
		case 4: animation_key = "death"; break;
	}
	if (animation_key == "idle")
		bomberman.pauseAnimation();
	else
		bomberman.playAnimation(animation_key);
};

SocketClient.prototype.onPlayerDeath = function( death_data ){
	console.log("player " + 1 + " dead");
	console.log(death_data);

	this.context.chat_panel.setFrags(death_data.victim_id, death_data.victim_frags);
	this.context.chat_panel.setFrags(death_data.killer_id, death_data.killer_frags);
	this.context.chat_panel.sortPreviews();

	var victim = this.context.players[death_data.victim_serial];
	victim.die();
};

SocketClient.prototype.onPlayerDisconnect = function( player_data ){
	console.log("player " + player_data.serial + " disconnected");
	console.log(player_data);

	var bomberman = this.context.players[player_data.serial];
	bomberman.visible = false;
	bomberman.is_dead = true;

	this.context.chat_panel.removePlayer(player_data.id);
	this.context.chat_panel.sortPreviews();

	var map = this.context.map;
	// destroy all bombs planted by player_data
	for(var col = 0; col < map.cols; col++ ){
		for(var row = 0; row < map.rows; row++ ){
			var object = map.objects[col][row];

			if(object.type == "bomb" && object.owner == bomberman){
				map.objects[col][row] = false;
				object.removeProperly();
			}
		}
	}
}

SocketClient.prototype.onPowerupCollect = function( powerup_data ){
	console.log("powerup ["+powerup_data.col+";"+powerup_data.row+"] collected");
	var powerup = this.context.map.powerups[powerup_data.col][powerup_data.row];
	this.context.map.powerups[powerup_data.col][powerup_data.row] = false;
	powerup.destroy();

	if(powerup_data.type == "protection")
	var bomberman = this.context.players[powerup_data.collector_serial];
	bomberman.x = player_data.x;
	bomberman.y = player_data.y;
	bomberman.setTemporatyInvinsible(15000);
}

SocketClient.prototype.onChatMessage = function( message ){
	console.log(message);
	this.context.chat_panel.setMessage(message.sender_id, message.text);
}

SocketClient.prototype.isMe = function( id ){
	return id == this.id;
};

SocketClient.prototype.resetMap = function( context, map_data ){
	if(context.map){
		for(var i = 0; i < context.max_players; i++){
			var player = this.context.players[i];
			context.map.characters.remove(player);
			player.killProperly();

			var nickname = context.nicknames[i];
			context.map.characters.remove(nickname);
		}

		for(var col = 0; col < context.map.cols; col++ ){
			for(var row = 0; row < context.map.rows; row++){
				var object = context.map.objects[col][row];
				if(object){
					context.map.objects.remove(object);

					if(object.type=="bomb")
						object.removeProperly();
					else
						object.destroy();
				}
			}
		}

		context.map.destroy();
	}
	console.log(map_data);
	context.map = new Map( context.game, map_data );

	// parse bombs
	for(var l = 0; l < map_data.layers.length; l++){
		var layer = map_data.layers[l];
		if(layer.name == "bombs"){

			for(var col = 0; col < map_data.width; col++ ){
				for(var row = 0; row < map_data.height; row++ ){
					var i = row * map_data.width + col;

					if(layer.data[i] == 0) continue;

					var owner_serial = layer.data[i] - 1;
					var owner = context.players[owner_serial];

					console.log("found bomb on "+i+" owner " + owner_serial);

					var bomb = new Bomb(context.game, owner, context.map, 100000, owner.blast_power, this);
					bomb.setTiledPosition({ col: col, row: row });
					context.map.objects[col][row] = bomb;
					context.map.objects.add(bomb);
				}
			}
			break;
		}
	};

	for(var i = 0; i < context.max_players; i++){
		var bomberman = context.players[i];
		bomberman.is_dead = true;
		bomberman.visible = false;
		context.map.characters.add(bomberman);

		var nickname = context.nicknames[i];
		context.map.characters.add(nickname);
	}

	context.game.world.bringToTop(context.chat_panel);
	context.game.world.bringToTop(context.message_sender);
}
