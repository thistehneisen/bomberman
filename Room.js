var uuid = require('uuid-random');
var Map = require('./Map');

function Room( max_players ){
	this.id = uuid();

	this.max_players = 8;
	this.host_id = null;
	this.rc_timestamp = 0; // reconnection timestamp - last time when room had a host

	this.players = [];
	this.map = new Map();
    this.next_spawn_index = 0; // next spawning position index

	// fill players with false values
	for( var p = 0; p < this.max_players; p++ )
		this.players.push( false );

	this.hasHost = function(){
		return this.host_id != null;
	};

	this.isHost = function( player ){
		return this.host_id == player.id;
	};

	this.setHost = function( player ){
		this.host_id = player ? player.id : null;
	};

	this.selectNewHost = function( io ){
		// find new host among active players in the room
		var host = null;
		for( var p = 0; p < this.max_players; p++ ){
			var player = this.players[p];
			if( player && player.is_active ){
				host = player;
				break;
			}
		}

		this.setHost( host );

		console.log( this.hasHost() ? "New host: " + this.host_id : "No active host" );

		// notify new host that he is 'the one', with timestamp of operation
		// so he is able to correctly resume all of the countdowns
		if( io && this.hasHost() ) {
            var data = {};
            data.timestamp = this.rc_timestamp;
            data.players = this.players;
			this.emitSpecific( io, 'become host', data/*this.rc_timestamp*/, this.host_id );
        }
	};

	this.resetMap = function(){
		this.map = new Map();
	}

	this.isFull = function(){
		return this.getPlayersCount() >= this.max_players;
	};

	this.isEmpty = function(){
		return this.getPlayersCount() <= 0;
	};

	this.getPlayersCount = function(){
		var players_count = 0;

		for( var p = 0; p < this.max_players; p++ )
			if(this.players[p]) players_count++;
			console.log("       PLayer COunt "+players_count);
		return players_count;
	}

	this.insertPlayer = function( player ){
		var serial = this.getAvailableSerial();

		// associate player with this room
		player.room_id = this.id;
		player.serial = serial;

		// insert player to array of players in the room
		this.players.splice(serial, 1, player);
	};

	this.excludePlayer = function( player ){
		// exclude player from array of players in the room
		this.players.splice(player.serial, 1, false);

		// deassociate player with this room
		player.room_id = null;
		player.serial = null;
	};

	this.emitAll = function( io, endpoint, data ){
		for( var p = 0; p < this.max_players; p++ ){
			if(!this.players[p]) continue;
			io.to(this.players[p].id).emit(endpoint, data);
		}
	};

	this.emitBroadcast = function( io, endpoint, data, except_id ){
		for( var p = 0; p < this.max_players; p++ ){
			var player = this.players[p];

			if(!player || player.id == except_id) continue;

			io.to(player.id).emit(endpoint, data);
		}
	};

	this.emitSpecific = function( io, endpoint, data, specific_id ){
		io.to(specific_id).emit( endpoint, data );
	};

};

Room.prototype.getAvailableSerial = function(){
	for( var s = 0; s < this.max_players; s++ )
		if( this.players[s] ) continue;
		else return s;
};

module.exports = Room;
