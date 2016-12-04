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