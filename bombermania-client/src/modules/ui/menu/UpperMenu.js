function UpperMenu( game ){
	Phaser.Group.call(this, game);

	var context = this;
	this.state; // 'unauthorized' or 'authorized'

	this.bg = new ColorRect(this.game, Retoosh.WIDTH, 50, 0x000000);
	this.bg.alpha = 0.8;
	this.add(this.bg);

	// greeting labels
	var greet_group = this.game.add.group();

	var font_style = { font: "28px CooperBlack", fill: "#FFFFFF" };
	var welcome_lbl = game.add.text(0, 0, "WELCOME", font_style);
	greet_group.add(welcome_lbl);

	font_style.fill = "#FFE240";
	var name_lbl = game.add.text(welcome_lbl.width + 5, 0, "  Guest", font_style);
	greet_group.add(name_lbl);

	greet_group.x = 30;
	greet_group.y = (this.height - greet_group.height) * 0.5;

	this.add(greet_group);
    
    // sign out button
    var signout_btn = new UIButton(this.game, 180, 40, 0x575859, 'LOG OUT');
    signout_btn.x = Retoosh.WIDTH - signout_btn.width - 20;
    signout_btn.y = ( this.height - signout_btn.height ) * 0.5;
    this.add(signout_btn);

    signout_btn.onPress = function(){
        //location.reload();
        window.sessionStorage.removeItem('nickname');
        context.setState('unauthorized');
    }

    // profile button
    var profilelink_btn = new UIButton(this.game, 250, 40, 0x575859, 'EDIT PROFILE');
    profilelink_btn.x = Retoosh.WIDTH - profilelink_btn.width - signout_btn.width - 40;
    profilelink_btn.y = ( this.height - profilelink_btn.height ) * 0.5;
    this.add(profilelink_btn);

    profilelink_btn.onPress = function(){
        window.open("http://bomberworld.io/forum/edit_profile.php", "_blank");
    }

	// sign in / signi up button
	var signip_btn = new UIButton(this.game, 250, 40, 0x575859, 'LOG IN/REGISTER');
	signip_btn.x = Retoosh.WIDTH - signip_btn.width - 20;
	signip_btn.y = ( this.height - signip_btn.height ) * 0.5;;
	this.add(signip_btn);

	signip_btn.onPress = function(){ context.onSignipPress(); }

	// nickname fields
	var nickname_group = game.add.group();

	font_style.fill = "#FFFFFF";
	//var nickname_lbl = game.add.text(0, 0, "NICKNAME", font_style);
	//nickname_group.add( nickname_lbl );

	var nickname_tf = game.add.inputField(0, 0, {
	    font: '23px CooperBlack', /*Luckiest*/
	    fill: '#FFE240',
		backgroundColor: "#575957",
		cursorColor: "#FFE240",
	    width: 240,
	    padding: 7,
		borderWidth: 0,
		borderColor: "#575957",
	    borderRadius: 100,
        placeHolder: "  NickName"
	});
    
    nickname_tf.x = greet_group.x + greet_group.width + 30;
    nickname_tf.y = (this.height - greet_group.height) * 0.5;
    
    nickname_tf.keyListener = function (evt) {
        this.value = this.domElement.value;
        if (evt.keyCode === 13) {
            if (this.focusOutOnEnter) {
                this.endFocus();
            }
            var nickname = this.value;
            USERNAME = nickname == "" ? "Guest" : nickname;

            SOCKET.emit("room request", {name: USERNAME});
            return;
        }
        this.updateText();
        this.updateCursor();
        this.updateSelection();
        evt.preventDefault();
    }

    if(window.sessionStorage['nickname']) {
        nickname_tf.visible = false;    
    }

	//nickname_tf.x = nickname_lbl.width + 20;
	//nickname_lbl.y = ( nickname_tf.height - nickname_lbl.height ) * 0.5;
	//nickname_group.add(nickname_tf);

	//nickname_group.x = (this.width - nickname_group.width) * 0.5;
	//nickname_group.y = (this.height - nickname_group.height) * 0.5;
	//this.add(nickname_group);

	// methods

	this.setUsername = function( username ){
		name_lbl.text = username;
	};

	this.getUsername = function(){
		return nickname_tf.value;
	};

	this.setNickname = function( nickname ){
		nickname_tf.setText( nickname );
	};

	this.getNickname = function(){
		return nickname_tf.value;
	};

	this.onSignipPress = function(){};
	this.onSignout = function(){};

	this.setState = function( state ){
		if( this.state == state ) return;
		switch( state ){
			case 'unauthorized':
				signip_btn.visible = true;
				signout_btn.visible = false;
                profilelink_btn.visible = false;
                this.setUsername("  Guest");
                //greet_group.visible = false;
				//nickname_group.visible = false;

				//name_lbl.text = "Guest";

				break;
			case 'authorized':
				signip_btn.visible = false;
				signout_btn.visible = true;
                profilelink_btn.visible = true;
                //greet_group.visible = true;
				//nickname_group.visible = true;
				break;
		}

		this.state = state;
	};
    
    var nickname = window.sessionStorage['nickname'];
    if (nickname == undefined) {     
	    this.setState('unauthorized');
    } else {
        name_lbl.text = "  " + nickname;
        this.setState('authorized');
    }
}

UpperMenu.prototype = Object.create(Phaser.Group.prototype);
