module.exports = function(grunt) {

  var _    = require('underscore');

  grunt.initConfig({
    pkg: grunt.file.readJSON('package.json'),

    connect: {
      server: {
        options: {
          debug: false,
          port: 9000,
          hostname: 'localhost',
          livereload: true,
          base: ['.', 'dist']
        }
      }
    },

    less: {
      options: {
        paths: ['src/less/import'],
        plugins: [
          new (require('less-plugin-autoprefix'))({browsers: ["last 2 versions", "> 5%"]}),
          new (require('less-plugin-clean-css'))({advanced: true})
        ],
      },
      dist: {
        files: {
          'dist/styles.css': ['src/**/*.less', '!src/less/import/**/*.less']
        }
      }
    },

    browserify: {
      dist: {
        files: {
          'dist/app.js' : ['src/app.js'],
          'dist/libs.js': ['src/libs.js']
        }
      },
      options: {
        watch: true,
        browserifyOptions: {
          debug: true
        }
      }
    },

    handlebars: {
      options: {
        processName: function (filepath) {
          var p = filepath.replace(/(src\/|ui\/|\.hbs)/ig, '').split('/');
          p = _.uniq(p);
          return p.join('/');
        },
        processContent: function(content, filepath) {
          content = content.replace(/^[\x20\t]+/mg, '').replace(/[\x20\t]+$/mg, '');
          content = content.replace(/^[\r\n]+/, '').replace(/[\r\n]*$/, '\n');
          return content;
        }
      },
      dist: {
        files: {
          'dist/templates.js': 'src/**/*.hbs'
        }
      }
    },

    uglify: {
      dist: {
        files: {
          'dist/app.min.js'        : ['dist/app.js', 'dist/templates.js'],
          'dist/libs.min.js'       : ['dist/libs.js']
        }
      }
    },

    extract_sourcemap: {
      files: {
        dist: ['dist/app.js', 'dist/libs.js']
      }
    },

    clean: {
      dist: ['dist/**/*', '!dist/.keep', '!dist/index.html']
    },

    watch: {
      options: {
        atBegin: false,
        livereload: true
      },

      less: {
        options: {
          livereload: false,
          interrupt : true
        },
        files: ['src/**/*.less'],
        tasks: ['less']
      },

      css: {
        files: ['dist/styles.css'],
        tasks: [],
        spawn: false
      },

      handlebars: {
        files: ['src/**/*.hbs'],
        tasks: ['handlebars']
      },

      browserify: {
        files: ['dist/app.js', 'dist/libs.js'],
        tasks: []
      }
    }

  });

  [
    'grunt-contrib-connect',
    'grunt-contrib-less',
    'grunt-browserify',
    'grunt-contrib-handlebars',
    'grunt-contrib-uglify',
    'grunt-extract-sourcemap',
    'grunt-contrib-clean',
    'grunt-contrib-watch'
  ].forEach(function(task) {
    grunt.loadNpmTasks(task);
  });

  grunt.registerTask('build', [
    'clean',
    'less',
    'handlebars',
    'browserify',
    'extract_sourcemap'
  ]);

  grunt.registerTask('default', ['build', 'connect', 'watch']);
};