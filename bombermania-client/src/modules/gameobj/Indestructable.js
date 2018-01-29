function Indestructable(game){
	Phaser.Sprite.call(this, game, 0, 0, 'ingame', "objects/indestructable");

	this.type = "indestructable";
	this.width = TILE_SIZE;
	this.height = TILE_SIZE;

	this.smoothed = false;

	game.physics.arcade.enable(this);
	this.body.immovable = true;

	this.setTiledPosition = function( col, row ){
		this.col = col;
		this.row = row;

		this.x = this.col * TILE_SIZE;
		this.y = this.row * TILE_SIZE;
	}
};

Indestructable.prototype = Object.create(Phaser.Sprite.prototype);
Indestructable.prototype.constructor = Indestructable;
