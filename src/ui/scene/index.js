"use strict";
(function () {
	var BackboneView = require('../../lib/backbone_view');
	function Scene (game) {
		this.game = game;
		BackboneView.call(this, {
			tagName: "div",
			className: "scene",
		});
		this.template = JST['scene'];
		this.render();
		this.canvas = this.$('#canvas')[0];
		this.canvas.width = game.config.stageWidth;
		this.canvas.height = game.config.stageHeight;
		this.debugCanvas = this.$('#debugCanvas')[0];
		this.debugCanvas.width = game.config.stageWidth;
		this.debugCanvas.height = game.config.stageHeight;

		this.hud = new (require('../interface'))(this.game.model);
		this.hud.appendTo(this.$el);
	}
	Scene.prototype = Object.create(BackboneView.prototype);

	Scene.prototype.ready = function(value) {
		if (value) {
			this.hud.$el.show();
			this.hud.startTimer();
		}
		else {
			this.hud.$el.hide();
			this.hud.stopTimer();
		}
	};

	module.exports = Scene;
}());
