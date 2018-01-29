/*

	Returns array of tiles under explosion in format:

	[
		// explosion step 0
		[
			// tiles under explosion
			{ col: [number], row: [number] }
		],

		// explosion step 1
		[
			// tiles under explosion
			{ col: [number], row: [number] },
			{ col: [number], row: [number] },

			...

		],

		// explosion step 2
		[
			{ col: [number], row: [number] },
			{ col: [number], row: [number] },

			...

		],

		...

	]

*/

function ExplosionChain( bomb, map, excluded_direction ){
	this.map = map;
	this.steps = [ [] ];
	this.directions = [
		[-1, 0], // left
		[1, 0], // right
		[0, -1], // top
		[0, 1] // bottom
	];

	this.steps[0].push( { col: bomb.col, row: bomb.row, last: bomb.force, start: 0 } );
	this.appendBomb( bomb, excluded_direction );
}

ExplosionChain.prototype.appendBomb = function( bomb, excluded_direction ){
	// find bomb explosion step
	var e_step = 0;
	for( var s = 0; s < this.steps.length; s++ ){
		for( var t = 0; t < this.steps[s].length; t++ ){
			if( this.steps[s][t].col == bomb.col && this.steps[s][t].row == bomb.row )
				e_step = s;
		}
	}

	var objects = this.map.objects;

	// add missing steps to the array
	var last_step = e_step + bomb.force + 1;
	if(this.steps.length < last_step)
		for( var s = last_step - this.steps.length; s >= 0; s-- )
			this.steps.push( [] );

	// calculate explosion indexes in every direction
	for(var d = 0; d < this.directions.length; d++){
		var direction = this.directions[d];
		var mc = direction[0];
		var mr = direction[1];

		var direction_key = "left";
		switch(d){
			case 0: direction_key = "left"; break;
			case 1: direction_key = "right"; break;
			case 2: direction_key = "top"; break;
			case 3: direction_key = "bottom"; break;
		}


		// loop through every tile in chosen direction as far as bomb force allows
		for( var i = 1; i <= bomb.force; i++ ){
            if (direction_key == excluded_direction && i == 3) break;
			var relative_step = e_step + i;

			var t_col = bomb.col + i * mc;
			var t_row = bomb.row + i * mr;

			// break loop in current direction if tile is outside map bounds
			if(!((t_col >= 0 && t_col < this.map.cols ) && (t_row >= 0 && t_row < this.map.rows))) break;


			// ignore tile if it's already in the chain_path
			var ignore_tile = false;
			for( var s = 0; s < this.steps.length; s++ ){
				for( var t = 0; t < this.steps[s].length; t++)
					if(this.steps[s][t].col == t_col && this.steps[s][t].row == t_row){
						ignore_tile = true;
						this.steps[s][t].last = bomb.force;
						this.steps[s][t].start = e_step;
						break;
					}

				if( ignore_tile ) break;
			}

			if( ignore_tile ){
				continue;
			}

			var object_in_tile = objects[t_col][t_row];
			var is_tile_empty = object_in_tile ? false : true;

			if(is_tile_empty){
				this.steps[relative_step].push( { col: t_col, row: t_row, last: bomb.force, start: e_step, direction: direction_key } );
			}
			else {
				// add tile if object is destructable
				if(object_in_tile.type == "destructable" || object_in_tile.type == "bomb") {
					this.steps[relative_step].push( { col: t_col, row: t_row, last: bomb.force, start: e_step, direction: direction_key } );
               	}

				// break loop in current direction
				if(object_in_tile.type != "bomb")
				break;
			}
		}
	}

	// remove empty steps if found
	for( var s = this.steps.length - 1; s >= 0; s-- )
		if(this.steps[s].length == 0)
			this.steps.splice( s, 1 );
}

//ExplosionChain.prototype = Array.prototype;
