"use strict";
(function () {
	function Track(_stage) {
		this.Container_constructor();

		this.sprite = new createjs.Sprite(_stage.sheet, 'race_track');
		this.addChild(this.sprite);

		this.model = new (require('../reality/track'))(_stage.game.reality);
	};
	createjs.extend(Track, createjs.Container);
	module.exports = createjs.promote(Track, "Container");
}());