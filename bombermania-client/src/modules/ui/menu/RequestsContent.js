function RequestsContent( game, content_width, content_height ){
	Phaser.Group.call(this, game);

	var card_height = 100;

	var rand_int = Math.floor( Math.random() * 5 ) + 2;
	for( var i = 0; i < rand_int; i++){
		var contact_card = new RequestCard( game, content_width, card_height, "Request  "+(i+1) );
		contact_card.y = i * card_height;
		this.add(contact_card);
	}
}

RequestsContent.prototype = Object.create(Phaser.Group.prototype);

function RequestCard( game, width, height, username ){
	Phaser.Group.call(this, game);

	var font_style = { font: "28px Luckiest", fill: "#FFFFFF" };

	var name_lbl = game.add.text(0, 0, username, font_style);
	name_lbl.x = 40;
	name_lbl.y = ( height - name_lbl.height ) * 0.5;
	this.add(name_lbl);

	var decline_btn = new UIButton(game, 130, 40, 0xEA5D62, 'DECLINE');
	decline_btn.x = width - decline_btn.width - 30;
	decline_btn.y = ( height - decline_btn.height ) * 0.5;
	this.add(decline_btn);

	var accept_btn = new UIButton(game, 120, 40, 0x7CC576, 'ACCEPT');
	accept_btn.x = decline_btn.x - decline_btn.width - 5;
	accept_btn.y = ( height - accept_btn.height ) * 0.5;
	this.add(accept_btn);
}

RequestCard.prototype = Object.create(Phaser.Group.prototype);
