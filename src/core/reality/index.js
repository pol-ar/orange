"use strict";
(function () {
	var   b2Vec2 = Box2D.Common.Math.b2Vec2
      ,	  b2World = Box2D.Dynamics.b2World
      ,	  b2MassData = Box2D.Collision.Shapes.b2MassData
      ,	  b2DebugDraw = Box2D.Dynamics.b2DebugDraw
    ;

	function Reality(game) {
		this.game = game;

		this.phC = this.phC || this.game.config.physics;

		this.contactListener = new (require('./contact_listener'))(this);
		
		this.world = new b2World(new b2Vec2(0, 0), true);
		this.world.SetContactListener(this.contactListener);
		this.createDebug();
	}

	_.extend(Reality.prototype, Backbone.Events);

	Reality.prototype.ready = function() {
		this.trigger('gameReady');
	}

	Reality.prototype.createDebug = function(e) {
	    var debugCanvas = this.game.scene.debugCanvas;
	    this.debugContext = debugCanvas.getContext('2d');

	    var drawer = new b2DebugDraw();
	    drawer.SetSprite(this.debugContext);
	    drawer.SetDrawScale(this.phC.scale);
	    drawer.SetFillAlpha(0.3);
	    drawer.SetLineThickness(1);
	    drawer.SetFlags(b2DebugDraw.e_shapeBit | b2DebugDraw.e_jointBit);

	    this.world.SetDebugDraw(drawer);
	}

	Reality.prototype.update = function(e) {
		var dt = e.delta / 1000;
		this.trigger("beforeUpdate");
		this.world.Step(dt, this.phC.vIter, this.phC.pIter);
    	this.world.ClearForces();

    	if (global.DEBUG) {
	    	this.debugContext.save();
	    	this.debugContext.clearRect(0, 0, this.game.config.stageWidth, this.game.config.stageHeight);
	    	this.world.DrawDebugData();
	    	this.debugContext.restore();	
    	}
	}

	module.exports = Reality;
}());
