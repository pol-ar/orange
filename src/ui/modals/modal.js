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
