"use strict";
(function () {
	function Game(queue) {
		this.config = require('../config/game');

		this.queue = queue;

		this.model = new (require('./model'))(this);

		this.scene = new (require('../ui/scene'))(this);
		this.scene.appendTo($('.Application'));

		this.reality = new (require('./reality'))(this);

		this.stage = new (require('./stage'))(this);

	    createjs.Ticker.useRAF = true;
	    createjs.Ticker.setFPS(this.config.FPS);
		createjs.Ticker.addEventListener('tick', this.update.bind(this));

	    this.modal = new (require('../ui/modals/modal'));
	    this.modal.prepare({
	    	best_time: this.model.get('best_time'),
	    	restart: false
	    });
	    _.defer(_.bind(function() {
	    	this.modal.open(_.bind(this.start, this));
	    }, this));

	    this.paused = true;
	}

	Object.defineProperty(Game.prototype, "paused", {
		get: function() { return this._paused;},
		set: function(v) { 
			this._paused = v;
			createjs.Ticker.setPaused(v);
			this.scene.ready(!v);
		}
	});

	Game.prototype.update = function(e = {delta: 0}) {
		this.reality.update(e);
    	this.stage.update(e);
	}

	Game.prototype.start = function() {
		this.reality.ready();

		this.stage.countDown.start( _.bind( function() {
			this.paused = false;

			this.model.set('laps', 0);
			this.startTime = new Date();
			this.middle = false;
		}, this));
	}

	Game.prototype.end = function() {
		this.paused = true;
		var time = new Date().getTime() - this.model.get('start_time');
		time = Math.floor(time / 1000);

		if (time < this.model.get('best_time') || this.model.get('best_time') == 0)
		{
			this.model.set('best_time', time);
		}

		this.modal.prepare({
			time: time,
	    	best_time: this.model.get('best_time'),
	    	restart: true
	    });
	    this.modal.open(_.bind(this.start, this));

	    this.reality.ready();
	}

	Game.prototype.passedMiddle = function() {
		this.middle = true;
	}

	Game.prototype.passedFinish = function() {
		if (!this.middle) return;

		this.model.set('laps', this.model.get('laps') + 1);
		this.middle = false;

		if (this.model.get('laps') < this.config.max_laps) return;

		this.end();
	}

	module.exports = Game;
}());
