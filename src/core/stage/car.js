"use strict";
(function () {
	function Car(_stage) {
		this.Container_constructor();

		this.sprite = new createjs.Sprite(_stage.sheet, 'car');
		this.sprite.set({
			regX: 20,
			regY: 20
		});
		this.addChild(this.sprite);

		this.model = new (require('../reality/car'))(_stage.game.reality);

		this.on("tick", function() {
			var canvasPosition = this.model.canvasPosition;
			this.sprite.x = canvasPosition.x;
			this.sprite.y = canvasPosition.y;
			this.sprite.set({rotation : this.model.canvasAngle});
		});
	};

	createjs.extend(Car, createjs.Container);

	Car.prototype.moveLeft = function(v) {
		this.model.toggleLeft(v);
	};

	Car.prototype.moveRight = function(v) {
		this.model.toggleRight(v);
	};

	Car.prototype.moveForward = function(v) {
		this.model.toggleForward(v);
	};

	Car.prototype.moveBackward = function(v) {
		this.model.toggleBackward(v);
	};

	Car.prototype.boost = function(v) {
		this.model.toggleBoost(v);
	};

	module.exports = createjs.promote(Car, "Container");
}());