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
