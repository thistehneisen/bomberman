function UIButton( game, width, height, color, label, image = ""){
	Phaser.Group.call(this, game);
    
    if (image == "") {
	    this.bg = new ColorRect(game, width, height, color, Math.min(width, height) * 0.5);
    } else {
        this.bg = game.add.sprite(0, 0, image);
        this.bg.width = width;
        this.bg.height = height;
    }

    this.bg.inputEnabled = true;
    this.bg.input.useHandCursor = true;
	
	this.bg.events.onInputDown.add( function(){
		this.onPress();
	}, this );
    
    this.bg.events.onInputOver.add( function(){
        image != "" && this.bg.loadTexture(image + "_over", 0);
    }, this );

    this.bg.events.onInputOut.add( function(){
        image != "" && this.bg.loadTexture(image, 0);
    }, this );

	var font_style = { font: "28px CooperBlack", fill: "#FFFFFF" };

	this.label = game.add.text(0, 0, label, font_style);
	this.label.x = ( this.bg.width - this.label.width ) * 0.5;
	this.label.y = ( this.bg.height - this.label.height ) * 0.5;

	this.add(this.bg);
	this.add(this.label);

	this.onPress = function(){};
}

UIButton.prototype = Object.create(Phaser.Group.prototype);
