var USERNAME = "Guest";

Retoosh.Main = function (game) {
	this.game = game;
};

Retoosh.Main.prototype = {
    create: function () {
        var bg_group = this.game.add.group();
        
        var header = this.game.add.sprite(0, 0, 'header');
        header.width = Retoosh.WIDTH;
        header.height = Retoosh.HEIGHT * 0.4;
        bg_group.add(header);

        var left = this.game.add.sprite(0, 0, 'left');
        left.width = Retoosh.WIDTH * 0.31;
        left.height = Retoosh.HEIGHT * 0.53;
        left.y = header.height;
        left.inputEnabled = true;
        left.events.onInputDown.add(this.eventListener, this);
        bg_group.add(left);

        var center = this.game.add.sprite(0, 0, 'center');
        center.width = Retoosh.WIDTH * 0.38;
        center.height = Retoosh.HEIGHT * 0.53;
        center.x = left.width;
        center.y = header.height;
        center.inputEnabled = true;
        center.events.onInputDown.add(this.eventListener, this);
        bg_group.add(center);

        var right = this.game.add.sprite(0, 0, 'right');
        right.width = Retoosh.WIDTH * 0.31;
        right.height = Retoosh.HEIGHT * 0.53;
        right.x = (left.width + center.width);
        right.y = header.height;
        right.inputEnabled = true;
        right.events.onInputDown.add(this.eventListener, this);
        bg_group.add(right);
        
        var footer = this.game.add.sprite(0, 0, 'footer');
        footer.width = Retoosh.WIDTH;
        footer.height = Retoosh.HEIGHT * 0.07;
        footer.y = (header.height + center.height);
        //footer.inputEnabled = true;
        //footer.input.useHandCursor = true; 
        footer.events.onInputDown.add(function() {
            //window.open("https://nils.digital/", "_blank");
        }, this);
        bg_group.add(footer);

        bg_group.scale.x = bg_group.scale.y;

        var context = this;

        /*
        -------------------------------------------------------
        Socket event
        -------------------------------------------------------
        */

        SOCKET.on("room found", this.onRoomFound);

        /*
        -------------------------------------------------------
        Upper and lower menus
        -------------------------------------------------------
        */
        var upper_menu = new UpperMenu( this.game );

        /*
        var lower_menu = new LowerMenu( this.game );
        lower_menu.y = Retoosh.HEIGHT - lower_menu.height;

        lower_menu.onContactsPress = function(){
          context.toggleContactsPanel();

        };
        */

        /*
        -------------------------------------------------------
        Play button
        -------------------------------------------------------
        */

        var play_btn = new UIButton( this.game, 350, 70, 0x000000, '', 'guest');
        play_btn.x = ( Retoosh.WIDTH - play_btn.width ) * 0.5;
        play_btn.y = ( Retoosh.HEIGHT - play_btn.height ) * 0.5 + 130;

        play_btn.onPress = function(){
         USERNAME = "Guest*"+ Math.floor(Math.random() * 50) + 1 ; //nickname == "" ? upper_menu.getUsername() : nickname;

          SOCKET.emit("room request", {name: USERNAME});
          //this.game.state.start('Game');
        };

        /*
        -------------------------------------------------------
        Member button
        -------------------------------------------------------
        */

        var member_btn = new UIButton(this.game, 350, 70, 0x575859, '', 'member');
        member_btn.x = ( Retoosh.WIDTH - member_btn.width ) * 0.5;
        member_btn.y = ( Retoosh.HEIGHT - member_btn.height ) * 0.5 + 220;

        /*
        -------------------------------------------------------
          Community button
        -------------------------------------------------------
        */

        /*var community_btn = new UIButton( this.game, 350, 70, 0x000000, '', 'community');
        community_btn.x = ( Retoosh.WIDTH - community_btn.width ) * 0.5;
        community_btn.y = ( Retoosh.HEIGHT - community_btn.height ) * 0.5 + 310;

        community_btn.onPress = function(){
            window.open("http://www.bomberworld.io/forum/news.php", "_blank");
        };

        var panels_margin = 40;
        var panels_height = Retoosh.HEIGHT * 0.8; //- upper_menu.height - lower_menu.height - panels_margin * 2;
        var panels_width = 550;*/

        /*
        -------------------------------------------------------
        Sign in/up panel
        -------------------------------------------------------
        */

        this.signip_panel = new TabbedPanel( this.game, panels_width, panels_height );
        this.signip_panel.default_x = Retoosh.WIDTH - this.signip_panel.width - panels_margin / 2;
        this.signip_panel.default_y = upper_menu.height + panels_margin;
        this.signip_panel.x = Retoosh.WIDTH;
        this.signip_panel.y = this.signip_panel.default_y;

        var login_content = new LoginContent( this.game, panels_width, panels_height - this.signip_panel.tab_pane.height);
        this.signip_panel.addTab( "LOG IN", login_content );

        login_content.onFacebookLogin = function( user_data ){
          upper_menu.setUsername(user_data.name);

          var nickname = user_data.given_name.substring(0,1);
          nickname += user_data.family_name.substring(0, Math.min(6, user_data.family_name.length));

          upper_menu.setState('authorized');
          upper_menu.setNickname(nickname);

          // lower_menu.setState('authorized');

          context.toggleSignipPanel();
        };

        login_content.onRegularLogin = function( user_data, user_mail ){
          var user_name = user_mail.substring(0, user_mail.indexOf('@'));
          upper_menu.setUsername(user_name);

          upper_menu.setState('authorized');
          upper_menu.setNickname(user_name);

          // lower_menu.setState('authorized');

          context.toggleSignipPanel();
        };

        var register_content = new RegisterContent( this.game, panels_width, panels_height - this.signip_panel.tab_pane.height);
        this.signip_panel.addTab( "REGISTER", register_content );

        register_content.onFacebookRegister = function( user_data ){
          upper_menu.setUsername(user_data.name);

          var nickname = user_data.given_name.substring(0,1);
          nickname += user_data.family_name.substring(0, Math.min(6, user_data.family_name.length));

          upper_menu.setState('authorized');
          upper_menu.setNickname(nickname);

          // lower_menu.setState('authorized');

          context.toggleSignipPanel();
        };

        register_content.onRegularRegister = function( user_data, user_mail ){
          var user_name = user_mail.substring(0, user_mail.indexOf('@'));
          upper_menu.setUsername(user_name);

          upper_menu.setState('authorized');
          upper_menu.setNickname(user_name);

          // lower_menu.setState('authorized');

          context.toggleSignipPanel();
        };

        member_btn.onPress = function(){
            if (window.sessionStorage['nickname'] == undefined) {
                login_content.showLoginField() 
                context.toggleSignipPanel();
            } else {
                var nickname = window.sessionStorage['nickname'];
                if(nickname == "") {
                    login_content.showNickNameField();
                    context.toggleSignipPanel();
                } else {
                    SOCKET.emit("room request", {name: nickname});
                }
            }
        };

        upper_menu.onSignipPress = function(){
            login_content.showLoginField() 
            context.toggleSignipPanel();
        };

        /*
        -------------------------------------------------------
        Contacts panel
        -------------------------------------------------------
        */
        
        this.contacts_panel = new TabbedPanel( this.game, panels_width, panels_height );
        this.contacts_panel.default_x = panels_margin / 2;
        this.contacts_panel.default_y = upper_menu.height + panels_margin;
        this.contacts_panel.x = -this.contacts_panel.width;
        this.contacts_panel.y = this.contacts_panel.default_y;

        // var friends_content = new FriendsContent( this.game, panels_width, panels_height - this.contacts_panel.tab_pane.height);
        // this.contacts_panel.addTab( "FRIENDS", friends_content );
        //
        // var requests_content = new RequestsContent( this.game, panels_width, panels_height - this.contacts_panel.tab_pane.height);
        // this.contacts_panel.addTab( "REQUESTS", requests_content );
    },

    toggleSignipPanel: function(){
      var signip_panel = this.signip_panel;

      if(signip_panel.is_toggled) return;

      if(signip_panel.is_shown){
	      signip_panel.is_toggled = true;

	      var animation_tween = this.game.add.tween(signip_panel).to( {x: Retoosh.WIDTH, y: signip_panel.y},
			  													      1000, Phaser.Easing.Back.InOut, true );
	      animation_tween.onComplete.add( function(){
		      signip_panel.is_toggled = false;
		      signip_panel.is_shown = false;
	      });
      }
      else{
	      signip_panel.is_toggled = true;

	      var animation_tween = this.game.add.tween(signip_panel).to( {x: signip_panel.default_x, y: signip_panel.default_y},
			  													      900, Phaser.Easing.Back.Out, true );
	      animation_tween.onComplete.add( function(){
		      signip_panel.is_toggled = false;
		      signip_panel.is_shown = true;
	      });
      }
    },

    eventListener: function(sprite){
        var signip_panel = this.signip_panel;
        if(signip_panel.is_shown){
            if (this.input.x > signip_panel.x && this.input.x < signip_panel.x + signip_panel.width
            && this.input.y > signip_panel.y && this.input.y < signip_panel.y + signip_panel.height) return;
             
            signip_panel.is_toggled = true;

            var animation_tween = this.game.add.tween(signip_panel).to( {x: Retoosh.WIDTH, y: signip_panel.y},
                                                                        1000, Phaser.Easing.Back.InOut, true );
            animation_tween.onComplete.add( function(){
                signip_panel.is_toggled = false;
                signip_panel.is_shown = false;
            });
        }
    },

    toggleContactsPanel: function(){
	    if (game.sound.mute === true) {
		    game.sound.mute = false;
	    } else {
		    game.sound.mute = true;
	    }

      // var signip_panel = this.contacts_panel;
	    //
      // if(signip_panel.is_toggled) return;
	    //
      // if(signip_panel.is_shown){
	    //   signip_panel.is_toggled = true;
	    //
	    //   var animation_tween = this.game.add.tween(signip_panel).to( {x: -signip_panel.width, y: signip_panel.y},
	    // 	  														  1000, Phaser.Easing.Back.InOut, true );
	    //   animation_tween.onComplete.add( function(){
	    // 	  signip_panel.is_toggled = false;
	    // 	  signip_panel.is_shown = false;
	    //   });
      // }
      // else{
	    //   signip_panel.is_toggled = true;
	    //
	    //   var animation_tween = this.game.add.tween(signip_panel).to( {x: signip_panel.default_x, y: signip_panel.default_y},
	    // 	  														  900, Phaser.Easing.Back.Out, true );
	    //   animation_tween.onComplete.add( function(){
	    // 	  signip_panel.is_toggled = false;
	    // 	  signip_panel.is_shown = true;
	    //   });
      // }
    },

    onRoomFound: function( data ){
      console.log("room found");
      game.state.start('Game', true, false, data);
    }

};

