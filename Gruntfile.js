module.exports = function(grunt) {
  grunt.initConfig({
    closureCompiler:  {
      options: {
        compilerFile: '/usr/share/java/closure-compiler/closure-compiler.jar',
        TieredCompilation: true
      },

      targetName: {
        src: 'www/js/app/*.js',
        dest: 'dist/www/js/app/chart.min.js'
      }
    },
    copy: {
      main: {
        files: [
          {expand: true, src: ['www/js/vendor/bootstrap-datepicker.min.js'], dest: 'dist/'},
          {expand: true, src: ['www/css/*.css'], dest: 'dist/'},
          {expand: true, src: ['www/*.html'], dest: 'dist/'}
        ],
      },
    },
    clean: {
      folder: ['dist/']
    },
    connect: {
      server: {
        options: {
          port: 9000,
          base: 'dist/www',
          keepalive: true,
          middleware: function (connect, options, middlewares) {
            var proxySnippet = require('grunt-connect-proxy/lib/utils').proxyRequest;
            middlewares.unshift(proxySnippet);
            return middlewares;
          }
        },
        proxies: [
          {
            context: '/ledger_rest',
            host: 'localhost',
            port: 9856
          }
        ]
      }
    }
  });

  grunt.loadNpmTasks('grunt-closure-tools');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');
  grunt.loadNpmTasks('grunt-contrib-connect');
  grunt.loadNpmTasks('grunt-connect-proxy');

  grunt.registerTask('build', ['closureCompiler', 'copy']);
  grunt.registerTask('serve', ['configureProxies:server', 'connect:server']);

};
