function MapLoader(){

	this.load = function( map_full_path, successCallback ){
		var rawFile = new XMLHttpRequest();

		rawFile.open("GET", map_full_path, true);
		rawFile.onreadystatechange = function(){
			if(rawFile.readyState === 4){
				if(rawFile.status === 200 || rawFile.status == 0){
					var fileContents = rawFile.responseText;
					if(successCallback) successCallback(fileContents);
				}
			}
		}
		rawFile.send(null);
	};

	this.insertRandomObjects = function( map_data ){
		var json_data = typeof(map_data) == "string" ? JSON.parse(map_data) : map_data;

		// get tiles and spawns information
		var tile_info, spawn_info, powerup_info;
		for( var l = 0; l < json_data.layers.length; l++ ){
			var layer = json_data.layers[l];

			switch(layer.name){
				case "objects":
					tile_info = layer.data
					break;
				case "spawn-points":
					spawn_info = layer.data
					break;
				case "powerups":
					powerup_info = layer.data
					break;
			}
		};

		// convert tile info into two-dimensional array(map) for easier calculations
		var spawns = [];
		var tile_map = { cols: json_data.width,
						 rows: json_data.height };

		for( var col = 0; col < json_data.width; col++ ){
			tile_map[col] = [];

			for( var row = 0; row < json_data.height; row++ ){
				var i = row * json_data.width + col;
				tile_map[col][row] = tile_info[i];

				if(spawn_info[i] !=0)
					spawns.push({ col: col, row: row });
			}
		}

		// fill map with objects
		var context = this;
		var fillWith = function(tile_id, count){
			var available_tiles = context.getAvailableTiles( tile_map, spawns );
			count = Math.min(count, available_tiles.length);

			for(var i = 0; i < count; i++){
				var random_index = Math.floor(Math.random() * available_tiles.length);
				var random_tile = available_tiles[random_index];

				var ri = random_tile.row * json_data.width + random_tile.col;
				tile_info[ri] = tile_id;

				// exclude tile from array of available ones
				available_tiles.splice(random_index, 1);
			}
		}

		fillWith(2, 5); // insert walls
		fillWith(4, 120); // insert crates

		// decide which powerups will be dropped
		for( var i = 0; i < tile_info.length; i++ ){
			if(tile_info[i] == 4) // if destructable crate - generate powerup_info
				powerup_info[i] = this.randomizePowerup();
		}

		for( var l = 0; l < json_data.layers.length; l++ )
			if(json_data.layers[l].name == "objects")
				json_data.layers[l].data = tile_info;

		return json_data;
	}
}


MapLoader.prototype.getAvailableTiles = function( tile_map, spawn_points ){
	var available_tiles = [];

	for(var col = 0; col < tile_map.cols; col++){
		for(var row = 0; row < tile_map.rows; row++){
			// check, whether tile is empty(doesn't have any object on it)
			if(tile_map[col][row] != 0) continue;

			var is_tile_available = true;

			// check, whether tile is near spawn point
			for(var s = 0; s < spawn_points.length; s++){
				var sp = spawn_points[s];
				if( (row == sp.row && col == sp.col) || // is spawn point
				    (col + 1 < tile_map.cols && row == sp.row && col + 1 == sp.col) || // on the left
				 	(col - 1 < tile_map.cols && row == sp.row && col - 1 == sp.col) || // on the right
					(row + 1 < tile_map.rows && row + 1 == sp.row && col == sp.col) || // below
					(row - 1 < tile_map.rows && row - 1 == sp.row && col == sp.col) ) // above
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

MapLoader.prototype.randomizePowerup = function(){
	var powerup_randomizer = Math.floor(Math.random() * 10000);

	if(powerup_randomizer < 15){
		return 4; // protection
	}
	else if(powerup_randomizer < 70){
		return 2; // capacity
	}
	else if(powerup_randomizer < 115){
		return 1; // blast
	}
	else if(powerup_randomizer < 80){
		return 3; // speed
	}
	else return 0; // none

	return 0;
}
