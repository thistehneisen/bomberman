function Map(game, map_data){
	Phaser.Group.call(this, game);
	this.game = game;

	var json_data = typeof(map_data) == "string" ? JSON.parse(map_data) : map_data;

	TILE_SIZE = this.game.height / json_data.height;

	this.cols = json_data.width;
	this.rows = json_data.height;
	this.tile_width = json_data.tilewidth;
	this.tile_height = json_data.tileheight;
	this.spawn_points = [];

	this.terrain = new ColorRect(game, (this.cols - 0.5) * TILE_SIZE, (this.rows - 0.5) * TILE_SIZE, 0x003399);
	this.terrain.x = TILE_SIZE * 0.5;
	this.terrain.y = TILE_SIZE * 0.5;
	this.add(this.terrain);

	this.shadows = game.add.group();
	this.add(this.shadows);

	this.objects = game.add.group();
	this.add(this.objects);

	this.powerups = game.add.group();
	this.add(this.powerups);

	this.characters = game.add.group();
	this.add(this.characters);

	this.explosions = game.add.group();
	this.add(this.explosions);

	// fill objects array with false values
	for(var col = 0; col < this.cols; col++){
		this.objects[col] = [];
		this.powerups[col] = [];

		for(var row = 0; row < this.rows; row++){
			this.objects[col][row] = false;
			this.powerups[col][row] = false;
		}
	}

	// parse tiled layers
	var objects_data, powerups_data;
	for(var l = 0; l < json_data.layers.length; l++){
		var layer = json_data.layers[l];

		switch(layer.name){
			case "objects":
				objects_data = layer;
				break;
			case "spawn-points":
				this.parseSpawnPoints( layer );
				break;
			case "powerups":
				powerups_data = layer;
				break;
		}
	};
	this.parseObjects( objects_data, powerups_data );

	this.getCrateCount = function(){
		var crate_count = 0;
		for(var col = 0; col < this.cols; col++){
			for(var row = 0; row < this.rows; row++){
				var object = this.objects[col][row];
				if(object && object.type == "destructable")
					crate_count++;
			}
		}
		return crate_count;
	};

	this.fillWith = function(construct_function, object_count){
		var available_tiles = this.getAvailableTiles();
		object_count = Math.min(object_count, available_tiles.length);

		for(var i = 0; i < object_count; i++){
			var random_index = Math.floor(Math.random() * available_tiles.length);
			var random_tile = available_tiles[random_index];

			var object = construct_function(game);
			object.setTiledPosition(random_tile.col, random_tile.row);
			this.objects[object.col][object.row] = object;
			this.objects.add(object);

			// exclude tile from array of available ones
			available_tiles.splice(random_index, 1);
		}
	};

	this.resetShadows = function(){
		this.shadows.removeAll();

		var shadow_color =  0x00035e;

		var shadow = new ColorRect(game, TILE_SIZE * this.cols, TILE_SIZE / 2, shadow_color);
		this.shadows.add(shadow);

		shadow = new ColorRect(game, TILE_SIZE / 2, TILE_SIZE * this.rows, shadow_color);
		this.shadows.add(shadow);

		for(var col = 0; col < this.cols; col++){
			for(var row = 0; row < this.rows; row++){
				var object = this.objects[col][row];
				if(!object || object.type == "bomb") continue;

				shadow = new ColorRect(game, TILE_SIZE * 1.5, TILE_SIZE * 1.5, shadow_color);
				shadow.x = col * TILE_SIZE;
				shadow.y = row * TILE_SIZE;
				this.shadows.add(shadow);
			}
		}
	}

	this.resetShadows();

	game.add.existing(this);
}

Map.prototype = Object.create(Phaser.Group.prototype);
Map.prototype.constructor = Map;

Map.prototype.getAvailableTiles = function(){
	var available_tiles = [];

	for(var col = 0; col < this.cols; col++){
		for(var row = 0; row < this.rows; row++){
			// check, whether tile is empty(doesn't have any object on it)
			if(this.objects[col][row]) continue;

			var is_tile_available = true;

			// check, whether tile is near spawn point
			for(var s = 0; s < this.spawn_points.length; s++){
				var sp = this.spawn_points[s];
				if( (row == sp.row && col == sp.col) || // is spawn point
				    (col + 1 < this.cols && row == sp.row && col + 1 == sp.col) || // on the left
				 	(col - 1 < this.cols && row == sp.row && col - 1 == sp.col) || // on the right
					(row + 1 < this.rows && row + 1 == sp.row && col == sp.col) || // below
					(row - 1 < this.rows && row - 1 == sp.row && col == sp.col) ) // above
				{
					is_tile_available = false;
					break;
				}
			}

			if(is_tile_available)
				available_tiles.push({ col: col, row: row});
		}
	}

	return available_tiles;
};

Map.prototype.parseObjects = function( objects_layer, powerups_layer ){
	for(var row = 0; row < this.rows; row++ ){
		for(var col = 0; col < this.cols; col++ ){
			var i = row * this.cols + col;
			var tile_type = objects_layer.data[i];

			switch(tile_type){
				case 0:
					// destructable was destroyed and powerup must be dropped in its place
					if(powerups_layer.data[i] != 0){
						var powerup_key = "speed";

						switch(powerups_layer.data[i]){
							case 1: powerup_key = "blast"; break;
							case 2: powerup_key = "capacity"; break;
							case 3: powerup_key = "speed"; break;
							case 4: powerup_key = "protection"; break;
						}

						var powerup = new PowerUp(this.game, powerup_key);
						powerup.setTiledPosition(col, row);
						this.powerups[col][row] = powerup;
						this.powerups.add(powerup);
					}
					break;
				case 2:
					var indestructable = new Indestructable(this.game);
					indestructable.setTiledPosition(col, row);
					this.objects[col][row] = indestructable;
					this.objects.add(indestructable);
					break;
				case 4:
					var destructable = new Destructable(this.game);
					destructable.drop_powerup = powerups_layer.data[i];
					destructable.setTiledPosition(col, row);
					this.objects[col][row] = destructable;
					this.objects.add(destructable);
					break;
			}
		}
	}
};

Map.prototype.parseSpawnPoints = function( layer ){
	for(var row = 0; row < this.rows; row++ ){
		for(var col = 0; col < this.cols; col++ ){
			var i = row * this.cols + col;
			var tile_type = layer.data[i];

			switch(tile_type){
				case 0: continue;
				case 3:
					this.spawn_points.push( { col: col, row: row });
					break;
			}
		}
	}
};
