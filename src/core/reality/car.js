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