(function e(t,n,r){function s(o,u){if(!n[o]){if(!t[o]){var a=typeof require=="function"&&require;if(!u&&a)return a(o,!0);if(i)return i(o,!0);var f=new Error("Cannot find module '"+o+"'");throw f.code="MODULE_NOT_FOUND",f}var l=n[o]={exports:{}};t[o][0].call(l.exports,function(e){var n=t[o][1][e];return s(n?n:e)},l,l.exports,e,t,n,r)}return n[o].exports}var i=typeof require=="function"&&require;for(var o=0;o<r.length;o++)s(r[o]);return s})({1:[function(require,module,exports){
$( function() {
    "use strict";

    if (!Modernizr.canvas) {
        $("body").removeClass('loading');
        $("body").addClass('oldBrowser');
        return;
    }

    $("body").addClass('loading');

    var resources = require('./config/resources');

    var preloader = $('.preloader');
    var progressPercent = $('.preloader-percent');
    var queue = new createjs.LoadQueue();
    queue.on('progress', function (event) {
        var p = event.loaded;
        progressPercent.text(Math.floor(p * 100) + "%");
      });
    queue.on('complete', function (event) {
        preloader.remove();
        $("body").removeClass('loading');
        new (require('./core/game'))(queue);
    });

    queue.loadManifest(resources.assets);
});

},{"./config/resources":3,"./core/game":4}],2:[function(require,module,exports){
module.exports={
	"FPS": 60,

	"stageWidth": 600,
	"stageHeight": 600,

	"physics": {
	    "scale": 30,
	    "vIter": 8,
	    "pIter": 3
	},

	"max_laps": 1
}
},{}],3:[function(require,module,exports){
module.exports={
    "assets": [
        {"id": "atlasImg",  "src": "./assets/spritesheet/atlas.png"},
        {"id": "atlasData", "src": "./assets/spritesheet/atlas.json"}
    ]
}
},{}],4:[function(require,module,exports){
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

},{"../config/game":2,"../ui/modals/modal":17,"../ui/scene":18,"./model":5,"./reality":9,"./stage":13}],5:[function(require,module,exports){
(function (global){
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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{}],6:[function(require,module,exports){
"use strict";
(function () {
	var b2FixtureDef = Box2D.Dynamics.b2FixtureDef
      ,	  b2Fixture = Box2D.Dynamics.b2Fixture
      ,	  b2BodyDef = Box2D.Dynamics.b2BodyDef
      ,	  b2Body = Box2D.Dynamics.b2Body
      ,	  b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
      ,   b2Vec2 = Box2D.Common.Math.b2Vec2
      ;

    var speed_factor = 4, boost_factor = 6, torque = 0.15, radius = 0.3;

	function Car(reality) {
		var bodyDef = new b2BodyDef();
		bodyDef.type = b2Body.b2_dynamicBody;
		var body = reality.world.CreateBody(bodyDef);
		body.SetLinearDamping(0.5);
		body.SetAngularDamping(0.5);

		var fixtureDef = new b2FixtureDef();
		fixtureDef.density = 0.25;
		fixtureDef.friction = 0.4;
		fixtureDef.restituion = 0.4;
		fixtureDef.filter = (require('./filters')).CAR;

		fixtureDef.shape = new b2CircleShape(radius);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(0, -radius));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(radius);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(0, radius));
		body.CreateFixture(fixtureDef);

		this.body = body;
		this.scale = reality.phC.scale;

		this.startReady();

		reality.on("beforeUpdate", this.moveCar.bind(this));
		reality.on("gameReady", this.startReady.bind(this));
	};

	Object.defineProperty(Car.prototype, "physicsPosition", {
		get: function() { return this.body.GetPosition().Copy();},
		set: function(v) { this.body.SetPosition(v);}
	});

	Object.defineProperty(Car.prototype, "canvasPosition", {
		get: function() { var p = this.physicsPosition;
			return {x: p.x * this.scale, y: p.y * this.scale};},
		set: function(v) { this.physicsPosition = new b2Vec2(v.x / this.scale, v.y / this.scale);}
	});

	Object.defineProperty(Car.prototype, "canvasAngle", {
		get: function() { return this.body.GetAngle() * 180 / Math.PI;},
		set: function(v) { this.body.SetAngle(v) * Math.PI / 180;}
	});

	Car.prototype.startReady = function() {
		this.canvasPosition = {x: 300, y: 445};
		this.body.SetAngle(Math.PI * 0.5);

		this.body.SetAngularVelocity(0);
		this.body.SetLinearVelocity(new b2Vec2(0, 0));

		this.left = false;
		this.right = false;

		this.forward = false;
		this.backward = false;

		this.boost = false;
	}

	Car.prototype.toggleLeft = function(v) {
		this.left = v;		
	}

	Car.prototype.toggleRight = function (v) {
		this.right = v;
	}

	Car.prototype.toggleForward = function (v) {
		this.forward = v;
	}

	Car.prototype.toggleBackward = function (v) {
		this.backward = v;
	}

	Car.prototype.toggleBoost = function (v) {
		this.boost = v;
	}

	Car.prototype.moveCar = function() {
		if (!this.forward && !this.backward) {
			this.body.SetAngularVelocity(0);
			this.body.SetLinearVelocity(new b2Vec2(0, 0));
			return;
		} 

		var angle = this.body.GetAngle();
		var velocity = new b2Vec2(Math.sin(angle), -Math.cos(angle));

		this.body.SetAwake(true);
		var dir = !this.backward ? 1 : -1;

		if (this.right) {
			this.body.ApplyTorque(dir * torque);
		}else if (this.left) {
			this.body.ApplyTorque(dir * -torque);
		}
		else
			this.body.SetAngularVelocity(0);

		velocity.Multiply(this.boost ? boost_factor : speed_factor);
		velocity.Multiply(dir);
		this.body.SetLinearVelocity(velocity);	
	}

	module.exports = Car;
}());
},{"./filters":8}],7:[function(require,module,exports){
"use strict";
(function() {
	function ContactListener(reality) {
		this.reality = reality;
		Box2D.Dynamics.b2ContactListener.call(this);
	}

	ContactListener.prototype = Object.create(Box2D.Dynamics.b2ContactListener.prototype);

	ContactListener.prototype.BeginContact = function(contact) {
		var af = contact.GetFixtureA();
    	var bf = contact.GetFixtureB();

    	if ((af.GetUserData() == "middle") || (bf.GetUserData() == "middle")) {
    		this.reality.game.passedMiddle();
    	}

    	if ((af.GetUserData() == "finish") || (bf.GetUserData() == "finish")) {
    		this.reality.game.passedFinish();
    	}
	}

	module.exports = ContactListener;
}());
},{}],8:[function(require,module,exports){
"use strict";
(function() {
	var b2FilterData = Box2D.Dynamics.b2FilterData;

	var FILTERS = {};

	var TRACK = new b2FilterData();
	TRACK.groupIndex = 0;
	TRACK.categoryBits = 0b00000001;
	TRACK.maskBits = 0b00000010;

	var CAR = new b2FilterData();
	CAR.groupIndex = 0;
	CAR.categoryBits = 0b00000010;
	CAR.maskBits = 0b00000111;

	var SENSOR = new b2FilterData();
	SENSOR.groupIndex = 0;
	SENSOR.categoryBits = 0b00000100;
	SENSOR.maskBits = 0b00000010;

	FILTERS.TRACK = TRACK;
	FILTERS.CAR = CAR;
	FILTERS.SENSOR = SENSOR;

	module.exports = FILTERS;
}());
},{}],9:[function(require,module,exports){
(function (global){
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

}).call(this,typeof global !== "undefined" ? global : typeof self !== "undefined" ? self : typeof window !== "undefined" ? window : {})

},{"./contact_listener":7}],10:[function(require,module,exports){
"use strict";
(function () {
	var b2FixtureDef = Box2D.Dynamics.b2FixtureDef
      ,	  b2Fixture = Box2D.Dynamics.b2Fixture
      ,	  b2BodyDef = Box2D.Dynamics.b2BodyDef
      ,	  b2Body = Box2D.Dynamics.b2Body
      ,	  b2PolygonShape = Box2D.Collision.Shapes.b2PolygonShape
      ,   b2CircleShape = Box2D.Collision.Shapes.b2CircleShape
      ,   b2EdgeShape = Box2D.Collision.Shapes.b2EdgeShape
      ,   b2Vec2 = Box2D.Common.Math.b2Vec2
      ;

	function Track(reality) {
		var bodyDef = new b2BodyDef();
		bodyDef.type = b2Body.b2_staticBody;
		var body = reality.world.CreateBody(bodyDef);

		var fixtureDef = new b2FixtureDef();
		fixtureDef.density = 1;
		fixtureDef.friction = 0.3;
		fixtureDef.restituion = 0.2;
		fixtureDef.filter = (require('./filters')).TRACK;
		var scale = reality.phC.scale;

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 0   / scale,  63 / scale),
	      new b2Vec2( 0   / scale,  0 / scale),
	      new b2Vec2( 63   / scale,  0 / scale),
	    ], 3);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 0   / scale,  40 / scale),
	      new b2Vec2( 17   / scale,  47 / scale),
	      new b2Vec2( 0   / scale,  97 / scale),
	    ], 3);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 88   / scale,  0 / scale),
	      new b2Vec2( 36   / scale,  25 / scale),
	      new b2Vec2( 36   / scale,  0 / scale),
	    ], 3);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 0   / scale,  112 / scale),
   	      new b2Vec2( 2   / scale,  112 / scale),
	      new b2Vec2( 20   / scale,  240 / scale),
	      new b2Vec2( 0   / scale,  240 / scale),
	    ], 4);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
		  new b2Vec2( 20   / scale,  240 / scale),
	      new b2Vec2( 50   / scale,  202 / scale),
   	      new b2Vec2( 137   / scale,  240 / scale),
	    ], 3);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
		  new b2Vec2( 20   / scale,  240 / scale),
	      new b2Vec2( 10   / scale,  162 / scale),
   	      new b2Vec2( 50   / scale,  202 / scale),
	    ], 3);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 0   / scale,  240 / scale),
	      new b2Vec2( 137   / scale,  240 / scale),
	      new b2Vec2( 170   / scale,  338 / scale),
	      new b2Vec2( 0   / scale,  338 / scale),
	    ], 4);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 170   / scale,  338 / scale),
   	      new b2Vec2( 0   / scale,  450 / scale),
	      new b2Vec2( 0   / scale,  338 / scale),
	    ], 3);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 0   / scale,  450 / scale),
	      new b2Vec2( 50   / scale,  420 / scale),
	      new b2Vec2( 18   / scale,  460 / scale),
	    ], 3);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 0   / scale,  450 / scale),
	      new b2Vec2( 18   / scale,  460 / scale),
	      new b2Vec2( 0   / scale,  525 / scale),
	    ], 3);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 20   / scale,  542 / scale),
	      new b2Vec2( 12   / scale,  470 / scale),
	      new b2Vec2( 0   / scale,  525 / scale),
	    ], 3);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 0   / scale,  525 / scale),
	      new b2Vec2( 80   / scale,  600 / scale),
	      new b2Vec2( 0   / scale,  600 / scale),
	    ], 3);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(5.6);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(10.1, 21.3));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 160   / scale,  600 / scale),
	      new b2Vec2( 115   / scale,  600 / scale),
	      new b2Vec2( 145   / scale,  575 / scale),
	    ], 3);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(50 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(105 / scale, 110 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(50 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(495 / scale, 127 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(57 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(470 / scale, 133 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 272   / scale,  104 / scale),
	      new b2Vec2( 445   / scale,  80 / scale),
	      new b2Vec2( 465   / scale,  193 / scale),
	      new b2Vec2( 308   / scale,  207 / scale)
	    ], 4);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 124   / scale,  63 / scale),
	      new b2Vec2( 276   / scale,  107 / scale),
	      new b2Vec2( 240   / scale,  225 / scale),
	      new b2Vec2( 95   / scale,  161 / scale)
	    ], 4);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 190   / scale,  201 / scale),
	      new b2Vec2( 238   / scale,  182 / scale),
	      new b2Vec2( 306   / scale,  417 / scale),
	      new b2Vec2( 251   / scale,  421 / scale)
	    ], 4);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 320   / scale,  264 / scale),
	      new b2Vec2( 600   / scale,  250 / scale),
	      new b2Vec2( 600   / scale,  360 / scale),
	      new b2Vec2( 345   / scale,  338 / scale)
	    ], 4);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(50 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(280 / scale, 160 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(45 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(225 / scale, 195 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(30 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(95 / scale, 495 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(40 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(260 / scale, 380 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(12 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(98 / scale, 525 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 144   / scale,  422 / scale),
	      new b2Vec2( 220   / scale,  378 / scale),
	      new b2Vec2( 250   / scale,  422 / scale),
	      new b2Vec2( 166   / scale,  458 / scale)
	    ], 4);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 90   / scale,  463 / scale),
	      new b2Vec2( 144   / scale,  422 / scale),
	      new b2Vec2( 166   / scale,  458 / scale),
	      new b2Vec2( 130   / scale,  500 / scale)
	    ], 4);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(37 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(505 / scale, 465 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(23 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(517 / scale, 495 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(10 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(520 / scale, 520 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(18 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(300 / scale, 400 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(34 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(480 / scale, 445 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(70 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(540 / scale, 300 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(110 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(620 / scale, 300 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(53 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(480 / scale, 300 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(15 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(320 / scale, 405 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(27 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(445 / scale, 430 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(20 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(420 / scale, 422 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 330   / scale,  395 / scale),
	      new b2Vec2( 420   / scale,  400 / scale),
	      new b2Vec2( 440   / scale,  450 / scale),
	      new b2Vec2( 335   / scale,  418 / scale)
	    ], 4);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(20 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(420 / scale, 422 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(5.6);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(10.5, 21.4));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 450   / scale,  542 / scale),
	      new b2Vec2( 516   / scale,  600 / scale),
	      new b2Vec2( 450   / scale,  600 / scale),
	    ], 3);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 600   / scale,  500 / scale),
	      new b2Vec2( 600   / scale,  600 / scale),
	      new b2Vec2( 545   / scale,  600 / scale),
	    ], 3);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 505   / scale,  600 / scale),
	      new b2Vec2( 505   / scale,  590 / scale),
	      new b2Vec2( 560   / scale,  590 / scale),
	      new b2Vec2( 560   / scale,  600 / scale),
	    ], 4);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 568   / scale,  390 / scale),
	      new b2Vec2( 600   / scale,  390 / scale),
	      new b2Vec2( 600   / scale,  445 / scale),
	    ], 3);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 600   / scale,  145 / scale),
	      new b2Vec2( 600   / scale,  205 / scale),
	      new b2Vec2( 565   / scale,  205 / scale),
	    ], 3);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 540   / scale,  0 / scale),
	      new b2Vec2( 600   / scale,  0 / scale),
	      new b2Vec2( 600   / scale,  100 / scale),
	    ], 3);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(290 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(295 / scale, -248 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = new b2CircleShape(40 / scale);
		fixtureDef.shape.SetLocalPosition(new b2Vec2(270 / scale, 10 / scale));
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 80   / scale,  0 / scale),
	      new b2Vec2( 170   / scale,  0 / scale),
	      new b2Vec2( 170  / scale,  12 / scale),
	      new b2Vec2( 80   / scale,  5 / scale),
	    ], 4);
		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 570  / scale,  50 / scale),
	      new b2Vec2( 495   / scale,  20 / scale),
	      new b2Vec2( 495   / scale,  0 / scale),
	      new b2Vec2( 570   / scale,  0 / scale),
	    ], 4);
		body.CreateFixture(fixtureDef);

	    fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 495   / scale,  20 / scale),
	      new b2Vec2( 395   / scale,  30 / scale),
   	      new b2Vec2( 395   / scale,  0 / scale),
	      new b2Vec2( 495   / scale,  0 / scale),
	    ], 4);

		body.CreateFixture(fixtureDef);

		fixtureDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 595   / scale,  445 / scale),
	      new b2Vec2( 600   / scale,  445 / scale),
	      new b2Vec2( 600  / scale,  505 / scale),
	      new b2Vec2( 595   / scale,  505 / scale),
	    ], 4);
		body.CreateFixture(fixtureDef);

		var fixDef = new b2FixtureDef();
		fixDef.shape = b2PolygonShape.AsArray([
	      new b2Vec2( 300   / scale,  420 / scale),
	      new b2Vec2( 315   / scale,  420 / scale),
	      new b2Vec2( 315  / scale,  475 / scale),
	      new b2Vec2( 300   / scale,  475 / scale),
	    ], 4);
	    fixDef.filter = (require('./filters')).SENSOR;
	    fixDef.isSensor = true;
		body.CreateFixture(fixDef).SetUserData("finish");

		fixDef.shape = new b2CircleShape(25 / scale);
		fixDef.shape.SetLocalPosition(new b2Vec2(275 / scale, 75 / scale));
		body.CreateFixture(fixDef).SetUserData("middle");

		body.SetPosition(new b2Vec2(0, 0));
	};

	module.exports = Track;
}());
},{"./filters":8}],11:[function(require,module,exports){
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
},{"../reality/car":6}],12:[function(require,module,exports){
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
},{}],13:[function(require,module,exports){
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
},{"./car":11,"./count_down":12,"./track":14}],14:[function(require,module,exports){
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
},{"../reality/track":10}],15:[function(require,module,exports){
"use strict";
(function () {
	var BackboneView = Backbone.View.extend({
		render: function() {
			if (this.model) {
				this.templateData = this.model.toJSON();
			}
		    this.$el.html(this.template(this.templateData));
		    return this;
  		}
	});

	BackboneView.prototype.appendTo = function(el) {
		this.$el.appendTo(el);
	}

	BackboneView.prototype.detach = function() {
		this.$el.detach();
	}

	module.exports = BackboneView;
}());

},{}],16:[function(require,module,exports){
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

},{"../../lib/backbone_view":15}],17:[function(require,module,exports){
"use strict";
(function () {
	var BackboneView = require('../../lib/backbone_view');
	function Modal () {
		BackboneView.call(this, {
			tagName: "div",
			className: "windowBox",
			events: {'click .btn-start': 'onClick'}
		});

		this.template = JST['modals/modal'];
		this.$app = $('.Application');
	}

	Modal.prototype = Object.create(BackboneView.prototype);

	_.extend(Modal.prototype, Backbone.Events);

	Modal.prototype.onClick = function() {
		this.close();
		this.callback && this.callback();
	}

	Modal.prototype._ah = function (p) {
		this._appHeight = this._appHeight || this.$app.height();
    	return Math.floor(this._appHeight * p);
	}

	Modal.prototype.close = function() {
		this.$el
        .velocity({translateY : this._ah(0.46)}, 200)
        .velocity({translateY : this._ah(1.50)}, {
          complete: _.bind(this.detach, this)}
        , 400);
	}

	Modal.prototype.open = function(callback) {
		this.callback = callback;
		this.render();
		this.appendTo(this.$app);
		this.$el
		.velocity({translateY : -1000}, 0)
        .velocity({translateY : this._ah(0.54)}, 200)
        .velocity({translateY : this._ah(0.50)}, 400);
	}

	Modal.prototype.prepare = function(data) {
		this.templateData = data;
	}
	module.exports = Modal;
}());

},{"../../lib/backbone_view":15}],18:[function(require,module,exports){
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

},{"../../lib/backbone_view":15,"../interface":16}]},{},[1])
//# sourceMappingURL=data:application/json;charset:utf-8;base64,eyJ2ZXJzaW9uIjozLCJzb3VyY2VzIjpbIm5vZGVfbW9kdWxlcy9ncnVudC1icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyaWZ5L25vZGVfbW9kdWxlcy9icm93c2VyLXBhY2svX3ByZWx1ZGUuanMiLCJzcmMvYXBwLmpzIiwic3JjL2NvbmZpZy9nYW1lLmpzb24iLCJzcmMvY29uZmlnL3Jlc291cmNlcy5qc29uIiwic3JjL2NvcmUvZ2FtZS5qcyIsInNyYy9jb3JlL21vZGVsLmpzIiwic3JjL2NvcmUvcmVhbGl0eS9jYXIuanMiLCJzcmMvY29yZS9yZWFsaXR5L2NvbnRhY3RfbGlzdGVuZXIuanMiLCJzcmMvY29yZS9yZWFsaXR5L2ZpbHRlcnMuanMiLCJzcmMvY29yZS9yZWFsaXR5L2luZGV4LmpzIiwic3JjL2NvcmUvcmVhbGl0eS90cmFjay5qcyIsInNyYy9jb3JlL3N0YWdlL2Nhci5qcyIsInNyYy9jb3JlL3N0YWdlL2NvdW50X2Rvd24uanMiLCJzcmMvY29yZS9zdGFnZS9pbmRleC5qcyIsInNyYy9jb3JlL3N0YWdlL3RyYWNrLmpzIiwic3JjL2xpYi9iYWNrYm9uZV92aWV3LmpzIiwic3JjL3VpL2ludGVyZmFjZS9pbmRleC5qcyIsInNyYy91aS9tb2RhbHMvbW9kYWwuanMiLCJzcmMvdWkvc2NlbmUvaW5kZXguanMiXSwibmFtZXMiOltdLCJtYXBwaW5ncyI6IkFBQUE7QUNBQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzVCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ2JBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNMQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7OztBQy9GQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDbkJBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDekhBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUN2QkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7QUMxQkE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOzs7O0FDeERBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7O0FDNVdBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUMxQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQzdFQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNaQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3RCQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBOztBQ3JDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTs7QUNuREE7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0E7QUFDQTtBQUNBO0FBQ0EiLCJmaWxlIjoiZ2VuZXJhdGVkLmpzIiwic291cmNlUm9vdCI6IiIsInNvdXJjZXNDb250ZW50IjpbIihmdW5jdGlvbiBlKHQsbixyKXtmdW5jdGlvbiBzKG8sdSl7aWYoIW5bb10pe2lmKCF0W29dKXt2YXIgYT10eXBlb2YgcmVxdWlyZT09XCJmdW5jdGlvblwiJiZyZXF1aXJlO2lmKCF1JiZhKXJldHVybiBhKG8sITApO2lmKGkpcmV0dXJuIGkobywhMCk7dmFyIGY9bmV3IEVycm9yKFwiQ2Fubm90IGZpbmQgbW9kdWxlICdcIitvK1wiJ1wiKTt0aHJvdyBmLmNvZGU9XCJNT0RVTEVfTk9UX0ZPVU5EXCIsZn12YXIgbD1uW29dPXtleHBvcnRzOnt9fTt0W29dWzBdLmNhbGwobC5leHBvcnRzLGZ1bmN0aW9uKGUpe3ZhciBuPXRbb11bMV1bZV07cmV0dXJuIHMobj9uOmUpfSxsLGwuZXhwb3J0cyxlLHQsbixyKX1yZXR1cm4gbltvXS5leHBvcnRzfXZhciBpPXR5cGVvZiByZXF1aXJlPT1cImZ1bmN0aW9uXCImJnJlcXVpcmU7Zm9yKHZhciBvPTA7bzxyLmxlbmd0aDtvKyspcyhyW29dKTtyZXR1cm4gc30pIiwiJCggZnVuY3Rpb24oKSB7XHJcbiAgICBcInVzZSBzdHJpY3RcIjtcclxuXHJcbiAgICBpZiAoIU1vZGVybml6ci5jYW52YXMpIHtcclxuICAgICAgICAkKFwiYm9keVwiKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xyXG4gICAgICAgICQoXCJib2R5XCIpLmFkZENsYXNzKCdvbGRCcm93c2VyJyk7XHJcbiAgICAgICAgcmV0dXJuO1xyXG4gICAgfVxyXG5cclxuICAgICQoXCJib2R5XCIpLmFkZENsYXNzKCdsb2FkaW5nJyk7XHJcblxyXG4gICAgdmFyIHJlc291cmNlcyA9IHJlcXVpcmUoJy4vY29uZmlnL3Jlc291cmNlcycpO1xyXG5cclxuICAgIHZhciBwcmVsb2FkZXIgPSAkKCcucHJlbG9hZGVyJyk7XHJcbiAgICB2YXIgcHJvZ3Jlc3NQZXJjZW50ID0gJCgnLnByZWxvYWRlci1wZXJjZW50Jyk7XHJcbiAgICB2YXIgcXVldWUgPSBuZXcgY3JlYXRlanMuTG9hZFF1ZXVlKCk7XHJcbiAgICBxdWV1ZS5vbigncHJvZ3Jlc3MnLCBmdW5jdGlvbiAoZXZlbnQpIHtcclxuICAgICAgICB2YXIgcCA9IGV2ZW50LmxvYWRlZDtcclxuICAgICAgICBwcm9ncmVzc1BlcmNlbnQudGV4dChNYXRoLmZsb29yKHAgKiAxMDApICsgXCIlXCIpO1xyXG4gICAgICB9KTtcclxuICAgIHF1ZXVlLm9uKCdjb21wbGV0ZScsIGZ1bmN0aW9uIChldmVudCkge1xyXG4gICAgICAgIHByZWxvYWRlci5yZW1vdmUoKTtcclxuICAgICAgICAkKFwiYm9keVwiKS5yZW1vdmVDbGFzcygnbG9hZGluZycpO1xyXG4gICAgICAgIG5ldyAocmVxdWlyZSgnLi9jb3JlL2dhbWUnKSkocXVldWUpO1xyXG4gICAgfSk7XHJcblxyXG4gICAgcXVldWUubG9hZE1hbmlmZXN0KHJlc291cmNlcy5hc3NldHMpO1xyXG59KTtcclxuIiwibW9kdWxlLmV4cG9ydHM9e1xyXG5cdFwiRlBTXCI6IDYwLFxyXG5cclxuXHRcInN0YWdlV2lkdGhcIjogNjAwLFxyXG5cdFwic3RhZ2VIZWlnaHRcIjogNjAwLFxyXG5cclxuXHRcInBoeXNpY3NcIjoge1xyXG5cdCAgICBcInNjYWxlXCI6IDMwLFxyXG5cdCAgICBcInZJdGVyXCI6IDgsXHJcblx0ICAgIFwicEl0ZXJcIjogM1xyXG5cdH0sXHJcblxyXG5cdFwibWF4X2xhcHNcIjogMVxyXG59IiwibW9kdWxlLmV4cG9ydHM9e1xyXG4gICAgXCJhc3NldHNcIjogW1xyXG4gICAgICAgIHtcImlkXCI6IFwiYXRsYXNJbWdcIiwgIFwic3JjXCI6IFwiLi9hc3NldHMvc3ByaXRlc2hlZXQvYXRsYXMucG5nXCJ9LFxyXG4gICAgICAgIHtcImlkXCI6IFwiYXRsYXNEYXRhXCIsIFwic3JjXCI6IFwiLi9hc3NldHMvc3ByaXRlc2hlZXQvYXRsYXMuanNvblwifVxyXG4gICAgXVxyXG59IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbihmdW5jdGlvbiAoKSB7XHJcblx0ZnVuY3Rpb24gR2FtZShxdWV1ZSkge1xyXG5cdFx0dGhpcy5jb25maWcgPSByZXF1aXJlKCcuLi9jb25maWcvZ2FtZScpO1xyXG5cclxuXHRcdHRoaXMucXVldWUgPSBxdWV1ZTtcclxuXHJcblx0XHR0aGlzLm1vZGVsID0gbmV3IChyZXF1aXJlKCcuL21vZGVsJykpKHRoaXMpO1xyXG5cclxuXHRcdHRoaXMuc2NlbmUgPSBuZXcgKHJlcXVpcmUoJy4uL3VpL3NjZW5lJykpKHRoaXMpO1xyXG5cdFx0dGhpcy5zY2VuZS5hcHBlbmRUbygkKCcuQXBwbGljYXRpb24nKSk7XHJcblxyXG5cdFx0dGhpcy5yZWFsaXR5ID0gbmV3IChyZXF1aXJlKCcuL3JlYWxpdHknKSkodGhpcyk7XHJcblxyXG5cdFx0dGhpcy5zdGFnZSA9IG5ldyAocmVxdWlyZSgnLi9zdGFnZScpKSh0aGlzKTtcclxuXHJcblx0ICAgIGNyZWF0ZWpzLlRpY2tlci51c2VSQUYgPSB0cnVlO1xyXG5cdCAgICBjcmVhdGVqcy5UaWNrZXIuc2V0RlBTKHRoaXMuY29uZmlnLkZQUyk7XHJcblx0XHRjcmVhdGVqcy5UaWNrZXIuYWRkRXZlbnRMaXN0ZW5lcigndGljaycsIHRoaXMudXBkYXRlLmJpbmQodGhpcykpO1xyXG5cclxuXHQgICAgdGhpcy5tb2RhbCA9IG5ldyAocmVxdWlyZSgnLi4vdWkvbW9kYWxzL21vZGFsJykpO1xyXG5cdCAgICB0aGlzLm1vZGFsLnByZXBhcmUoe1xyXG5cdCAgICBcdGJlc3RfdGltZTogdGhpcy5tb2RlbC5nZXQoJ2Jlc3RfdGltZScpLFxyXG5cdCAgICBcdHJlc3RhcnQ6IGZhbHNlXHJcblx0ICAgIH0pO1xyXG5cdCAgICBfLmRlZmVyKF8uYmluZChmdW5jdGlvbigpIHtcclxuXHQgICAgXHR0aGlzLm1vZGFsLm9wZW4oXy5iaW5kKHRoaXMuc3RhcnQsIHRoaXMpKTtcclxuXHQgICAgfSwgdGhpcykpO1xyXG5cclxuXHQgICAgdGhpcy5wYXVzZWQgPSB0cnVlO1xyXG5cdH1cclxuXHJcblx0T2JqZWN0LmRlZmluZVByb3BlcnR5KEdhbWUucHJvdG90eXBlLCBcInBhdXNlZFwiLCB7XHJcblx0XHRnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5fcGF1c2VkO30sXHJcblx0XHRzZXQ6IGZ1bmN0aW9uKHYpIHsgXHJcblx0XHRcdHRoaXMuX3BhdXNlZCA9IHY7XHJcblx0XHRcdGNyZWF0ZWpzLlRpY2tlci5zZXRQYXVzZWQodik7XHJcblx0XHRcdHRoaXMuc2NlbmUucmVhZHkoIXYpO1xyXG5cdFx0fVxyXG5cdH0pO1xyXG5cclxuXHRHYW1lLnByb3RvdHlwZS51cGRhdGUgPSBmdW5jdGlvbihlID0ge2RlbHRhOiAwfSkge1xyXG5cdFx0dGhpcy5yZWFsaXR5LnVwZGF0ZShlKTtcclxuICAgIFx0dGhpcy5zdGFnZS51cGRhdGUoZSk7XHJcblx0fVxyXG5cclxuXHRHYW1lLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5yZWFsaXR5LnJlYWR5KCk7XHJcblxyXG5cdFx0dGhpcy5zdGFnZS5jb3VudERvd24uc3RhcnQoIF8uYmluZCggZnVuY3Rpb24oKSB7XHJcblx0XHRcdHRoaXMucGF1c2VkID0gZmFsc2U7XHJcblxyXG5cdFx0XHR0aGlzLm1vZGVsLnNldCgnbGFwcycsIDApO1xyXG5cdFx0XHR0aGlzLnN0YXJ0VGltZSA9IG5ldyBEYXRlKCk7XHJcblx0XHRcdHRoaXMubWlkZGxlID0gZmFsc2U7XHJcblx0XHR9LCB0aGlzKSk7XHJcblx0fVxyXG5cclxuXHRHYW1lLnByb3RvdHlwZS5lbmQgPSBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMucGF1c2VkID0gdHJ1ZTtcclxuXHRcdHZhciB0aW1lID0gbmV3IERhdGUoKS5nZXRUaW1lKCkgLSB0aGlzLm1vZGVsLmdldCgnc3RhcnRfdGltZScpO1xyXG5cdFx0dGltZSA9IE1hdGguZmxvb3IodGltZSAvIDEwMDApO1xyXG5cclxuXHRcdGlmICh0aW1lIDwgdGhpcy5tb2RlbC5nZXQoJ2Jlc3RfdGltZScpIHx8IHRoaXMubW9kZWwuZ2V0KCdiZXN0X3RpbWUnKSA9PSAwKVxyXG5cdFx0e1xyXG5cdFx0XHR0aGlzLm1vZGVsLnNldCgnYmVzdF90aW1lJywgdGltZSk7XHJcblx0XHR9XHJcblxyXG5cdFx0dGhpcy5tb2RhbC5wcmVwYXJlKHtcclxuXHRcdFx0dGltZTogdGltZSxcclxuXHQgICAgXHRiZXN0X3RpbWU6IHRoaXMubW9kZWwuZ2V0KCdiZXN0X3RpbWUnKSxcclxuXHQgICAgXHRyZXN0YXJ0OiB0cnVlXHJcblx0ICAgIH0pO1xyXG5cdCAgICB0aGlzLm1vZGFsLm9wZW4oXy5iaW5kKHRoaXMuc3RhcnQsIHRoaXMpKTtcclxuXHJcblx0ICAgIHRoaXMucmVhbGl0eS5yZWFkeSgpO1xyXG5cdH1cclxuXHJcblx0R2FtZS5wcm90b3R5cGUucGFzc2VkTWlkZGxlID0gZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLm1pZGRsZSA9IHRydWU7XHJcblx0fVxyXG5cclxuXHRHYW1lLnByb3RvdHlwZS5wYXNzZWRGaW5pc2ggPSBmdW5jdGlvbigpIHtcclxuXHRcdGlmICghdGhpcy5taWRkbGUpIHJldHVybjtcclxuXHJcblx0XHR0aGlzLm1vZGVsLnNldCgnbGFwcycsIHRoaXMubW9kZWwuZ2V0KCdsYXBzJykgKyAxKTtcclxuXHRcdHRoaXMubWlkZGxlID0gZmFsc2U7XHJcblxyXG5cdFx0aWYgKHRoaXMubW9kZWwuZ2V0KCdsYXBzJykgPCB0aGlzLmNvbmZpZy5tYXhfbGFwcykgcmV0dXJuO1xyXG5cclxuXHRcdHRoaXMuZW5kKCk7XHJcblx0fVxyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IEdhbWU7XHJcbn0oKSk7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG4oZnVuY3Rpb24gKCkge1xyXG5cdHZhciBHYW1lTW9kZWwgPSBCYWNrYm9uZS5Nb2RlbC5leHRlbmQoe1xyXG5cdFx0Y29uc3RydWN0b3I6IGZ1bmN0aW9uKGdhbWUpIHtcclxuXHRcdFx0QmFja2JvbmUuTW9kZWwuYXBwbHkodGhpcywgYXJndW1lbnRzKTtcclxuXHJcblx0XHQgICAgdGhpcy5zZXQoe1xyXG5cdFx0ICAgIFx0bGFwczogMCxcclxuXHRcdCAgICBcdGxhcHNfdG9fd2luOiBnYW1lLmNvbmZpZy5tYXhfbGFwcyxcclxuXHRcdCAgICBcdGJlc3RfdGltZTogZ2xvYmFsLmxvY2FsU3RvcmFnZS5nZXRJdGVtKCdiZXN0X3RpbWUnKSB8fCAwXHJcblx0XHQgICAgfSk7XHJcblxyXG5cdFx0ICAgIHRoaXMub24oJ2NoYW5nZTpiZXN0X3RpbWUnLCBfLmJpbmQoZnVuY3Rpb24oKSB7XHJcblx0XHQgICAgXHRnbG9iYWwubG9jYWxTdG9yYWdlLnNldEl0ZW0oJ2Jlc3RfdGltZScsIHRoaXMuZ2V0KCdiZXN0X3RpbWUnKSk7XHJcblx0XHQgICAgfSwgdGhpcykpO1xyXG5cdFx0fSxcclxuXHR9KTtcclxuXHRtb2R1bGUuZXhwb3J0cyA9IEdhbWVNb2RlbDtcclxufSgpKTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbihmdW5jdGlvbiAoKSB7XHJcblx0dmFyIGIyRml4dHVyZURlZiA9IEJveDJELkR5bmFtaWNzLmIyRml4dHVyZURlZlxyXG4gICAgICAsXHQgIGIyRml4dHVyZSA9IEJveDJELkR5bmFtaWNzLmIyRml4dHVyZVxyXG4gICAgICAsXHQgIGIyQm9keURlZiA9IEJveDJELkR5bmFtaWNzLmIyQm9keURlZlxyXG4gICAgICAsXHQgIGIyQm9keSA9IEJveDJELkR5bmFtaWNzLmIyQm9keVxyXG4gICAgICAsXHQgIGIyQ2lyY2xlU2hhcGUgPSBCb3gyRC5Db2xsaXNpb24uU2hhcGVzLmIyQ2lyY2xlU2hhcGVcclxuICAgICAgLCAgIGIyVmVjMiA9IEJveDJELkNvbW1vbi5NYXRoLmIyVmVjMlxyXG4gICAgICA7XHJcblxyXG4gICAgdmFyIHNwZWVkX2ZhY3RvciA9IDQsIGJvb3N0X2ZhY3RvciA9IDYsIHRvcnF1ZSA9IDAuMTUsIHJhZGl1cyA9IDAuMztcclxuXHJcblx0ZnVuY3Rpb24gQ2FyKHJlYWxpdHkpIHtcclxuXHRcdHZhciBib2R5RGVmID0gbmV3IGIyQm9keURlZigpO1xyXG5cdFx0Ym9keURlZi50eXBlID0gYjJCb2R5LmIyX2R5bmFtaWNCb2R5O1xyXG5cdFx0dmFyIGJvZHkgPSByZWFsaXR5LndvcmxkLkNyZWF0ZUJvZHkoYm9keURlZik7XHJcblx0XHRib2R5LlNldExpbmVhckRhbXBpbmcoMC41KTtcclxuXHRcdGJvZHkuU2V0QW5ndWxhckRhbXBpbmcoMC41KTtcclxuXHJcblx0XHR2YXIgZml4dHVyZURlZiA9IG5ldyBiMkZpeHR1cmVEZWYoKTtcclxuXHRcdGZpeHR1cmVEZWYuZGVuc2l0eSA9IDAuMjU7XHJcblx0XHRmaXh0dXJlRGVmLmZyaWN0aW9uID0gMC40O1xyXG5cdFx0Zml4dHVyZURlZi5yZXN0aXR1aW9uID0gMC40O1xyXG5cdFx0Zml4dHVyZURlZi5maWx0ZXIgPSAocmVxdWlyZSgnLi9maWx0ZXJzJykpLkNBUjtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUocmFkaXVzKTtcclxuXHRcdGZpeHR1cmVEZWYuc2hhcGUuU2V0TG9jYWxQb3NpdGlvbihuZXcgYjJWZWMyKDAsIC1yYWRpdXMpKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUocmFkaXVzKTtcclxuXHRcdGZpeHR1cmVEZWYuc2hhcGUuU2V0TG9jYWxQb3NpdGlvbihuZXcgYjJWZWMyKDAsIHJhZGl1cykpO1xyXG5cdFx0Ym9keS5DcmVhdGVGaXh0dXJlKGZpeHR1cmVEZWYpO1xyXG5cclxuXHRcdHRoaXMuYm9keSA9IGJvZHk7XHJcblx0XHR0aGlzLnNjYWxlID0gcmVhbGl0eS5waEMuc2NhbGU7XHJcblxyXG5cdFx0dGhpcy5zdGFydFJlYWR5KCk7XHJcblxyXG5cdFx0cmVhbGl0eS5vbihcImJlZm9yZVVwZGF0ZVwiLCB0aGlzLm1vdmVDYXIuYmluZCh0aGlzKSk7XHJcblx0XHRyZWFsaXR5Lm9uKFwiZ2FtZVJlYWR5XCIsIHRoaXMuc3RhcnRSZWFkeS5iaW5kKHRoaXMpKTtcclxuXHR9O1xyXG5cclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoQ2FyLnByb3RvdHlwZSwgXCJwaHlzaWNzUG9zaXRpb25cIiwge1xyXG5cdFx0Z2V0OiBmdW5jdGlvbigpIHsgcmV0dXJuIHRoaXMuYm9keS5HZXRQb3NpdGlvbigpLkNvcHkoKTt9LFxyXG5cdFx0c2V0OiBmdW5jdGlvbih2KSB7IHRoaXMuYm9keS5TZXRQb3NpdGlvbih2KTt9XHJcblx0fSk7XHJcblxyXG5cdE9iamVjdC5kZWZpbmVQcm9wZXJ0eShDYXIucHJvdG90eXBlLCBcImNhbnZhc1Bvc2l0aW9uXCIsIHtcclxuXHRcdGdldDogZnVuY3Rpb24oKSB7IHZhciBwID0gdGhpcy5waHlzaWNzUG9zaXRpb247XHJcblx0XHRcdHJldHVybiB7eDogcC54ICogdGhpcy5zY2FsZSwgeTogcC55ICogdGhpcy5zY2FsZX07fSxcclxuXHRcdHNldDogZnVuY3Rpb24odikgeyB0aGlzLnBoeXNpY3NQb3NpdGlvbiA9IG5ldyBiMlZlYzIodi54IC8gdGhpcy5zY2FsZSwgdi55IC8gdGhpcy5zY2FsZSk7fVxyXG5cdH0pO1xyXG5cclxuXHRPYmplY3QuZGVmaW5lUHJvcGVydHkoQ2FyLnByb3RvdHlwZSwgXCJjYW52YXNBbmdsZVwiLCB7XHJcblx0XHRnZXQ6IGZ1bmN0aW9uKCkgeyByZXR1cm4gdGhpcy5ib2R5LkdldEFuZ2xlKCkgKiAxODAgLyBNYXRoLlBJO30sXHJcblx0XHRzZXQ6IGZ1bmN0aW9uKHYpIHsgdGhpcy5ib2R5LlNldEFuZ2xlKHYpICogTWF0aC5QSSAvIDE4MDt9XHJcblx0fSk7XHJcblxyXG5cdENhci5wcm90b3R5cGUuc3RhcnRSZWFkeSA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5jYW52YXNQb3NpdGlvbiA9IHt4OiAzMDAsIHk6IDQ0NX07XHJcblx0XHR0aGlzLmJvZHkuU2V0QW5nbGUoTWF0aC5QSSAqIDAuNSk7XHJcblxyXG5cdFx0dGhpcy5ib2R5LlNldEFuZ3VsYXJWZWxvY2l0eSgwKTtcclxuXHRcdHRoaXMuYm9keS5TZXRMaW5lYXJWZWxvY2l0eShuZXcgYjJWZWMyKDAsIDApKTtcclxuXHJcblx0XHR0aGlzLmxlZnQgPSBmYWxzZTtcclxuXHRcdHRoaXMucmlnaHQgPSBmYWxzZTtcclxuXHJcblx0XHR0aGlzLmZvcndhcmQgPSBmYWxzZTtcclxuXHRcdHRoaXMuYmFja3dhcmQgPSBmYWxzZTtcclxuXHJcblx0XHR0aGlzLmJvb3N0ID0gZmFsc2U7XHJcblx0fVxyXG5cclxuXHRDYXIucHJvdG90eXBlLnRvZ2dsZUxlZnQgPSBmdW5jdGlvbih2KSB7XHJcblx0XHR0aGlzLmxlZnQgPSB2O1x0XHRcclxuXHR9XHJcblxyXG5cdENhci5wcm90b3R5cGUudG9nZ2xlUmlnaHQgPSBmdW5jdGlvbiAodikge1xyXG5cdFx0dGhpcy5yaWdodCA9IHY7XHJcblx0fVxyXG5cclxuXHRDYXIucHJvdG90eXBlLnRvZ2dsZUZvcndhcmQgPSBmdW5jdGlvbiAodikge1xyXG5cdFx0dGhpcy5mb3J3YXJkID0gdjtcclxuXHR9XHJcblxyXG5cdENhci5wcm90b3R5cGUudG9nZ2xlQmFja3dhcmQgPSBmdW5jdGlvbiAodikge1xyXG5cdFx0dGhpcy5iYWNrd2FyZCA9IHY7XHJcblx0fVxyXG5cclxuXHRDYXIucHJvdG90eXBlLnRvZ2dsZUJvb3N0ID0gZnVuY3Rpb24gKHYpIHtcclxuXHRcdHRoaXMuYm9vc3QgPSB2O1xyXG5cdH1cclxuXHJcblx0Q2FyLnByb3RvdHlwZS5tb3ZlQ2FyID0gZnVuY3Rpb24oKSB7XHJcblx0XHRpZiAoIXRoaXMuZm9yd2FyZCAmJiAhdGhpcy5iYWNrd2FyZCkge1xyXG5cdFx0XHR0aGlzLmJvZHkuU2V0QW5ndWxhclZlbG9jaXR5KDApO1xyXG5cdFx0XHR0aGlzLmJvZHkuU2V0TGluZWFyVmVsb2NpdHkobmV3IGIyVmVjMigwLCAwKSk7XHJcblx0XHRcdHJldHVybjtcclxuXHRcdH0gXHJcblxyXG5cdFx0dmFyIGFuZ2xlID0gdGhpcy5ib2R5LkdldEFuZ2xlKCk7XHJcblx0XHR2YXIgdmVsb2NpdHkgPSBuZXcgYjJWZWMyKE1hdGguc2luKGFuZ2xlKSwgLU1hdGguY29zKGFuZ2xlKSk7XHJcblxyXG5cdFx0dGhpcy5ib2R5LlNldEF3YWtlKHRydWUpO1xyXG5cdFx0dmFyIGRpciA9ICF0aGlzLmJhY2t3YXJkID8gMSA6IC0xO1xyXG5cclxuXHRcdGlmICh0aGlzLnJpZ2h0KSB7XHJcblx0XHRcdHRoaXMuYm9keS5BcHBseVRvcnF1ZShkaXIgKiB0b3JxdWUpO1xyXG5cdFx0fWVsc2UgaWYgKHRoaXMubGVmdCkge1xyXG5cdFx0XHR0aGlzLmJvZHkuQXBwbHlUb3JxdWUoZGlyICogLXRvcnF1ZSk7XHJcblx0XHR9XHJcblx0XHRlbHNlXHJcblx0XHRcdHRoaXMuYm9keS5TZXRBbmd1bGFyVmVsb2NpdHkoMCk7XHJcblxyXG5cdFx0dmVsb2NpdHkuTXVsdGlwbHkodGhpcy5ib29zdCA/IGJvb3N0X2ZhY3RvciA6IHNwZWVkX2ZhY3Rvcik7XHJcblx0XHR2ZWxvY2l0eS5NdWx0aXBseShkaXIpO1xyXG5cdFx0dGhpcy5ib2R5LlNldExpbmVhclZlbG9jaXR5KHZlbG9jaXR5KTtcdFxyXG5cdH1cclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSBDYXI7XHJcbn0oKSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbihmdW5jdGlvbigpIHtcclxuXHRmdW5jdGlvbiBDb250YWN0TGlzdGVuZXIocmVhbGl0eSkge1xyXG5cdFx0dGhpcy5yZWFsaXR5ID0gcmVhbGl0eTtcclxuXHRcdEJveDJELkR5bmFtaWNzLmIyQ29udGFjdExpc3RlbmVyLmNhbGwodGhpcyk7XHJcblx0fVxyXG5cclxuXHRDb250YWN0TGlzdGVuZXIucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShCb3gyRC5EeW5hbWljcy5iMkNvbnRhY3RMaXN0ZW5lci5wcm90b3R5cGUpO1xyXG5cclxuXHRDb250YWN0TGlzdGVuZXIucHJvdG90eXBlLkJlZ2luQ29udGFjdCA9IGZ1bmN0aW9uKGNvbnRhY3QpIHtcclxuXHRcdHZhciBhZiA9IGNvbnRhY3QuR2V0Rml4dHVyZUEoKTtcclxuICAgIFx0dmFyIGJmID0gY29udGFjdC5HZXRGaXh0dXJlQigpO1xyXG5cclxuICAgIFx0aWYgKChhZi5HZXRVc2VyRGF0YSgpID09IFwibWlkZGxlXCIpIHx8IChiZi5HZXRVc2VyRGF0YSgpID09IFwibWlkZGxlXCIpKSB7XHJcbiAgICBcdFx0dGhpcy5yZWFsaXR5LmdhbWUucGFzc2VkTWlkZGxlKCk7XHJcbiAgICBcdH1cclxuXHJcbiAgICBcdGlmICgoYWYuR2V0VXNlckRhdGEoKSA9PSBcImZpbmlzaFwiKSB8fCAoYmYuR2V0VXNlckRhdGEoKSA9PSBcImZpbmlzaFwiKSkge1xyXG4gICAgXHRcdHRoaXMucmVhbGl0eS5nYW1lLnBhc3NlZEZpbmlzaCgpO1xyXG4gICAgXHR9XHJcblx0fVxyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IENvbnRhY3RMaXN0ZW5lcjtcclxufSgpKTsiLCJcInVzZSBzdHJpY3RcIjtcclxuKGZ1bmN0aW9uKCkge1xyXG5cdHZhciBiMkZpbHRlckRhdGEgPSBCb3gyRC5EeW5hbWljcy5iMkZpbHRlckRhdGE7XHJcblxyXG5cdHZhciBGSUxURVJTID0ge307XHJcblxyXG5cdHZhciBUUkFDSyA9IG5ldyBiMkZpbHRlckRhdGEoKTtcclxuXHRUUkFDSy5ncm91cEluZGV4ID0gMDtcclxuXHRUUkFDSy5jYXRlZ29yeUJpdHMgPSAwYjAwMDAwMDAxO1xyXG5cdFRSQUNLLm1hc2tCaXRzID0gMGIwMDAwMDAxMDtcclxuXHJcblx0dmFyIENBUiA9IG5ldyBiMkZpbHRlckRhdGEoKTtcclxuXHRDQVIuZ3JvdXBJbmRleCA9IDA7XHJcblx0Q0FSLmNhdGVnb3J5Qml0cyA9IDBiMDAwMDAwMTA7XHJcblx0Q0FSLm1hc2tCaXRzID0gMGIwMDAwMDExMTtcclxuXHJcblx0dmFyIFNFTlNPUiA9IG5ldyBiMkZpbHRlckRhdGEoKTtcclxuXHRTRU5TT1IuZ3JvdXBJbmRleCA9IDA7XHJcblx0U0VOU09SLmNhdGVnb3J5Qml0cyA9IDBiMDAwMDAxMDA7XHJcblx0U0VOU09SLm1hc2tCaXRzID0gMGIwMDAwMDAxMDtcclxuXHJcblx0RklMVEVSUy5UUkFDSyA9IFRSQUNLO1xyXG5cdEZJTFRFUlMuQ0FSID0gQ0FSO1xyXG5cdEZJTFRFUlMuU0VOU09SID0gU0VOU09SO1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IEZJTFRFUlM7XHJcbn0oKSk7IiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbihmdW5jdGlvbiAoKSB7XHJcblx0dmFyICAgYjJWZWMyID0gQm94MkQuQ29tbW9uLk1hdGguYjJWZWMyXHJcbiAgICAgICxcdCAgYjJXb3JsZCA9IEJveDJELkR5bmFtaWNzLmIyV29ybGRcclxuICAgICAgLFx0ICBiMk1hc3NEYXRhID0gQm94MkQuQ29sbGlzaW9uLlNoYXBlcy5iMk1hc3NEYXRhXHJcbiAgICAgICxcdCAgYjJEZWJ1Z0RyYXcgPSBCb3gyRC5EeW5hbWljcy5iMkRlYnVnRHJhd1xyXG4gICAgO1xyXG5cclxuXHRmdW5jdGlvbiBSZWFsaXR5KGdhbWUpIHtcclxuXHRcdHRoaXMuZ2FtZSA9IGdhbWU7XHJcblxyXG5cdFx0dGhpcy5waEMgPSB0aGlzLnBoQyB8fCB0aGlzLmdhbWUuY29uZmlnLnBoeXNpY3M7XHJcblxyXG5cdFx0dGhpcy5jb250YWN0TGlzdGVuZXIgPSBuZXcgKHJlcXVpcmUoJy4vY29udGFjdF9saXN0ZW5lcicpKSh0aGlzKTtcclxuXHRcdFxyXG5cdFx0dGhpcy53b3JsZCA9IG5ldyBiMldvcmxkKG5ldyBiMlZlYzIoMCwgMCksIHRydWUpO1xyXG5cdFx0dGhpcy53b3JsZC5TZXRDb250YWN0TGlzdGVuZXIodGhpcy5jb250YWN0TGlzdGVuZXIpO1xyXG5cdFx0dGhpcy5jcmVhdGVEZWJ1ZygpO1xyXG5cdH1cclxuXHJcblx0Xy5leHRlbmQoUmVhbGl0eS5wcm90b3R5cGUsIEJhY2tib25lLkV2ZW50cyk7XHJcblxyXG5cdFJlYWxpdHkucHJvdG90eXBlLnJlYWR5ID0gZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLnRyaWdnZXIoJ2dhbWVSZWFkeScpO1xyXG5cdH1cclxuXHJcblx0UmVhbGl0eS5wcm90b3R5cGUuY3JlYXRlRGVidWcgPSBmdW5jdGlvbihlKSB7XHJcblx0ICAgIHZhciBkZWJ1Z0NhbnZhcyA9IHRoaXMuZ2FtZS5zY2VuZS5kZWJ1Z0NhbnZhcztcclxuXHQgICAgdGhpcy5kZWJ1Z0NvbnRleHQgPSBkZWJ1Z0NhbnZhcy5nZXRDb250ZXh0KCcyZCcpO1xyXG5cclxuXHQgICAgdmFyIGRyYXdlciA9IG5ldyBiMkRlYnVnRHJhdygpO1xyXG5cdCAgICBkcmF3ZXIuU2V0U3ByaXRlKHRoaXMuZGVidWdDb250ZXh0KTtcclxuXHQgICAgZHJhd2VyLlNldERyYXdTY2FsZSh0aGlzLnBoQy5zY2FsZSk7XHJcblx0ICAgIGRyYXdlci5TZXRGaWxsQWxwaGEoMC4zKTtcclxuXHQgICAgZHJhd2VyLlNldExpbmVUaGlja25lc3MoMSk7XHJcblx0ICAgIGRyYXdlci5TZXRGbGFncyhiMkRlYnVnRHJhdy5lX3NoYXBlQml0IHwgYjJEZWJ1Z0RyYXcuZV9qb2ludEJpdCk7XHJcblxyXG5cdCAgICB0aGlzLndvcmxkLlNldERlYnVnRHJhdyhkcmF3ZXIpO1xyXG5cdH1cclxuXHJcblx0UmVhbGl0eS5wcm90b3R5cGUudXBkYXRlID0gZnVuY3Rpb24oZSkge1xyXG5cdFx0dmFyIGR0ID0gZS5kZWx0YSAvIDEwMDA7XHJcblx0XHR0aGlzLnRyaWdnZXIoXCJiZWZvcmVVcGRhdGVcIik7XHJcblx0XHR0aGlzLndvcmxkLlN0ZXAoZHQsIHRoaXMucGhDLnZJdGVyLCB0aGlzLnBoQy5wSXRlcik7XHJcbiAgICBcdHRoaXMud29ybGQuQ2xlYXJGb3JjZXMoKTtcclxuXHJcbiAgICBcdGlmIChnbG9iYWwuREVCVUcpIHtcclxuXHQgICAgXHR0aGlzLmRlYnVnQ29udGV4dC5zYXZlKCk7XHJcblx0ICAgIFx0dGhpcy5kZWJ1Z0NvbnRleHQuY2xlYXJSZWN0KDAsIDAsIHRoaXMuZ2FtZS5jb25maWcuc3RhZ2VXaWR0aCwgdGhpcy5nYW1lLmNvbmZpZy5zdGFnZUhlaWdodCk7XHJcblx0ICAgIFx0dGhpcy53b3JsZC5EcmF3RGVidWdEYXRhKCk7XHJcblx0ICAgIFx0dGhpcy5kZWJ1Z0NvbnRleHQucmVzdG9yZSgpO1x0XHJcbiAgICBcdH1cclxuXHR9XHJcblxyXG5cdG1vZHVsZS5leHBvcnRzID0gUmVhbGl0eTtcclxufSgpKTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbihmdW5jdGlvbiAoKSB7XHJcblx0dmFyIGIyRml4dHVyZURlZiA9IEJveDJELkR5bmFtaWNzLmIyRml4dHVyZURlZlxyXG4gICAgICAsXHQgIGIyRml4dHVyZSA9IEJveDJELkR5bmFtaWNzLmIyRml4dHVyZVxyXG4gICAgICAsXHQgIGIyQm9keURlZiA9IEJveDJELkR5bmFtaWNzLmIyQm9keURlZlxyXG4gICAgICAsXHQgIGIyQm9keSA9IEJveDJELkR5bmFtaWNzLmIyQm9keVxyXG4gICAgICAsXHQgIGIyUG9seWdvblNoYXBlID0gQm94MkQuQ29sbGlzaW9uLlNoYXBlcy5iMlBvbHlnb25TaGFwZVxyXG4gICAgICAsICAgYjJDaXJjbGVTaGFwZSA9IEJveDJELkNvbGxpc2lvbi5TaGFwZXMuYjJDaXJjbGVTaGFwZVxyXG4gICAgICAsICAgYjJFZGdlU2hhcGUgPSBCb3gyRC5Db2xsaXNpb24uU2hhcGVzLmIyRWRnZVNoYXBlXHJcbiAgICAgICwgICBiMlZlYzIgPSBCb3gyRC5Db21tb24uTWF0aC5iMlZlYzJcclxuICAgICAgO1xyXG5cclxuXHRmdW5jdGlvbiBUcmFjayhyZWFsaXR5KSB7XHJcblx0XHR2YXIgYm9keURlZiA9IG5ldyBiMkJvZHlEZWYoKTtcclxuXHRcdGJvZHlEZWYudHlwZSA9IGIyQm9keS5iMl9zdGF0aWNCb2R5O1xyXG5cdFx0dmFyIGJvZHkgPSByZWFsaXR5LndvcmxkLkNyZWF0ZUJvZHkoYm9keURlZik7XHJcblxyXG5cdFx0dmFyIGZpeHR1cmVEZWYgPSBuZXcgYjJGaXh0dXJlRGVmKCk7XHJcblx0XHRmaXh0dXJlRGVmLmRlbnNpdHkgPSAxO1xyXG5cdFx0Zml4dHVyZURlZi5mcmljdGlvbiA9IDAuMztcclxuXHRcdGZpeHR1cmVEZWYucmVzdGl0dWlvbiA9IDAuMjtcclxuXHRcdGZpeHR1cmVEZWYuZmlsdGVyID0gKHJlcXVpcmUoJy4vZmlsdGVycycpKS5UUkFDSztcclxuXHRcdHZhciBzY2FsZSA9IHJlYWxpdHkucGhDLnNjYWxlO1xyXG5cclxuXHRcdGZpeHR1cmVEZWYuc2hhcGUgPSBiMlBvbHlnb25TaGFwZS5Bc0FycmF5KFtcclxuXHQgICAgICBuZXcgYjJWZWMyKCAwICAgLyBzY2FsZSwgIDYzIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDAgICAvIHNjYWxlLCAgMCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCA2MyAgIC8gc2NhbGUsICAwIC8gc2NhbGUpLFxyXG5cdCAgICBdLCAzKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gYjJQb2x5Z29uU2hhcGUuQXNBcnJheShbXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMCAgIC8gc2NhbGUsICA0MCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCAxNyAgIC8gc2NhbGUsICA0NyAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCAwICAgLyBzY2FsZSwgIDk3IC8gc2NhbGUpLFxyXG5cdCAgICBdLCAzKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gYjJQb2x5Z29uU2hhcGUuQXNBcnJheShbXHJcblx0ICAgICAgbmV3IGIyVmVjMiggODggICAvIHNjYWxlLCAgMCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCAzNiAgIC8gc2NhbGUsICAyNSAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCAzNiAgIC8gc2NhbGUsICAwIC8gc2NhbGUpLFxyXG5cdCAgICBdLCAzKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gYjJQb2x5Z29uU2hhcGUuQXNBcnJheShbXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMCAgIC8gc2NhbGUsICAxMTIgLyBzY2FsZSksXHJcbiAgIFx0ICAgICAgbmV3IGIyVmVjMiggMiAgIC8gc2NhbGUsICAxMTIgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMjAgICAvIHNjYWxlLCAgMjQwIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDAgICAvIHNjYWxlLCAgMjQwIC8gc2NhbGUpLFxyXG5cdCAgICBdLCA0KTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gYjJQb2x5Z29uU2hhcGUuQXNBcnJheShbXHJcblx0XHQgIG5ldyBiMlZlYzIoIDIwICAgLyBzY2FsZSwgIDI0MCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCA1MCAgIC8gc2NhbGUsICAyMDIgLyBzY2FsZSksXHJcbiAgIFx0ICAgICAgbmV3IGIyVmVjMiggMTM3ICAgLyBzY2FsZSwgIDI0MCAvIHNjYWxlKSxcclxuXHQgICAgXSwgMyk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IGIyUG9seWdvblNoYXBlLkFzQXJyYXkoW1xyXG5cdFx0ICBuZXcgYjJWZWMyKCAyMCAgIC8gc2NhbGUsICAyNDAgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMTAgICAvIHNjYWxlLCAgMTYyIC8gc2NhbGUpLFxyXG4gICBcdCAgICAgIG5ldyBiMlZlYzIoIDUwICAgLyBzY2FsZSwgIDIwMiAvIHNjYWxlKSxcclxuXHQgICAgXSwgMyk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IGIyUG9seWdvblNoYXBlLkFzQXJyYXkoW1xyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDAgICAvIHNjYWxlLCAgMjQwIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDEzNyAgIC8gc2NhbGUsICAyNDAgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMTcwICAgLyBzY2FsZSwgIDMzOCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCAwICAgLyBzY2FsZSwgIDMzOCAvIHNjYWxlKSxcclxuXHQgICAgXSwgNCk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IGIyUG9seWdvblNoYXBlLkFzQXJyYXkoW1xyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDE3MCAgIC8gc2NhbGUsICAzMzggLyBzY2FsZSksXHJcbiAgIFx0ICAgICAgbmV3IGIyVmVjMiggMCAgIC8gc2NhbGUsICA0NTAgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMCAgIC8gc2NhbGUsICAzMzggLyBzY2FsZSksXHJcblx0ICAgIF0sIDMpO1xyXG5cdFx0Ym9keS5DcmVhdGVGaXh0dXJlKGZpeHR1cmVEZWYpO1xyXG5cclxuXHRcdGZpeHR1cmVEZWYuc2hhcGUgPSBiMlBvbHlnb25TaGFwZS5Bc0FycmF5KFtcclxuXHQgICAgICBuZXcgYjJWZWMyKCAwICAgLyBzY2FsZSwgIDQ1MCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCA1MCAgIC8gc2NhbGUsICA0MjAgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMTggICAvIHNjYWxlLCAgNDYwIC8gc2NhbGUpLFxyXG5cdCAgICBdLCAzKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gYjJQb2x5Z29uU2hhcGUuQXNBcnJheShbXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMCAgIC8gc2NhbGUsICA0NTAgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMTggICAvIHNjYWxlLCAgNDYwIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDAgICAvIHNjYWxlLCAgNTI1IC8gc2NhbGUpLFxyXG5cdCAgICBdLCAzKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gYjJQb2x5Z29uU2hhcGUuQXNBcnJheShbXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMjAgICAvIHNjYWxlLCAgNTQyIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDEyICAgLyBzY2FsZSwgIDQ3MCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCAwICAgLyBzY2FsZSwgIDUyNSAvIHNjYWxlKSxcclxuXHQgICAgXSwgMyk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IGIyUG9seWdvblNoYXBlLkFzQXJyYXkoW1xyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDAgICAvIHNjYWxlLCAgNTI1IC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDgwICAgLyBzY2FsZSwgIDYwMCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCAwICAgLyBzY2FsZSwgIDYwMCAvIHNjYWxlKSxcclxuXHQgICAgXSwgMyk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IG5ldyBiMkNpcmNsZVNoYXBlKDUuNik7XHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlLlNldExvY2FsUG9zaXRpb24obmV3IGIyVmVjMigxMC4xLCAyMS4zKSk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IGIyUG9seWdvblNoYXBlLkFzQXJyYXkoW1xyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDE2MCAgIC8gc2NhbGUsICA2MDAgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMTE1ICAgLyBzY2FsZSwgIDYwMCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCAxNDUgICAvIHNjYWxlLCAgNTc1IC8gc2NhbGUpLFxyXG5cdCAgICBdLCAzKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUoNTAgLyBzY2FsZSk7XHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlLlNldExvY2FsUG9zaXRpb24obmV3IGIyVmVjMigxMDUgLyBzY2FsZSwgMTEwIC8gc2NhbGUpKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUoNTAgLyBzY2FsZSk7XHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlLlNldExvY2FsUG9zaXRpb24obmV3IGIyVmVjMig0OTUgLyBzY2FsZSwgMTI3IC8gc2NhbGUpKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUoNTcgLyBzY2FsZSk7XHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlLlNldExvY2FsUG9zaXRpb24obmV3IGIyVmVjMig0NzAgLyBzY2FsZSwgMTMzIC8gc2NhbGUpKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gYjJQb2x5Z29uU2hhcGUuQXNBcnJheShbXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMjcyICAgLyBzY2FsZSwgIDEwNCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCA0NDUgICAvIHNjYWxlLCAgODAgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggNDY1ICAgLyBzY2FsZSwgIDE5MyAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCAzMDggICAvIHNjYWxlLCAgMjA3IC8gc2NhbGUpXHJcblx0ICAgIF0sIDQpO1xyXG5cdFx0Ym9keS5DcmVhdGVGaXh0dXJlKGZpeHR1cmVEZWYpO1xyXG5cclxuXHRcdGZpeHR1cmVEZWYuc2hhcGUgPSBiMlBvbHlnb25TaGFwZS5Bc0FycmF5KFtcclxuXHQgICAgICBuZXcgYjJWZWMyKCAxMjQgICAvIHNjYWxlLCAgNjMgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMjc2ICAgLyBzY2FsZSwgIDEwNyAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCAyNDAgICAvIHNjYWxlLCAgMjI1IC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDk1ICAgLyBzY2FsZSwgIDE2MSAvIHNjYWxlKVxyXG5cdCAgICBdLCA0KTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gYjJQb2x5Z29uU2hhcGUuQXNBcnJheShbXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMTkwICAgLyBzY2FsZSwgIDIwMSAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCAyMzggICAvIHNjYWxlLCAgMTgyIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDMwNiAgIC8gc2NhbGUsICA0MTcgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMjUxICAgLyBzY2FsZSwgIDQyMSAvIHNjYWxlKVxyXG5cdCAgICBdLCA0KTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gYjJQb2x5Z29uU2hhcGUuQXNBcnJheShbXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMzIwICAgLyBzY2FsZSwgIDI2NCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCA2MDAgICAvIHNjYWxlLCAgMjUwIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDYwMCAgIC8gc2NhbGUsICAzNjAgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMzQ1ICAgLyBzY2FsZSwgIDMzOCAvIHNjYWxlKVxyXG5cdCAgICBdLCA0KTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUoNTAgLyBzY2FsZSk7XHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlLlNldExvY2FsUG9zaXRpb24obmV3IGIyVmVjMigyODAgLyBzY2FsZSwgMTYwIC8gc2NhbGUpKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUoNDUgLyBzY2FsZSk7XHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlLlNldExvY2FsUG9zaXRpb24obmV3IGIyVmVjMigyMjUgLyBzY2FsZSwgMTk1IC8gc2NhbGUpKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUoMzAgLyBzY2FsZSk7XHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlLlNldExvY2FsUG9zaXRpb24obmV3IGIyVmVjMig5NSAvIHNjYWxlLCA0OTUgLyBzY2FsZSkpO1xyXG5cdFx0Ym9keS5DcmVhdGVGaXh0dXJlKGZpeHR1cmVEZWYpO1xyXG5cclxuXHRcdGZpeHR1cmVEZWYuc2hhcGUgPSBuZXcgYjJDaXJjbGVTaGFwZSg0MCAvIHNjYWxlKTtcclxuXHRcdGZpeHR1cmVEZWYuc2hhcGUuU2V0TG9jYWxQb3NpdGlvbihuZXcgYjJWZWMyKDI2MCAvIHNjYWxlLCAzODAgLyBzY2FsZSkpO1xyXG5cdFx0Ym9keS5DcmVhdGVGaXh0dXJlKGZpeHR1cmVEZWYpO1xyXG5cclxuXHRcdGZpeHR1cmVEZWYuc2hhcGUgPSBuZXcgYjJDaXJjbGVTaGFwZSgxMiAvIHNjYWxlKTtcclxuXHRcdGZpeHR1cmVEZWYuc2hhcGUuU2V0TG9jYWxQb3NpdGlvbihuZXcgYjJWZWMyKDk4IC8gc2NhbGUsIDUyNSAvIHNjYWxlKSk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IGIyUG9seWdvblNoYXBlLkFzQXJyYXkoW1xyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDE0NCAgIC8gc2NhbGUsICA0MjIgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMjIwICAgLyBzY2FsZSwgIDM3OCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCAyNTAgICAvIHNjYWxlLCAgNDIyIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDE2NiAgIC8gc2NhbGUsICA0NTggLyBzY2FsZSlcclxuXHQgICAgXSwgNCk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IGIyUG9seWdvblNoYXBlLkFzQXJyYXkoW1xyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDkwICAgLyBzY2FsZSwgIDQ2MyAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCAxNDQgICAvIHNjYWxlLCAgNDIyIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDE2NiAgIC8gc2NhbGUsICA0NTggLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMTMwICAgLyBzY2FsZSwgIDUwMCAvIHNjYWxlKVxyXG5cdCAgICBdLCA0KTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUoMzcgLyBzY2FsZSk7XHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlLlNldExvY2FsUG9zaXRpb24obmV3IGIyVmVjMig1MDUgLyBzY2FsZSwgNDY1IC8gc2NhbGUpKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUoMjMgLyBzY2FsZSk7XHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlLlNldExvY2FsUG9zaXRpb24obmV3IGIyVmVjMig1MTcgLyBzY2FsZSwgNDk1IC8gc2NhbGUpKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUoMTAgLyBzY2FsZSk7XHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlLlNldExvY2FsUG9zaXRpb24obmV3IGIyVmVjMig1MjAgLyBzY2FsZSwgNTIwIC8gc2NhbGUpKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUoMTggLyBzY2FsZSk7XHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlLlNldExvY2FsUG9zaXRpb24obmV3IGIyVmVjMigzMDAgLyBzY2FsZSwgNDAwIC8gc2NhbGUpKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUoMzQgLyBzY2FsZSk7XHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlLlNldExvY2FsUG9zaXRpb24obmV3IGIyVmVjMig0ODAgLyBzY2FsZSwgNDQ1IC8gc2NhbGUpKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUoNzAgLyBzY2FsZSk7XHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlLlNldExvY2FsUG9zaXRpb24obmV3IGIyVmVjMig1NDAgLyBzY2FsZSwgMzAwIC8gc2NhbGUpKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gbmV3IGIyQ2lyY2xlU2hhcGUoMTEwIC8gc2NhbGUpO1xyXG5cdFx0Zml4dHVyZURlZi5zaGFwZS5TZXRMb2NhbFBvc2l0aW9uKG5ldyBiMlZlYzIoNjIwIC8gc2NhbGUsIDMwMCAvIHNjYWxlKSk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IG5ldyBiMkNpcmNsZVNoYXBlKDUzIC8gc2NhbGUpO1xyXG5cdFx0Zml4dHVyZURlZi5zaGFwZS5TZXRMb2NhbFBvc2l0aW9uKG5ldyBiMlZlYzIoNDgwIC8gc2NhbGUsIDMwMCAvIHNjYWxlKSk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IG5ldyBiMkNpcmNsZVNoYXBlKDE1IC8gc2NhbGUpO1xyXG5cdFx0Zml4dHVyZURlZi5zaGFwZS5TZXRMb2NhbFBvc2l0aW9uKG5ldyBiMlZlYzIoMzIwIC8gc2NhbGUsIDQwNSAvIHNjYWxlKSk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IG5ldyBiMkNpcmNsZVNoYXBlKDI3IC8gc2NhbGUpO1xyXG5cdFx0Zml4dHVyZURlZi5zaGFwZS5TZXRMb2NhbFBvc2l0aW9uKG5ldyBiMlZlYzIoNDQ1IC8gc2NhbGUsIDQzMCAvIHNjYWxlKSk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IG5ldyBiMkNpcmNsZVNoYXBlKDIwIC8gc2NhbGUpO1xyXG5cdFx0Zml4dHVyZURlZi5zaGFwZS5TZXRMb2NhbFBvc2l0aW9uKG5ldyBiMlZlYzIoNDIwIC8gc2NhbGUsIDQyMiAvIHNjYWxlKSk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IGIyUG9seWdvblNoYXBlLkFzQXJyYXkoW1xyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDMzMCAgIC8gc2NhbGUsICAzOTUgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggNDIwICAgLyBzY2FsZSwgIDQwMCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCA0NDAgICAvIHNjYWxlLCAgNDUwIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDMzNSAgIC8gc2NhbGUsICA0MTggLyBzY2FsZSlcclxuXHQgICAgXSwgNCk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IG5ldyBiMkNpcmNsZVNoYXBlKDIwIC8gc2NhbGUpO1xyXG5cdFx0Zml4dHVyZURlZi5zaGFwZS5TZXRMb2NhbFBvc2l0aW9uKG5ldyBiMlZlYzIoNDIwIC8gc2NhbGUsIDQyMiAvIHNjYWxlKSk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IG5ldyBiMkNpcmNsZVNoYXBlKDUuNik7XHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlLlNldExvY2FsUG9zaXRpb24obmV3IGIyVmVjMigxMC41LCAyMS40KSk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IGIyUG9seWdvblNoYXBlLkFzQXJyYXkoW1xyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDQ1MCAgIC8gc2NhbGUsICA1NDIgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggNTE2ICAgLyBzY2FsZSwgIDYwMCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCA0NTAgICAvIHNjYWxlLCAgNjAwIC8gc2NhbGUpLFxyXG5cdCAgICBdLCAzKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gYjJQb2x5Z29uU2hhcGUuQXNBcnJheShbXHJcblx0ICAgICAgbmV3IGIyVmVjMiggNjAwICAgLyBzY2FsZSwgIDUwMCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCA2MDAgICAvIHNjYWxlLCAgNjAwIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDU0NSAgIC8gc2NhbGUsICA2MDAgLyBzY2FsZSksXHJcblx0ICAgIF0sIDMpO1xyXG5cdFx0Ym9keS5DcmVhdGVGaXh0dXJlKGZpeHR1cmVEZWYpO1xyXG5cclxuXHRcdGZpeHR1cmVEZWYuc2hhcGUgPSBiMlBvbHlnb25TaGFwZS5Bc0FycmF5KFtcclxuXHQgICAgICBuZXcgYjJWZWMyKCA1MDUgICAvIHNjYWxlLCAgNjAwIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDUwNSAgIC8gc2NhbGUsICA1OTAgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggNTYwICAgLyBzY2FsZSwgIDU5MCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCA1NjAgICAvIHNjYWxlLCAgNjAwIC8gc2NhbGUpLFxyXG5cdCAgICBdLCA0KTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gYjJQb2x5Z29uU2hhcGUuQXNBcnJheShbXHJcblx0ICAgICAgbmV3IGIyVmVjMiggNTY4ICAgLyBzY2FsZSwgIDM5MCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCA2MDAgICAvIHNjYWxlLCAgMzkwIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDYwMCAgIC8gc2NhbGUsICA0NDUgLyBzY2FsZSksXHJcblx0ICAgIF0sIDMpO1xyXG5cdFx0Ym9keS5DcmVhdGVGaXh0dXJlKGZpeHR1cmVEZWYpO1xyXG5cclxuXHRcdGZpeHR1cmVEZWYuc2hhcGUgPSBiMlBvbHlnb25TaGFwZS5Bc0FycmF5KFtcclxuXHQgICAgICBuZXcgYjJWZWMyKCA2MDAgICAvIHNjYWxlLCAgMTQ1IC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDYwMCAgIC8gc2NhbGUsICAyMDUgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggNTY1ICAgLyBzY2FsZSwgIDIwNSAvIHNjYWxlKSxcclxuXHQgICAgXSwgMyk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IGIyUG9seWdvblNoYXBlLkFzQXJyYXkoW1xyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDU0MCAgIC8gc2NhbGUsICAwIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDYwMCAgIC8gc2NhbGUsICAwIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDYwMCAgIC8gc2NhbGUsICAxMDAgLyBzY2FsZSksXHJcblx0ICAgIF0sIDMpO1xyXG5cdFx0Ym9keS5DcmVhdGVGaXh0dXJlKGZpeHR1cmVEZWYpO1xyXG5cclxuXHRcdGZpeHR1cmVEZWYuc2hhcGUgPSBuZXcgYjJDaXJjbGVTaGFwZSgyOTAgLyBzY2FsZSk7XHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlLlNldExvY2FsUG9zaXRpb24obmV3IGIyVmVjMigyOTUgLyBzY2FsZSwgLTI0OCAvIHNjYWxlKSk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IG5ldyBiMkNpcmNsZVNoYXBlKDQwIC8gc2NhbGUpO1xyXG5cdFx0Zml4dHVyZURlZi5zaGFwZS5TZXRMb2NhbFBvc2l0aW9uKG5ldyBiMlZlYzIoMjcwIC8gc2NhbGUsIDEwIC8gc2NhbGUpKTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gYjJQb2x5Z29uU2hhcGUuQXNBcnJheShbXHJcblx0ICAgICAgbmV3IGIyVmVjMiggODAgICAvIHNjYWxlLCAgMCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCAxNzAgICAvIHNjYWxlLCAgMCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCAxNzAgIC8gc2NhbGUsICAxMiAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCA4MCAgIC8gc2NhbGUsICA1IC8gc2NhbGUpLFxyXG5cdCAgICBdLCA0KTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0XHRmaXh0dXJlRGVmLnNoYXBlID0gYjJQb2x5Z29uU2hhcGUuQXNBcnJheShbXHJcblx0ICAgICAgbmV3IGIyVmVjMiggNTcwICAvIHNjYWxlLCAgNTAgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggNDk1ICAgLyBzY2FsZSwgIDIwIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDQ5NSAgIC8gc2NhbGUsICAwIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDU3MCAgIC8gc2NhbGUsICAwIC8gc2NhbGUpLFxyXG5cdCAgICBdLCA0KTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXh0dXJlRGVmKTtcclxuXHJcblx0ICAgIGZpeHR1cmVEZWYuc2hhcGUgPSBiMlBvbHlnb25TaGFwZS5Bc0FycmF5KFtcclxuXHQgICAgICBuZXcgYjJWZWMyKCA0OTUgICAvIHNjYWxlLCAgMjAgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMzk1ICAgLyBzY2FsZSwgIDMwIC8gc2NhbGUpLFxyXG4gICBcdCAgICAgIG5ldyBiMlZlYzIoIDM5NSAgIC8gc2NhbGUsICAwIC8gc2NhbGUpLFxyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDQ5NSAgIC8gc2NhbGUsICAwIC8gc2NhbGUpLFxyXG5cdCAgICBdLCA0KTtcclxuXHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0Zml4dHVyZURlZi5zaGFwZSA9IGIyUG9seWdvblNoYXBlLkFzQXJyYXkoW1xyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDU5NSAgIC8gc2NhbGUsICA0NDUgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggNjAwICAgLyBzY2FsZSwgIDQ0NSAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCA2MDAgIC8gc2NhbGUsICA1MDUgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggNTk1ICAgLyBzY2FsZSwgIDUwNSAvIHNjYWxlKSxcclxuXHQgICAgXSwgNCk7XHJcblx0XHRib2R5LkNyZWF0ZUZpeHR1cmUoZml4dHVyZURlZik7XHJcblxyXG5cdFx0dmFyIGZpeERlZiA9IG5ldyBiMkZpeHR1cmVEZWYoKTtcclxuXHRcdGZpeERlZi5zaGFwZSA9IGIyUG9seWdvblNoYXBlLkFzQXJyYXkoW1xyXG5cdCAgICAgIG5ldyBiMlZlYzIoIDMwMCAgIC8gc2NhbGUsICA0MjAgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMzE1ICAgLyBzY2FsZSwgIDQyMCAvIHNjYWxlKSxcclxuXHQgICAgICBuZXcgYjJWZWMyKCAzMTUgIC8gc2NhbGUsICA0NzUgLyBzY2FsZSksXHJcblx0ICAgICAgbmV3IGIyVmVjMiggMzAwICAgLyBzY2FsZSwgIDQ3NSAvIHNjYWxlKSxcclxuXHQgICAgXSwgNCk7XHJcblx0ICAgIGZpeERlZi5maWx0ZXIgPSAocmVxdWlyZSgnLi9maWx0ZXJzJykpLlNFTlNPUjtcclxuXHQgICAgZml4RGVmLmlzU2Vuc29yID0gdHJ1ZTtcclxuXHRcdGJvZHkuQ3JlYXRlRml4dHVyZShmaXhEZWYpLlNldFVzZXJEYXRhKFwiZmluaXNoXCIpO1xyXG5cclxuXHRcdGZpeERlZi5zaGFwZSA9IG5ldyBiMkNpcmNsZVNoYXBlKDI1IC8gc2NhbGUpO1xyXG5cdFx0Zml4RGVmLnNoYXBlLlNldExvY2FsUG9zaXRpb24obmV3IGIyVmVjMigyNzUgLyBzY2FsZSwgNzUgLyBzY2FsZSkpO1xyXG5cdFx0Ym9keS5DcmVhdGVGaXh0dXJlKGZpeERlZikuU2V0VXNlckRhdGEoXCJtaWRkbGVcIik7XHJcblxyXG5cdFx0Ym9keS5TZXRQb3NpdGlvbihuZXcgYjJWZWMyKDAsIDApKTtcclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IFRyYWNrO1xyXG59KCkpOyIsIlwidXNlIHN0cmljdFwiO1xyXG4oZnVuY3Rpb24gKCkge1xyXG5cdGZ1bmN0aW9uIENhcihfc3RhZ2UpIHtcclxuXHRcdHRoaXMuQ29udGFpbmVyX2NvbnN0cnVjdG9yKCk7XHJcblxyXG5cdFx0dGhpcy5zcHJpdGUgPSBuZXcgY3JlYXRlanMuU3ByaXRlKF9zdGFnZS5zaGVldCwgJ2NhcicpO1xyXG5cdFx0dGhpcy5zcHJpdGUuc2V0KHtcclxuXHRcdFx0cmVnWDogMjAsXHJcblx0XHRcdHJlZ1k6IDIwXHJcblx0XHR9KTtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy5zcHJpdGUpO1xyXG5cclxuXHRcdHRoaXMubW9kZWwgPSBuZXcgKHJlcXVpcmUoJy4uL3JlYWxpdHkvY2FyJykpKF9zdGFnZS5nYW1lLnJlYWxpdHkpO1xyXG5cclxuXHRcdHRoaXMub24oXCJ0aWNrXCIsIGZ1bmN0aW9uKCkge1xyXG5cdFx0XHR2YXIgY2FudmFzUG9zaXRpb24gPSB0aGlzLm1vZGVsLmNhbnZhc1Bvc2l0aW9uO1xyXG5cdFx0XHR0aGlzLnNwcml0ZS54ID0gY2FudmFzUG9zaXRpb24ueDtcclxuXHRcdFx0dGhpcy5zcHJpdGUueSA9IGNhbnZhc1Bvc2l0aW9uLnk7XHJcblx0XHRcdHRoaXMuc3ByaXRlLnNldCh7cm90YXRpb24gOiB0aGlzLm1vZGVsLmNhbnZhc0FuZ2xlfSk7XHJcblx0XHR9KTtcclxuXHR9O1xyXG5cclxuXHRjcmVhdGVqcy5leHRlbmQoQ2FyLCBjcmVhdGVqcy5Db250YWluZXIpO1xyXG5cclxuXHRDYXIucHJvdG90eXBlLm1vdmVMZWZ0ID0gZnVuY3Rpb24odikge1xyXG5cdFx0dGhpcy5tb2RlbC50b2dnbGVMZWZ0KHYpO1xyXG5cdH07XHJcblxyXG5cdENhci5wcm90b3R5cGUubW92ZVJpZ2h0ID0gZnVuY3Rpb24odikge1xyXG5cdFx0dGhpcy5tb2RlbC50b2dnbGVSaWdodCh2KTtcclxuXHR9O1xyXG5cclxuXHRDYXIucHJvdG90eXBlLm1vdmVGb3J3YXJkID0gZnVuY3Rpb24odikge1xyXG5cdFx0dGhpcy5tb2RlbC50b2dnbGVGb3J3YXJkKHYpO1xyXG5cdH07XHJcblxyXG5cdENhci5wcm90b3R5cGUubW92ZUJhY2t3YXJkID0gZnVuY3Rpb24odikge1xyXG5cdFx0dGhpcy5tb2RlbC50b2dnbGVCYWNrd2FyZCh2KTtcclxuXHR9O1xyXG5cclxuXHRDYXIucHJvdG90eXBlLmJvb3N0ID0gZnVuY3Rpb24odikge1xyXG5cdFx0dGhpcy5tb2RlbC50b2dnbGVCb29zdCh2KTtcclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZWpzLnByb21vdGUoQ2FyLCBcIkNvbnRhaW5lclwiKTtcclxufSgpKTsiLCJcInVzZSBzdHJpY3RcIjtcclxuKGZ1bmN0aW9uICgpIHtcclxuXHJcblx0dmFyIENPVU5UX1BIUkFTRVMgPSBbJ1JFQURZJywgJ1NURUFEWScsICdHTyddO1xyXG5cclxuXHRmdW5jdGlvbiBDb3VudERvd24oX3N0YWdlKSB7XHJcblx0XHR0aGlzLkNvbnRhaW5lcl9jb25zdHJ1Y3RvcigpO1xyXG5cclxuXHRcdHRoaXMudGV4dCA9IG5ldyBjcmVhdGVqcy5UZXh0KFwiXCIsIFwiYm9sZCA1MHB4IEFyaWFsXCIsIFwiI0NEMjc0RFwiKTtcclxuXHRcdHRoaXMudGV4dC50ZXh0QmFzZUxpbmUgPSBcIm1pZGRsZVwiO1xyXG5cdFx0dGhpcy50ZXh0LnRleHRBbGlnbiA9IFwiY2VudGVyXCI7XHJcblx0XHR0aGlzLnRleHQueCA9IDMwMDtcclxuXHRcdHRoaXMudGV4dC55ID0gMzAwO1xyXG5cdH07XHJcblx0Y3JlYXRlanMuZXh0ZW5kKENvdW50RG93biwgY3JlYXRlanMuQ29udGFpbmVyKTtcclxuXHJcblx0Q291bnREb3duLnByb3RvdHlwZS5zdGFydCA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XHJcblx0XHRjcmVhdGVqcy5UaWNrZXIuc2V0UGF1c2VkKGZhbHNlKTtcclxuXHRcdHZhciBocyA9IFtdO1xyXG5cdFx0dGhpcy5jb3VudGVyID0gMDtcclxuXHRcdHRoaXMuYWRkQ2hpbGQodGhpcy50ZXh0KTtcclxuXHJcblx0XHRmb3IgKHZhciBpID0gMDsgaSA8IENPVU5UX1BIUkFTRVMubGVuZ3RoOyBpKyspXHJcblx0XHRcdGhzLnB1c2goXy5iaW5kKHRoaXMuY291bnQsIHRoaXMpKTtcclxuXHJcblx0XHRhc3luYy5zZXJpZXMoaHMsIF8uYmluZChmdW5jdGlvbigpIHtcclxuXHRcdFx0dGhpcy5yZW1vdmVDaGlsZCh0aGlzLnRleHQpO1xyXG5cdFx0XHRjYWxsYmFjaygpO1xyXG5cdFx0fSwgdGhpcykpO1xyXG5cdH1cclxuXHJcblx0Q291bnREb3duLnByb3RvdHlwZS5jb3VudCA9IGZ1bmN0aW9uKGNiKSB7XHJcblx0XHR0aGlzLnRleHQudGV4dCA9IENPVU5UX1BIUkFTRVNbdGhpcy5jb3VudGVyKytdO1xyXG5cdFx0Y3JlYXRlanMuVHdlZW4uZ2V0KHRoaXMudGV4dClcclxuXHRcdC50byh7YWxwaGE6IDAsIHNjYWxlWDogMCwgc2NhbGVZOiAwfSlcclxuXHRcdC50byh7YWxwaGE6IDEsIHNjYWxlWDogMSwgc2NhbGVZOiAxfSwgMTAwMCwgY3JlYXRlanMuRWFzZS5lbGFzdGljT3V0KVxyXG5cdFx0LmNhbGwoZnVuY3Rpb24oKSB7XHJcblx0XHRcdGNiKCk7XHJcblx0XHR9KTtcdFx0XHJcblx0fVxyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZWpzLnByb21vdGUoQ291bnREb3duLCBcIkNvbnRhaW5lclwiKTtcclxufSgpKTsiLCJcInVzZSBzdHJpY3RcIjtcclxuKGZ1bmN0aW9uICgpIHtcclxuXHJcblx0dmFyIEtFWUNPREVfTEVGVCA9IDM3LCBcclxuXHRcdEtFWUNPREVfUklHSFQgPSAzOSxcclxuXHRcdEtFWUNPREVfVVAgPSAzOCxcclxuXHRcdEtFWUNPREVfRE9XTiA9IDQwLFxyXG5cdFx0U0hJRlQgPSAxNjtcclxuXHJcblx0ZnVuY3Rpb24gR2FtZVN0YWdlKGdhbWUpIHtcclxuXHRcdHRoaXMuU3RhZ2VfY29uc3RydWN0b3IoZ2FtZS5zY2VuZS5jYW52YXMpO1xyXG5cclxuXHRcdHRoaXMuZ2FtZSA9IGdhbWU7XHJcblxyXG5cdFx0dmFyIHNoZWV0RGF0YSA9IHRoaXMuZ2FtZS5xdWV1ZS5nZXRSZXN1bHQoXCJhdGxhc0RhdGFcIik7XHJcblx0XHR0aGlzLnNoZWV0ID0gbmV3IGNyZWF0ZWpzLlNwcml0ZVNoZWV0KHNoZWV0RGF0YSk7XHJcblxyXG5cdFx0dGhpcy50cmFjayAgPSBuZXcgKHJlcXVpcmUoJy4vdHJhY2snKSkodGhpcyk7XHJcblx0XHR0aGlzLmFkZENoaWxkKHRoaXMudHJhY2spO1xyXG5cclxuXHRcdHRoaXMuY2FyICA9IG5ldyAocmVxdWlyZSgnLi9jYXInKSkodGhpcyk7XHJcblx0XHR0aGlzLmFkZENoaWxkKHRoaXMuY2FyKTtcclxuXHJcblx0XHR0aGlzLmNvdW50RG93biA9IG5ldyAocmVxdWlyZSgnLi9jb3VudF9kb3duJykpKHRoaXMpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLmNvdW50RG93bik7XHJcblxyXG5cdFx0JCh3aW5kb3cpLm9uKCdrZXlkb3duJywgdGhpcy5vbktleURvd24uYmluZCh0aGlzKSk7XHJcblx0XHQkKHdpbmRvdykub24oJ2tleXVwJywgdGhpcy5vbktleVVwLmJpbmQodGhpcykpO1xyXG5cdH07XHJcblxyXG5cdGNyZWF0ZWpzLmV4dGVuZChHYW1lU3RhZ2UsIGNyZWF0ZWpzLlN0YWdlKTtcclxuXHJcblx0R2FtZVN0YWdlLnByb3RvdHlwZS5vbktleURvd24gPSBmdW5jdGlvbihlKSB7XHJcblx0XHRpZiAodGhpcy5nYW1lLnBhdXNlZCkgcmV0dXJuO1xyXG5cclxuXHRcdHN3aXRjaCAoZS5rZXlDb2RlKSB7XHJcblx0XHRcdGNhc2UgS0VZQ09ERV9MRUZUOlx0XHJcblx0XHRcdFx0dGhpcy5jYXIubW92ZUxlZnQodHJ1ZSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgS0VZQ09ERV9SSUdIVDogXHJcblx0XHRcdFx0dGhpcy5jYXIubW92ZVJpZ2h0KHRydWUpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIEtFWUNPREVfVVA6XHJcblx0XHRcdFx0dGhpcy5jYXIubW92ZUZvcndhcmQodHJ1ZSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgS0VZQ09ERV9ET1dOOlxyXG5cdFx0XHRcdHRoaXMuY2FyLm1vdmVCYWNrd2FyZCh0cnVlKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdFx0Y2FzZSBTSElGVDpcclxuXHRcdFx0XHR0aGlzLmNhci5ib29zdCh0cnVlKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRHYW1lU3RhZ2UucHJvdG90eXBlLm9uS2V5VXAgPSBmdW5jdGlvbihlKSB7XHJcblx0XHRpZiAodGhpcy5nYW1lLnBhdXNlZCkgcmV0dXJuO1xyXG5cclxuXHRcdHN3aXRjaCAoZS5rZXlDb2RlKSB7XHJcblx0XHRcdGNhc2UgS0VZQ09ERV9MRUZUOlx0XHJcblx0XHRcdFx0dGhpcy5jYXIubW92ZUxlZnQoZmFsc2UpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIEtFWUNPREVfUklHSFQ6IFxyXG5cdFx0XHRcdHRoaXMuY2FyLm1vdmVSaWdodChmYWxzZSk7XHJcblx0XHRcdFx0YnJlYWs7XHJcblx0XHRcdGNhc2UgS0VZQ09ERV9VUDogXHJcblx0XHRcdFx0dGhpcy5jYXIubW92ZUZvcndhcmQoZmFsc2UpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIEtFWUNPREVfRE9XTjpcclxuXHRcdFx0XHR0aGlzLmNhci5tb3ZlQmFja3dhcmQoZmFsc2UpO1xyXG5cdFx0XHRcdGJyZWFrO1xyXG5cdFx0XHRjYXNlIFNISUZUOlxyXG5cdFx0XHRcdHRoaXMuY2FyLmJvb3N0KGZhbHNlKTtcclxuXHRcdFx0XHRicmVhaztcclxuXHRcdH1cclxuXHR9O1xyXG5cclxuXHRtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZWpzLnByb21vdGUoR2FtZVN0YWdlLCBcIlN0YWdlXCIpO1xyXG59KCkpOyIsIlwidXNlIHN0cmljdFwiO1xyXG4oZnVuY3Rpb24gKCkge1xyXG5cdGZ1bmN0aW9uIFRyYWNrKF9zdGFnZSkge1xyXG5cdFx0dGhpcy5Db250YWluZXJfY29uc3RydWN0b3IoKTtcclxuXHJcblx0XHR0aGlzLnNwcml0ZSA9IG5ldyBjcmVhdGVqcy5TcHJpdGUoX3N0YWdlLnNoZWV0LCAncmFjZV90cmFjaycpO1xyXG5cdFx0dGhpcy5hZGRDaGlsZCh0aGlzLnNwcml0ZSk7XHJcblxyXG5cdFx0dGhpcy5tb2RlbCA9IG5ldyAocmVxdWlyZSgnLi4vcmVhbGl0eS90cmFjaycpKShfc3RhZ2UuZ2FtZS5yZWFsaXR5KTtcclxuXHR9O1xyXG5cdGNyZWF0ZWpzLmV4dGVuZChUcmFjaywgY3JlYXRlanMuQ29udGFpbmVyKTtcclxuXHRtb2R1bGUuZXhwb3J0cyA9IGNyZWF0ZWpzLnByb21vdGUoVHJhY2ssIFwiQ29udGFpbmVyXCIpO1xyXG59KCkpOyIsIlwidXNlIHN0cmljdFwiO1xyXG4oZnVuY3Rpb24gKCkge1xyXG5cdHZhciBCYWNrYm9uZVZpZXcgPSBCYWNrYm9uZS5WaWV3LmV4dGVuZCh7XHJcblx0XHRyZW5kZXI6IGZ1bmN0aW9uKCkge1xyXG5cdFx0XHRpZiAodGhpcy5tb2RlbCkge1xyXG5cdFx0XHRcdHRoaXMudGVtcGxhdGVEYXRhID0gdGhpcy5tb2RlbC50b0pTT04oKTtcclxuXHRcdFx0fVxyXG5cdFx0ICAgIHRoaXMuJGVsLmh0bWwodGhpcy50ZW1wbGF0ZSh0aGlzLnRlbXBsYXRlRGF0YSkpO1xyXG5cdFx0ICAgIHJldHVybiB0aGlzO1xyXG4gIFx0XHR9XHJcblx0fSk7XHJcblxyXG5cdEJhY2tib25lVmlldy5wcm90b3R5cGUuYXBwZW5kVG8gPSBmdW5jdGlvbihlbCkge1xyXG5cdFx0dGhpcy4kZWwuYXBwZW5kVG8oZWwpO1xyXG5cdH1cclxuXHJcblx0QmFja2JvbmVWaWV3LnByb3RvdHlwZS5kZXRhY2ggPSBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMuJGVsLmRldGFjaCgpO1xyXG5cdH1cclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSBCYWNrYm9uZVZpZXc7XHJcbn0oKSk7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG4oZnVuY3Rpb24gKCkge1xyXG5cdHZhciBCYWNrYm9uZVZpZXcgPSByZXF1aXJlKCcuLi8uLi9saWIvYmFja2JvbmVfdmlldycpO1xyXG5cdGZ1bmN0aW9uIEhVRCAobW9kZWwpIHtcclxuXHRcdEJhY2tib25lVmlldy5jYWxsKHRoaXMsIHtcclxuXHRcdFx0bW9kZWw6IG1vZGVsLFxyXG5cdFx0XHR0YWdOYW1lOiBcImRpdlwiLFxyXG5cdFx0XHRjbGFzc05hbWU6IFwiaHVkXCJcclxuXHRcdH0pO1xyXG5cdFx0dGhpcy50ZW1wbGF0ZSA9IEpTVFsnaW50ZXJmYWNlL2h1ZCddO1xyXG5cdFx0dGhpcy5yZW5kZXIoKTtcclxuXHRcdHRoaXMubGlzdGVuVG8obW9kZWwsIFwiY2hhbmdlXCIsIHRoaXMucmVuZGVyKTtcclxuXHR9XHJcblxyXG5cdEhVRC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEJhY2tib25lVmlldy5wcm90b3R5cGUpO1xyXG5cclxuXHRIVUQucHJvdG90eXBlLnN0YXJ0VGltZXIgPSBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMuc3RhcnRfdGltZSA9IG5ldyBEYXRlKCkuZ2V0VGltZSgpO1xyXG5cdFx0dGhpcy5tb2RlbC5zZXQoJ3N0YXJ0X3RpbWUnLCB0aGlzLnN0YXJ0X3RpbWUpO1xyXG5cdFx0dGhpcy51cGRhdGVUaW1lcigpO1xyXG5cdH1cclxuXHJcblx0SFVELnByb3RvdHlwZS51cGRhdGVUaW1lciA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0dGhpcy5zdG9wVGltZXIoKTtcclxuXHRcdHZhciBsZWZ0ID0gU3RyaW5nKChuZXcgRGF0ZSgpLmdldFRpbWUoKSAtIHRoaXMuc3RhcnRfdGltZSkgLyAxMDAwKTtcclxuXHRcdGxlZnQgPSBsZWZ0LnNsaWNlKDAsIChsZWZ0LmluZGV4T2YoXCIuXCIpKSszKTtcclxuXHRcdHRoaXMuJCgnLnRpbWUnKS50ZXh0KGBFTEFQU0VEOiAke2xlZnR9IHNgKTtcclxuXHJcblx0XHR0aGlzLnRpbWVyID0gc2V0VGltZW91dCh0aGlzLnVwZGF0ZVRpbWVyLmJpbmQodGhpcyksIDEwMCk7XHJcblx0fVxyXG5cclxuXHRIVUQucHJvdG90eXBlLnN0b3BUaW1lciA9IGZ1bmN0aW9uKCkge1xyXG5cdFx0Y2xlYXJUaW1lb3V0KHRoaXMudGltZXIpO1xyXG5cdH1cclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSBIVUQ7XHJcbn0oKSk7XHJcbiIsIlwidXNlIHN0cmljdFwiO1xyXG4oZnVuY3Rpb24gKCkge1xyXG5cdHZhciBCYWNrYm9uZVZpZXcgPSByZXF1aXJlKCcuLi8uLi9saWIvYmFja2JvbmVfdmlldycpO1xyXG5cdGZ1bmN0aW9uIE1vZGFsICgpIHtcclxuXHRcdEJhY2tib25lVmlldy5jYWxsKHRoaXMsIHtcclxuXHRcdFx0dGFnTmFtZTogXCJkaXZcIixcclxuXHRcdFx0Y2xhc3NOYW1lOiBcIndpbmRvd0JveFwiLFxyXG5cdFx0XHRldmVudHM6IHsnY2xpY2sgLmJ0bi1zdGFydCc6ICdvbkNsaWNrJ31cclxuXHRcdH0pO1xyXG5cclxuXHRcdHRoaXMudGVtcGxhdGUgPSBKU1RbJ21vZGFscy9tb2RhbCddO1xyXG5cdFx0dGhpcy4kYXBwID0gJCgnLkFwcGxpY2F0aW9uJyk7XHJcblx0fVxyXG5cclxuXHRNb2RhbC5wcm90b3R5cGUgPSBPYmplY3QuY3JlYXRlKEJhY2tib25lVmlldy5wcm90b3R5cGUpO1xyXG5cclxuXHRfLmV4dGVuZChNb2RhbC5wcm90b3R5cGUsIEJhY2tib25lLkV2ZW50cyk7XHJcblxyXG5cdE1vZGFsLnByb3RvdHlwZS5vbkNsaWNrID0gZnVuY3Rpb24oKSB7XHJcblx0XHR0aGlzLmNsb3NlKCk7XHJcblx0XHR0aGlzLmNhbGxiYWNrICYmIHRoaXMuY2FsbGJhY2soKTtcclxuXHR9XHJcblxyXG5cdE1vZGFsLnByb3RvdHlwZS5fYWggPSBmdW5jdGlvbiAocCkge1xyXG5cdFx0dGhpcy5fYXBwSGVpZ2h0ID0gdGhpcy5fYXBwSGVpZ2h0IHx8IHRoaXMuJGFwcC5oZWlnaHQoKTtcclxuICAgIFx0cmV0dXJuIE1hdGguZmxvb3IodGhpcy5fYXBwSGVpZ2h0ICogcCk7XHJcblx0fVxyXG5cclxuXHRNb2RhbC5wcm90b3R5cGUuY2xvc2UgPSBmdW5jdGlvbigpIHtcclxuXHRcdHRoaXMuJGVsXHJcbiAgICAgICAgLnZlbG9jaXR5KHt0cmFuc2xhdGVZIDogdGhpcy5fYWgoMC40Nil9LCAyMDApXHJcbiAgICAgICAgLnZlbG9jaXR5KHt0cmFuc2xhdGVZIDogdGhpcy5fYWgoMS41MCl9LCB7XHJcbiAgICAgICAgICBjb21wbGV0ZTogXy5iaW5kKHRoaXMuZGV0YWNoLCB0aGlzKX1cclxuICAgICAgICAsIDQwMCk7XHJcblx0fVxyXG5cclxuXHRNb2RhbC5wcm90b3R5cGUub3BlbiA9IGZ1bmN0aW9uKGNhbGxiYWNrKSB7XHJcblx0XHR0aGlzLmNhbGxiYWNrID0gY2FsbGJhY2s7XHJcblx0XHR0aGlzLnJlbmRlcigpO1xyXG5cdFx0dGhpcy5hcHBlbmRUbyh0aGlzLiRhcHApO1xyXG5cdFx0dGhpcy4kZWxcclxuXHRcdC52ZWxvY2l0eSh7dHJhbnNsYXRlWSA6IC0xMDAwfSwgMClcclxuICAgICAgICAudmVsb2NpdHkoe3RyYW5zbGF0ZVkgOiB0aGlzLl9haCgwLjU0KX0sIDIwMClcclxuICAgICAgICAudmVsb2NpdHkoe3RyYW5zbGF0ZVkgOiB0aGlzLl9haCgwLjUwKX0sIDQwMCk7XHJcblx0fVxyXG5cclxuXHRNb2RhbC5wcm90b3R5cGUucHJlcGFyZSA9IGZ1bmN0aW9uKGRhdGEpIHtcclxuXHRcdHRoaXMudGVtcGxhdGVEYXRhID0gZGF0YTtcclxuXHR9XHJcblx0bW9kdWxlLmV4cG9ydHMgPSBNb2RhbDtcclxufSgpKTtcclxuIiwiXCJ1c2Ugc3RyaWN0XCI7XHJcbihmdW5jdGlvbiAoKSB7XHJcblx0dmFyIEJhY2tib25lVmlldyA9IHJlcXVpcmUoJy4uLy4uL2xpYi9iYWNrYm9uZV92aWV3Jyk7XHJcblx0ZnVuY3Rpb24gU2NlbmUgKGdhbWUpIHtcclxuXHRcdHRoaXMuZ2FtZSA9IGdhbWU7XHJcblx0XHRCYWNrYm9uZVZpZXcuY2FsbCh0aGlzLCB7XHJcblx0XHRcdHRhZ05hbWU6IFwiZGl2XCIsXHJcblx0XHRcdGNsYXNzTmFtZTogXCJzY2VuZVwiLFxyXG5cdFx0fSk7XHJcblx0XHR0aGlzLnRlbXBsYXRlID0gSlNUWydzY2VuZSddO1xyXG5cdFx0dGhpcy5yZW5kZXIoKTtcclxuXHRcdHRoaXMuY2FudmFzID0gdGhpcy4kKCcjY2FudmFzJylbMF07XHJcblx0XHR0aGlzLmNhbnZhcy53aWR0aCA9IGdhbWUuY29uZmlnLnN0YWdlV2lkdGg7XHJcblx0XHR0aGlzLmNhbnZhcy5oZWlnaHQgPSBnYW1lLmNvbmZpZy5zdGFnZUhlaWdodDtcclxuXHRcdHRoaXMuZGVidWdDYW52YXMgPSB0aGlzLiQoJyNkZWJ1Z0NhbnZhcycpWzBdO1xyXG5cdFx0dGhpcy5kZWJ1Z0NhbnZhcy53aWR0aCA9IGdhbWUuY29uZmlnLnN0YWdlV2lkdGg7XHJcblx0XHR0aGlzLmRlYnVnQ2FudmFzLmhlaWdodCA9IGdhbWUuY29uZmlnLnN0YWdlSGVpZ2h0O1xyXG5cclxuXHRcdHRoaXMuaHVkID0gbmV3IChyZXF1aXJlKCcuLi9pbnRlcmZhY2UnKSkodGhpcy5nYW1lLm1vZGVsKTtcclxuXHRcdHRoaXMuaHVkLmFwcGVuZFRvKHRoaXMuJGVsKTtcclxuXHR9XHJcblx0U2NlbmUucHJvdG90eXBlID0gT2JqZWN0LmNyZWF0ZShCYWNrYm9uZVZpZXcucHJvdG90eXBlKTtcclxuXHJcblx0U2NlbmUucHJvdG90eXBlLnJlYWR5ID0gZnVuY3Rpb24odmFsdWUpIHtcclxuXHRcdGlmICh2YWx1ZSkge1xyXG5cdFx0XHR0aGlzLmh1ZC4kZWwuc2hvdygpO1xyXG5cdFx0XHR0aGlzLmh1ZC5zdGFydFRpbWVyKCk7XHJcblx0XHR9XHJcblx0XHRlbHNlIHtcclxuXHRcdFx0dGhpcy5odWQuJGVsLmhpZGUoKTtcclxuXHRcdFx0dGhpcy5odWQuc3RvcFRpbWVyKCk7XHJcblx0XHR9XHJcblx0fTtcclxuXHJcblx0bW9kdWxlLmV4cG9ydHMgPSBTY2VuZTtcclxufSgpKTtcclxuIl19
