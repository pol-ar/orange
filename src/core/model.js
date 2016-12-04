"use strict";
(function () {
	var GameModel = Backbone.Model.extend({
		constructor: function(game) {
			Backbone.Model.apply(this, arguments);

		    this.set({
		    	laps: 0,
		    	laps_to_win: game.config.max_laps,
		    	best_time: global.localStorage.getItem('best_time') || 0
		    });

		    this.on('change:best_time', _.bind(function() {
		    	global.localStorage.setItem('best_time', this.get('best_time'));
		    }, this));
		},
	});
	module.exports = GameModel;
}());
