"use strict";
(function () {

	var COUNT_PHRASES = ['READY', 'STEADY', 'GO'];

	function CountDown(_stage) {
		this.Container_constructor();

		this.text = new createjs.Text("", "bold 50px Arial", "#CD274D");
		this.text.textBaseLine = "middle";
		this.text.textAlign = "center";
		this.text.x = 300;
		this.text.y = 300;
	};
	createjs.extend(CountDown, createjs.Container);

	CountDown.prototype.start = function(callback) {
		createjs.Ticker.setPaused(false);
		var hs = [];
		this.counter = 0;
		this.addChild(this.text);

		for (var i = 0; i < COUNT_PHRASES.length; i++)
			hs.push(_.bind(this.count, this));

		async.series(hs, _.bind(function() {
			this.removeChild(this.text);
			callback();
		}, this));
	}

	CountDown.prototype.count = function(cb) {
		this.text.text = COUNT_PHRASES[this.counter++];
		createjs.Tween.get(this.text)
		.to({alpha: 0, scaleX: 0, scaleY: 0})
		.to({alpha: 1, scaleX: 1, scaleY: 1}, 1000, createjs.Ease.elasticOut)
		.call(function() {
			cb();
		});		
	}

	module.exports = createjs.promote(CountDown, "Container");
}());