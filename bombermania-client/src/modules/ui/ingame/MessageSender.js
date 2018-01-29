function MessageSender( game ){
	PhaserInput.InputField.call(this, game, 0, 0, {
		font: '18px Arial',
		fill: '#fff',
		fillAlpha: 0.7,
		backgroundColor: "#000",
		cursorColor: "#fff",
		width: 600,
		padding: 8,
	    borderWidth: 1,
	    borderColor: '#000',
		borderRadius: 6,
		placeHolder: " Enter chat message",
		placeHolderColor: '#bbb',
		max: 176
	});

	this.x = Retoosh.HEIGHT / 2 - this.width / 2;
	this.y = 900;
	this.focusOutOnEnter = true;

	this.visible = false;

	this.keyListener = function (evt) {
        this.value = this.domElement.value;

        if (evt.keyCode === 13) { // enter key
			SOCKET.emit('chat message', this.value)

            if (this.focusOutOnEnter) this.endFocus();

            return;
        }
		else if (evt.keyCode === 27){ // escape key
			this.endFocus();
			return;
		}

        this.updateText();
        this.updateCursor();
        this.updateSelection();
        evt.preventDefault();
	};

	this.endFocus = function () {
        var _this = this;
        if (!this.focus) return;

        this.domElement.removeEventListener();

        if (this.blockInput === true)
            this.domElement.unblockKeyDownEvents();

        this.focus = false;
        if (this.value.length === 0 && null !== this.placeHolder)
            this.placeHolder.visible = true;

        this.cursor.visible = false;
        if (this.game.device.desktop)
            setTimeout(function () { _this.domElement.blur(); }, 0);
        else
            this.domElement.blur();

        if (!this.game.device.desktop) {
            PhaserInput.KeyboardOpen = false;
            PhaserInput.onKeyboardClose.dispatch();
        }

		this.visible = false;
		this.setText();
	};

	game.add.existing(this);
}

MessageSender.prototype = Object.create(PhaserInput.InputField.prototype);
