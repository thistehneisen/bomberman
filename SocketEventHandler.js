var Player = require("./Player");
var Room = require("./Room");

var rooms = [];
var players = [];

/*
rooms.push(new Room());
for( var i = 0; i < 7; i++ ){
	var player = new Player( "fs3fasd21" );
	players.push(player);
	rooms[0].players.push(player);
}*/

module.exports = function( io ){

	this.onClientConnect = function( client ){
		console.log('----------------------------------');
		console.log('user '+client.id+' connected!');

		client.player = new Player( client.id );
		players.push( client.player );

		// send new player his id
		client.emit("player connect", client.player )
	};

	this.onClientDisconnect = function(){
		console.log('----------------------------------');
		console.log('user '+this.id+' disconnected!');

		// exclude player from the room if he's inside one
		if(this.room){
			var ri = rooms.indexOf(this.room);

			// reset room host if current player was him
			if( this.room.isHost( this.player ) ){
				this.player.is_active = false;

				this.room.rc_timestamp = Date.now();
				this.room.selectNewHost( io );
			}

			// remove all player's bombs from room map
			for( var l = 0; l < this.room.map.layers.length; l++ ){
				if(this.room.map.layers[l].name == "bombs"){
					for( var b = 0; b < this.room.map.layers[l].data.length; b++ ){
						if( this.room.map.layers[l].data[b] == this.player.serial + 1 )
							this.room.map.layers[l].data[b] = 0;
					}
					break;
				}
			}

			// notify all players left in room about player exiting
			this.room.emitBroadcast( io, 'player exit room', this.player, this.id);

			// unassign player from room
			this.room.excludePlayer( this.player );

			// remove room if no more players left
			if(this.room.isEmpty()){
				// swap last room in array with current one(prevent undefined elements in the array)
				rooms[ri] = rooms.splice(rooms.length - 1, 1, rooms[ri])[0];

				// remove empty room from the array
				rooms.pop();
			}
		}
	};

	// when current client asks for room to enter
	this.onRoomRequest = function(client_data){
		console.log("got 'room request'");

		var t_room = null;

		// search for an empty place among existing rooms
		for( var r = 0; r < rooms.length; r++ ){
			var room = rooms[r];

			if( room.isFull() ) continue;
			else{
				t_room = room;
				break;
			}
		}

		// if all rooms are full - create new one and add it to the rooms array
		if(t_room == null){
			t_room = new Room();
			rooms.push(t_room);
		}
		this.player.name = client_data.name;
		// associate current player with the room
		t_room.insertPlayer( this.player );

		// reset room host if room doesn't have one active
		if( !t_room.hasHost() )
			t_room.selectNewHost( io );

		// allow player-requester to the room
		this.emit('room found', t_room);

		// notify other players in the room about new player
		t_room.emitBroadcast( io, 'player join room', this.player, this.id);

		// associate socket with room for easy finding in the future
		this.room = t_room;
	};

	// when current client lost game focus
	this.onPlayerUnavailable = function(){
		console.log("Player "+this.id+" unavailable");
		this.player.is_active = false;

		if( this.room.isHost( this.player ) ){
			this.room.rc_timestamp = Date.now();
			this.room.selectNewHost( io );
		}
	};

	// when current client gained game focus
	this.onPlayerAvailable = function(){
		console.log("Player "+this.id+" available");
		this.player.is_active = true;
        
		if( !this.room.hasHost() )
			this.room.selectNewHost( io );

	};

	// when current client sends message to room chat
	this.onChatMessage = function( text ){
		console.log('got message from ' + this.id + ': ' + text);

		this.player.last_message = text;

		var message = {
			sender_id: this.id,
			body: text
		};

		// send message to other players in the room
		this.room.emitAll(io, 'chat message', message);
	};

	// when current client spawns in some place on the map
	this.onPlayerSpawn = function( data ){
        /*
		this.player.x = data.x;
		this.player.y = data.y;
        */
        var tile_size = data.x;
        this.player.x = data.x = (this.room.map.spawn_order[this.room.next_spawn_index].col + 0.5) * tile_size;
        this.player.y = data.y = (this.room.map.spawn_order[this.room.next_spawn_index].row + 0.5) * tile_size;
        this.room.next_spawn_index == 7 ? this.room.next_spawn_index = 0 : this.room.next_spawn_index++;
		this.player.is_dead = false;
		this.player.is_invincible = true;//false;
		this.player.i_timestamp = Date.now();
		this.player.nickname = data.nickname;

		data.timestamp = this.player.i_timestamp;

		this.room.emitAll(io, 'player spawn', data);
	};

	// when current client changes its position
	this.onPlayerMove = function( player_data ){
        if(this.player.is_dead) return;
		this.player.x = player_data[1];
		this.player.y = player_data[2];
		this.player.animation_key = player_data[3];

		this.room.emitBroadcast(io, "player move", player_data, this.id);
	};

	// when ANY player becomes dead
	this.onPlayerDeath = function( death_data ){
		var victim = this.room.players[death_data.victim_serial];
		var killer = this.room.players[death_data.killer_serial];

        if( victim.is_invincible || victim.is_dead ) return;
        
		death_data.victim_serial == death_data.killer_serial && (victim.frags--);
		killer.frags = victim == killer ? killer.frags : killer.frags + 1;

		victim.is_dead = true;

		death_data.victim_id = victim.id;
		death_data.victim_frags = victim.frags;

		death_data.killer_id = killer.id;
		death_data.killer_frags = killer.frags;

		this.room.emitAll(io, "player death", death_data);
	};

	// when current client collected powerup
	this.onPlayerCollectPowerup = function( powerup_data ){
		// remove powerup from map
		for( var l = 0; l < this.room.map.layers.length; l++ ){
			if(this.room.map.layers[l].name == "powerups"){
				var pi = powerup_data.row * this.room.map.width + powerup_data.col;
				this.room.map.layers[l].data[pi] = 0;
				break;
			}
		}

		powerup_data.timestamp = Date.now();
		powerup_data.c_serial = this.player.serial;

		// save invicibility timestamp( so the newly entered player would be able to resume invicibility countdowns)
		if( powerup_data.type == "protection" ){
			this.player.is_invincible = true;
			this.player.i_timestamp = powerup_data.timestamp;
		};

		// notify all except current client that powerup was collected
		this.room.emitAll(io, 'player collect powerup', powerup_data);
	};

	// when ANY player loses invincibility
	this.onPlayerLostInvicibility = function( player_data ){
		this.room.players[player_data.serial].is_invincible = false;//true;

		// notify all that player lost invincibility
		this.room.emitAll(io, 'player lost invincibility', player_data);
	};

	// when current client plants bomb
	this.onPlayerPlantBomb = function( bomb_data ){
		// if(this.room.map.objects[bomb_data.col][bomb_data.row]) return;
		var owner = this.room.players[bomb_data.owner_serial];

		// add timestamp to bomb( to know independent time when it were planted )
		bomb_data.timestamp = Date.now();
		console.log('Bomb planted by ' + owner.id + ' at ['+bomb_data.col+';'+bomb_data.row+'] ');

		// TODO: sroting timestamps of every bomb on the map, so the newly entered host would be able to resume countdowns

		// set owner index in bombs layer ( so the newly entered player would see bomb on map )
		for( var l = 0; l < this.room.map.layers.length; l++ ){
			if(this.room.map.layers[l].name == "bombs"){
				var bomb_index = bomb_data.row * this.room.map.width + bomb_data.col;
				if(this.room.map.layers[l].data[bomb_index]) return;
				this.room.map.layers[l].data[bomb_index] = bomb_data.owner_serial + 1;
				break;
			}
		}

		// notify all about new bomb on the map
		this.room.emitAll(io, 'player plant bomb', bomb_data);
	};

	this.onBombExplode = function( bomb_data ){
		var objects_layer, bombs_layer;
		for(var l = 0; l < this.room.map.layers.length; l++){
			switch(this.room.map.layers[l].name){
				case "objects":
					objects_layer = this.room.map.layers[l];
					break;
				case "bombs":
					bombs_layer = this.room.map.layers[l];
					break;
			}
		}

		for( var i = 0; i < bomb_data.e_indexes.length; i++ ){
			var col = bomb_data.e_indexes[i][0];
			var row = bomb_data.e_indexes[i][1];

			var oi = row * this.room.map.width + col;
			bombs_layer.data[oi] = 0;
			objects_layer.data[oi] = 0;
		}

		bomb_data.timestamp = Date.now();

		// notify all that bomb had exploded
		this.room.emitAll(io, 'bomb explode', bomb_data);
	};

	// when powerup on map starts blinking
	this.onPowerupBlink = function( powerup_data ){
		// notify all that powerup started blinking
		this.room.emitAll(io, 'powerup blink', powerup_data);
	};

	this.onPowerupDisappear = function( powerup_data ){
		// remove powerup from room map
		for(var l = 0; l < this.room.map.layers.length; l++){
			if(this.room.map.layers[l].name != "powerups") continue;

			var oi = powerup_data.row * this.room.map.width + powerup_data.col;
			this.room.map.layers[l].data[oi] = 0;
		}

		// notify all that powerup had disappeared
		this.room.emitAll(io, 'powerup disappear', powerup_data);
	};

	this.onMapReset = function(){
		this.room.resetMap();
		this.room.emitAll(io, 'map reset', this.room);
	};

};
