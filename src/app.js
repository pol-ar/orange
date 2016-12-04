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
