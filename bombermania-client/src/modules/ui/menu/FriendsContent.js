function FriendsContent( game, content_width, content_height ){
	Phaser.Group.call(this, game);

	var card_height = 100;

	var rand_int = Math.floor( Math.random() * 5 ) + 2;
	for( var i = 0; i < rand_int; i++){
		var contact_card = new FriendCard( game, content_width, card_height, "Friend  "+(i+1) );
		contact_card.y = i * card_height;
		this.add(contact_card);
	}
}

FriendsContent.prototype = Object.create(Phaser.Group.prototype);

function FriendCard( game, width, height, username ){
	Phaser.Group.call(this, game);

	var font_style = { font: "28px Luckiest", fill: "#FFFFFF" };

	var name_lbl = game.add.text(0, 0, username, font_style);
	name_lbl.x = 40;
	name_lbl.y = ( height - name_lbl.height ) * 0.5;
	this.add(name_lbl);

	var join_btn = new UIButton(game, 100, 40, 0x7CC576, 'JOIN');
	join_btn.x = width - join_btn.width - 30;
	join_btn.y = ( height - join_btn.height ) * 0.5;
	this.add(join_btn);
}

FriendCard.prototype = Object.create(Phaser.Group.prototype);
