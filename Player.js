module.exports = function( client_id ){
	this.id = client_id; // player socket client id

	this.room_id = null; // room id player currently at
	this.serial = null; // serial number inside the room

	// in-game properties
	this.name = "Guest";
	this.x = 0;
	this.y = 0;
	this.is_dead = true;
	this.frags = 0;
	this.last_message = "Press C to type a line and press enter";
	this.animation_key = 0;
	this.is_active = true; // player has focus on game

	this.is_invincible = false;
	this.i_timestamp = 0; // timestamp when player become invincible
};
