"use strict";
(function () {
	var BackboneView = require('../../lib/backbone_view');
	function HUD (model) {
		BackboneView.call(this, {
			model: model,
			tagName: "div",
			className: "hud"
		});
		this.template = JST['interface/hud'];
		this.render();
		this.listenTo(model, "change", this.render);
	}

	HUD.prototype = Object.create(BackboneView.prototype);

	HUD.prototype.startTimer = function() {
		this.start_time = new Date().getTime();
		this.model.set('start_time', this.start_time);
		this.updateTimer();
	}

	HUD.prototype.updateTimer = function() {
		this.stopTimer();
		var left = String((new Date().getTime() - this.start_time) / 1000);
		left = left.slice(0, (left.indexOf("."))+3);
		this.$('.time').text(`ELAPSED: ${left} s`);

		this.timer = setTimeout(this.updateTimer.bind(this), 100);
	}

	HUD.prototype.stopTimer = function() {
		clearTimeout(this.timer);
	}

	module.exports = HUD;
}());
