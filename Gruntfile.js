module.exports = function(grunt) {
  grunt.initConfig({
    closureCompiler:  {

      options: {
        compilerFile: '/usr/share/java/closure-compiler/closure-compiler.jar',
        compilerOpts: {
          compilation_level: 'ADVANCED_OPTIMIZATIONS',
          output_wrapper: '"(function(){%output%}).call(this);"'
        },
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
    }
  });

  grunt.loadNpmTasks('grunt-closure-tools');
  grunt.loadNpmTasks('grunt-contrib-copy');
  grunt.loadNpmTasks('grunt-contrib-clean');

  grunt.registerTask('default', ['closureCompiler', 'copy']);

};
