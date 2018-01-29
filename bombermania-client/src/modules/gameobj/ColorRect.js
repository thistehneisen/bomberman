function ColorRect(game, width, height, color, radius){
	Phaser.Graphics.call(this, game, 0, 0);

  	this.lineStyle(0);
  	this.beginFill(color, 1);

  	if(radius)
		this.drawRoundedRect(0, 0, width, height, radius);
	else
  		this.drawRect(0, 0, width, height);

  	this.endFill();

  	game.add.existing(this);
};

ColorRect.prototype = Object.create(Phaser.Graphics.prototype);
ColorRect.prototype.constructor = ColorRect;
