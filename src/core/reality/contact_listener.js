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