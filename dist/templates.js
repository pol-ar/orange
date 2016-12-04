this["JST"] = this["JST"] || {};

this["JST"]["interface/hud"] = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var helper, alias1=depth0 != null ? depth0 : {}, alias2=helpers.helperMissing, alias3="function", alias4=container.escapeExpression;

  return "<div class=\"laps\">LAPS: "
    + alias4(((helper = (helper = helpers.laps || (depth0 != null ? depth0.laps : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"laps","hash":{},"data":data}) : helper)))
    + "/"
    + alias4(((helper = (helper = helpers.laps_to_win || (depth0 != null ? depth0.laps_to_win : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"laps_to_win","hash":{},"data":data}) : helper)))
    + "</div>\r\n<div class=\"time\"></div>\r\n<div class=\"best_time\">BEST TIME: "
    + alias4(((helper = (helper = helpers.best_time || (depth0 != null ? depth0.best_time : depth0)) != null ? helper : alias2),(typeof helper === alias3 ? helper.call(alias1,{"name":"best_time","hash":{},"data":data}) : helper)))
    + " s</div>\n";
},"useData":true});

this["JST"]["modals/modal"] = Handlebars.template({"1":function(container,depth0,helpers,partials,data) {
    var helper;

  return "<div class=\"results\">Your time: "
    + container.escapeExpression(((helper = (helper = helpers.time || (depth0 != null ? depth0.time : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(depth0 != null ? depth0 : {},{"name":"time","hash":{},"data":data}) : helper)))
    + " s</div>\r\n";
},"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    var stack1, helper, alias1=depth0 != null ? depth0 : {};

  return "<div class= \"title\">RACES</div>\r\n<div class= \"info\">\r\n"
    + ((stack1 = helpers["if"].call(alias1,(depth0 != null ? depth0.restart : depth0),{"name":"if","hash":{},"fn":container.program(1, data, 0),"inverse":container.noop,"data":data})) != null ? stack1 : "")
    + "<div class=\"bestTime\">Your best time: "
    + container.escapeExpression(((helper = (helper = helpers.best_time || (depth0 != null ? depth0.best_time : depth0)) != null ? helper : helpers.helperMissing),(typeof helper === "function" ? helper.call(alias1,{"name":"best_time","hash":{},"data":data}) : helper)))
    + " s</div>\r\n</div>\r\n<div class='btn-start'><div>START NEW GAME</div></div>\n";
},"useData":true});

this["JST"]["scene"] = Handlebars.template({"compiler":[7,">= 4.0.0"],"main":function(container,depth0,helpers,partials,data) {
    return "<canvas class=\"scene-canvas\" id=\"debugCanvas\"></canvas>\r\n<canvas class=\"scene-canvas\" id=\"canvas\"></canvas>\n";
},"useData":true});