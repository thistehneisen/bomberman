var TAB_HEIGHT = 50;
var TAB_PADDING = 40;

function TabbedPanel( game, panel_width, panel_height ){
	Phaser.Group.call(this, game);

	this.tabs = [];
	this.selected_tab;

	this.tab_pane = new ColorRect(this.game, panel_width, TAB_HEIGHT, 0x000000);
	this.add(this.tab_pane);

	this.bg = new ColorRect(this.game, panel_width, panel_height, 0x000000);
	this.bg.alpha = 0.8;
	this.add(this.bg);

	this.content_area = game.add.group();
	this.content_area.y = TAB_HEIGHT;
	this.content_area.mask = new ColorRect( game, panel_width, panel_height - TAB_HEIGHT, 0x000000 );
	this.content_area.add( this.content_area.mask );
	this.add( this.content_area );

	this.addTab = function(title, content){
		var tab = new Tab(game, this.tabs.length, title, content);
		this.tabs.push( tab );
		this.add( tab );

		if(content){
			content.y = TAB_HEIGHT;
			this.add( content );

			content.visible = false;
		}

		if(this.tabs.length == 1)
			this.selectTab(0);
		else{
			var prev_tab = this.tabs[this.tabs.length - 2];
			tab.x = prev_tab.x + prev_tab.width;
		}

		var tabbed_panel = this;
		tab.onPress = function( tab_index ){
			tabbed_panel.selectTab( tab_index );
		}

		this.tab_pane.x = tab.x + tab.width;
		this.tab_pane.width = panel_width - this.tab_pane.x;
	};

	this.selectTab = function( index ){
		var tab = this.tabs[index];
		if(!tab) return;

		if(this.selected_tab)
			this.selected_tab.bg.alpha = 0.8;

		tab.bg.alpha = 0;

		this.changeContent( tab.content );

		this.selected_tab = tab;
	};

	this.changeContent = function( new_content, animation ){
		if(!animation){
			if(this.content_area.content)
				this.content_area.content.visible = false;

			new_content.visible = true;
			this.content_area.content = new_content;
		}
		else{
			switch(animation){
				case 'swipeleft':

					break;
				case 'swiperight':

					break;
			}
		}
	}
}

TabbedPanel.prototype = Object.create(Phaser.Group.prototype);

function Tab( game, index, title, content ){
	Phaser.Group.call(this, game);

	this.index = index;
	this.title = title;
	this.content = content;

	var font_style = { font: "28px Luckiest", fill: "#FFFFFF" };

	this.lbl = game.add.text(0, 0, title, font_style);
	this.lbl.x = TAB_PADDING;
	this.lbl.y = ( TAB_HEIGHT - this.lbl.height ) * 0.5;

	var tab_width = this.lbl.width + TAB_PADDING * 2;
	this.bg = new ColorRect(game, tab_width, TAB_HEIGHT, 0x000000);
	this.bg.inputEnabled = true;
	this.bg.input.useHandCursor = true;

	this.bg.events.onInputDown.add(function(){
		this.onPress( this.index );
	}, this);

	this.add(this.bg);
	this.add(this.lbl);

	this.onPress = function( tab_index ){};
}

Tab.prototype = Object.create(Phaser.Group.prototype);
