function LoginContent( game, content_width, content_height ){
	Phaser.Group.call(this, game);
    
    logged = false;

	var font_style = { font: "28px CooperBlack", fill: "#FFFFFF" };

	var login_lbl = game.add.text(0, 0, "User Name", font_style);
	login_lbl.x = ( content_width - login_lbl.width ) * 0.5;
	login_lbl.y = content_height * 0.1;
	this.add(login_lbl);

	var login_tf = game.add.inputField(10, 90, {
	    font: '23px CooperBlack',
	    fill: '#FFFFFF',
		backgroundColor: "#575957",
		cursorColor: "#FFFFFF",
	    width: content_width * 0.65,
	    padding: 9,
		borderWidth: 0,
		borderColor: "#575957",
	    borderRadius: 100
	});
	login_tf.x = ( content_width - login_tf.width ) * 0.5;
	login_tf.y = login_lbl.y + content_height * 0.07;
	this.add(login_tf);

	var password_lbl = game.add.text(0, 0, "Password", font_style);
	password_lbl.x = ( content_width - password_lbl.width ) * 0.5;
	password_lbl.y = content_height * 0.30;
	this.add(password_lbl);

	var password_tf = game.add.inputField(10, 90, {
	    font: '23px CooperBlack',
	    fill: '#FFFFFF',
		backgroundColor: "#575957",
		cursorColor: "#FFFFFF",
	    width: content_width * 0.65,
	    padding: 9,
		borderWidth: 0,
		borderColor: "#575957",
	    borderRadius: 100,
		type: PhaserInput.InputType.password
	});
	password_tf.x = ( content_width - password_tf.width ) * 0.5;
	password_tf.y = password_lbl.y + content_height * 0.07;
	this.add(password_tf);

    var nickname_lbl = game.add.text(0, 0, "Nick Name", font_style);
    nickname_lbl.x = ( content_width - nickname_lbl.width ) * 0.5;
    nickname_lbl.y = content_height * 0.2;
    nickname_lbl.visible = false;
    this.add(nickname_lbl);

    var nickname_tf = game.add.inputField(10, 90, {
        font: '23px CooperBlack',
        fill: '#FFFFFF',
        backgroundColor: "#575957",
        cursorColor: "#FFFFFF",
        width: content_width * 0.65,
        padding: 9,
        borderWidth: 0,
        borderColor: "#575957",
        borderRadius: 100
    });
    nickname_tf.x = ( content_width - nickname_tf.width ) * 0.5;
    nickname_tf.y = nickname_lbl.y + content_height * 0.07;
    nickname_tf.visible = false;
    this.add(nickname_tf);

	var signin_button = new UIButton( game, 140, 45, 0x7CC576, "LOG IN");
	signin_button.x = ( content_width - signin_button.width ) * 0.5;
	signin_button.y = content_height * 0.54;
	this.add(signin_button);

    var lost_lbl = game.add.text(0, 0, "Forgotten your password? \n Request a new one", font_style);
    lost_lbl.x = ( content_width - lost_lbl.width ) * 0.5;
    lost_lbl.y = content_height * 0.7;
    this.add(lost_lbl);

    var here_lbl = game.add.text(0, 0, "here", font_style);
    here_lbl.x = lost_lbl.x + lost_lbl.width - 70;
    here_lbl.y = content_height * 0.75;
    here_lbl.fill = "#dfb72b";
    here_lbl.inputEnabled = true;
    here_lbl.input.useHandCursor = true; 
    here_lbl.events.onInputDown.add(function() {
        window.open("http://bomberworld.io/forum/lostpassword.php", "_blank");
    }, this);
    this.add(here_lbl);

	var _this = this;

    var font_style = { font: "23px", fill: "#FFFFFF" };
    var result_lbl = game.add.text(0, 0, "", font_style);
    result_lbl.x = ( content_width - result_lbl.width ) * 0.5;
    result_lbl.y = content_height * 0.65;
    this.add(result_lbl);

    SOCKET.on('login result', function(data) {
        var json = JSON.parse(data);
        //console.log("login result:", json['status']);
        if (json['status'] == 0) {
            result_lbl.text = "The current account is invalid.";
            result_lbl.x = ( content_width - result_lbl.width ) * 0.5;
        } else if(json['status'] == 1) {
            var nickname = json['nickname'];
                       
            window.sessionStorage["nickname"] = nickname;
            if(nickname == "") {
                login_lbl.visible = false;
                login_tf.visible = false;
                password_lbl.visible = false;
                password_tf.visible = false;
                nickname_lbl.visible = true;
                nickname_tf.visible = true;
                signin_button.label.text = " SET UP";
                nickname_tf.startFocus();
                result_lbl.text = "Please setup nickname.";
                result_lbl.x = ( content_width - result_lbl.width ) * 0.5;
            } else {
                if(logged) return;
                SOCKET.emit("room request", {name: nickname});
                logged = true;
            }
            
        } else if(json['status'] == 2) {
            result_lbl.text = "Your account wasn't still allowed.";
            result_lbl.x = ( content_width - result_lbl.width ) * 0.5;
        } else if(json['status'] == 3) {
            result_lbl.text = "The current password is invalid.\n           Please input again.";
            result_lbl.x = ( content_width - result_lbl.width ) * 0.5;
        }
        
    });

    SOCKET.on('set result', function(data) {
        var json = JSON.parse(data);
        //console.log(json);
        if (json['status'] == 5) {
            var nickname = json['nickname'];
            window.sessionStorage["nickname"] = nickname;
            if(logged) return;
            SOCKET.emit("room request", {name: nickname});
            logged = true;
        }
    });

	signin_button.onPress = function(){
        if(logged || window.sessionStorage['nickname'] != undefined) return;
        if (this.label.text == "LOG IN") {
            if (login_tf.value == "") {
                login_tf.startFocus();
                result_lbl.text = "Please input user name.";
                result_lbl.x = ( content_width - result_lbl.width ) * 0.5;
                return;
            } else if(password_tf.value == "") {
                password_tf.startFocus();
                result_lbl.text = "Please input password.";
                result_lbl.x = ( content_width - result_lbl.width ) * 0.5;
                return;
            }
            
            SOCKET.emit("web login", {status:'client_login', name: login_tf.value, pwd:password_tf.value});
        } else {
            if (nickname_tf.value == "") {
                nickname_tf.startFocus();
                result_lbl.text = "Please setup nickname.";
                result_lbl.x = ( content_width - result_lbl.width ) * 0.5;
                return;
            }
            SOCKET.emit("web login", {status:'name_set', name: login_tf.value, nickname: nickname_tf.value});
        }
        
	}
    
    game.input.keyboard.addCallbacks(this, null, function(data) {
        if(logged || window.sessionStorage['nickname'] != undefined) return;
        if (data.keyCode == 9 || data.keyCode == 13) {
            if(login_tf.focus) {
                if (login_tf.value != "") {
                    login_tf.endFocus();
                    password_tf.startFocus();    
                }
            } else {
                if (signin_button.label.text == "LOG IN") {
                    if (login_tf.value == "") {
                        login_tf.startFocus();
                        result_lbl.text = "Please input user name.";
                        result_lbl.x = ( content_width - result_lbl.width ) * 0.5;
                        return;
                    } else if(password_tf.value == "") {
                        password_tf.startFocus();
                        result_lbl.text = "Please input password.";
                        result_lbl.x = ( content_width - result_lbl.width ) * 0.5;
                        return;
                    }
                    
                    SOCKET.emit("web login", {status:'client_login', name: login_tf.value, pwd:password_tf.value});
                } else {
                    if (nickname_tf.value == "") {
                        nickname_tf.startFocus();
                        result_lbl.text = "Please setup nickname.";
                        result_lbl.x = ( content_width - result_lbl.width ) * 0.5;
                        return;
                    }
                    SOCKET.emit("web login", {status:'name_set', name: login_tf.value, nickname: nickname_tf.value});
                }
            }
        }
    }, null);
    
	// var or_lbl = game.add.text(0, 0, "OR", font_style);
	// or_lbl.x = ( content_width - or_lbl.width ) * 0.5;
	// or_lbl.y = content_height * 0.7;
	// this.add(or_lbl);
	//
	// var facebook_button = new UIButton( game, 320, 45, 0x0072BC, "SIGN IN VIA FACEBOOK");
	// facebook_button.x = ( content_width - facebook_button.width ) * 0.5;
	// facebook_button.y = content_height * 0.83;
	// this.add(facebook_button);
	//
	var context = this;
	// facebook_button.onPress = function(){
	// 	webAuth.popup.authorize({
	// 		connection: 'facebook',
	// 		responseType: 'token'
	// 	},
	//
	// 	function(error, result){
	// 		if(error){
	// 			console.log(error);
	// 		}
	// 		else{
	// 			console.log(result);
	//
	// 			var xmlHttp = new XMLHttpRequest();
	// 		    xmlHttp.onreadystatechange = function() {
	// 		        if (xmlHttp.readyState == 4 && xmlHttp.status == 200)
	// 					context.onFacebookLogin( JSON.parse(xmlHttp.responseText) );
	// 		    }
	// 		    xmlHttp.open("GET", "https://flint0.auth0.com/userinfo", true); // true for asynchronous
	// 			xmlHttp.setRequestHeader("Authorization", "Bearer "+result.accessToken)
	// 		    xmlHttp.send(null);
	// 		}
	// 	});
	// }

	// this.onFacebookLogin = function( user_data ){};
	this.onRegularLogin = function( user_data ) {
    };
    
    this.showNickNameField = function() {
        login_lbl.visible = false;
        login_tf.visible = false;
        password_lbl.visible = false;
        password_tf.visible = false;
        lost_lbl.visible = false;
        here_lbl.visible = false;
        nickname_lbl.visible = true;
        nickname_tf.visible = true;
        signin_button.label.text = " SET UP";
        nickname_tf.startFocus();
        result_lbl.text = "Please setup nickname.";
        result_lbl.x = ( content_width - result_lbl.width ) * 0.5;
    }

    this.showLoginField = function() {
        login_lbl.visible = true;
        login_tf.visible = true;
        password_lbl.visible = true;
        password_tf.visible = true;
        lost_lbl.visible = true;
        here_lbl.visible = true;
        nickname_lbl.visible = false;
        nickname_tf.visible = false;
        signin_button.label.text = "LOG IN";
        login_tf.startFocus();
        result_lbl.text = "";
        result_lbl.x = ( content_width - result_lbl.width ) * 0.5;
    }
}

LoginContent.prototype = Object.create(Phaser.Group.prototype);
