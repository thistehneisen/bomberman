function LowerMenu( game ){
	Phaser.Group.call(this, game);

	this.state; // 'unauthorized' or 'authorized'

	this.bg = new ColorRect( game, Retoosh.WIDTH, 100, 0x000000 );
	this.bg.alpha = 0.8;
	this.add(this.bg);

	// donate button
	var donate_btn = this.create( 0, 0, 'donate_icon' );
	donate_btn.height = this.height * 0.8;
	donate_btn.scale.x = donate_btn.scale.y;
	donate_btn.x = this.width - donate_btn.width - 30;
	donate_btn.y = ( this.height - donate_btn.height ) * 0.5;

	donate_btn.inputEnabled = true;
	donate_btn.input.useHandCursor = true;
	donate_btn.events.onInputDown.add( function(){
		this.onDonatePress();
	}, this );

	// contacts button
	var contacts_btn = this.create( 0, 0, 'soundon' );
	contacts_btn.height = this.height * 0.8;
	contacts_btn.scale.x = contacts_btn.scale.y;
	contacts_btn.x = 30;
	contacts_btn.y = ( this.height - contacts_btn.height ) * 0.5;

	contacts_btn.inputEnabled = true;
	contacts_btn.input.useHandCursor = true;
	contacts_btn.events.onInputDown.add( function(){
		this.onContactsPress();
		contacts_btn.key==='soundon'?contacts_btn.loadTexture('soundoff',0):contacts_btn.loadTexture('soundon',0);
	}, this );

	// this.setState = function( state ){
	// 	if( this.state == state ) return;
	//
	// 	switch( state ){
	// 		case 'unauthorized':
	// 			contacts_btn.visible = false;
	//
	// 			break;
	// 		case 'authorized':
	// 			contacts_btn.visible = true;
	//
	// 			break;
	// 	}
	//
	// 	this.state = state;
	// };

	// this.setState('unauthorized');

	this.onDonatePress = function(){};
	this.onContactsPress = function(){};
}

LowerMenu.prototype = Object.create(Phaser.Group.prototype);
