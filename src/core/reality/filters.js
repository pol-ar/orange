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