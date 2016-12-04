"use strict";
(function () {

	var KEYCODE_LEFT = 37, 
		KEYCODE_RIGHT = 39,
		KEYCODE_UP = 38,
		KEYCODE_DOWN = 40,
		SHIFT = 16;

	function GameStage(game) {
		this.Stage_constructor(game.scene.canvas);

		this.game = game;

		var sheetData = this.game.queue.getResult("atlasData");
		this.sheet = new createjs.SpriteSheet(sheetData);

		this.track  = new (require('./track'))(this);
		this.addChild(this.track);

		this.car  = new (require('./car'))(this);
		this.addChild(this.car);

		this.countDown = new (require('./count_down'))(this);
		this.addChild(this.countDown);

		$(window).on('keydown', this.onKeyDown.bind(this));
		$(window).on('keyup', this.onKeyUp.bind(this));
	};

	createjs.extend(GameStage, createjs.Stage);

	GameStage.prototype.onKeyDown = function(e) {
		if (this.game.paused) return;

		switch (e.keyCode) {
			case KEYCODE_LEFT:	
				this.car.moveLeft(true);
				break;
			case KEYCODE_RIGHT: 
				this.car.moveRight(true);
				break;
			case KEYCODE_UP:
				this.car.moveForward(true);
				break;
			case KEYCODE_DOWN:
				this.car.moveBackward(true);
				break;
			case SHIFT:
				this.car.boost(true);
				break;
		}
	};

	GameStage.prototype.onKeyUp = function(e) {
		if (this.game.paused) return;

		switch (e.keyCode) {
			case KEYCODE_LEFT:	
				this.car.moveLeft(false);
				break;
			case KEYCODE_RIGHT: 
				this.car.moveRight(false);
				break;
			case KEYCODE_UP: 
				this.car.moveForward(false);
				break;
			case KEYCODE_DOWN:
				this.car.moveBackward(false);
				break;
			case SHIFT:
				this.car.boost(false);
				break;
		}
	};

	module.exports = createjs.promote(GameStage, "Stage");
}());