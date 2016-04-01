var gulp      = require('gulp');
var gutil     = require('gulp-util');
var bower     = require('bower');
var concat    = require('gulp-concat');
var sass      = require('gulp-sass');
var minifyCss = require('gulp-minify-css');
var rename    = require('gulp-rename');
var sh        = require('shelljs');
var jshint    = require('gulp-jshint');
var uglify    = require("gulp-uglify");

var paths = {
  sass: ['./scss/**/*.scss'],
  artmobilib_src: ['../ArtMobilib-js/src/**/*.js'],
  artmobilis_js_ngmodules_src: ['../ArtMobilis-js-ngmodules/modules/**/*']
};

gulp.task('default', ['sass', 'lint-artmobilib', 'minify-artmobilib', 'copy-artmobilis-js-ngmodules']);

gulp.task('sass', function(done) {
  gulp.src('./scss/ionic.app.scss')
    .pipe(sass())
    .on('error', sass.logError)
    .pipe(gulp.dest('./www/css/'))
    .pipe(minifyCss({
      keepSpecialComments: 0
    }))
    .pipe(rename({ extname: '.min.css' }))
    .pipe(gulp.dest('./www/css/'))
    .on('end', done);
});

gulp.task('lint-artmobilib', function() {
  return gulp.src(paths.artmobilib_src)
    .pipe(jshint())
    .on('error', function(err) {
      console.log(err.toString());
    })
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('lint-ngmodules', function() {
  return gulp.src(paths.artmobilis_js_ngmodules_src)
    .pipe(jshint())
    .on('error', function(err) {
      console.log(err.toString());
    })
    .pipe(jshint.reporter('jshint-stylish'));
});

gulp.task('minify-artmobilib', ['lint-artmobilib'], function () {
    gulp.src(paths.artmobilib_src)
    .pipe(concat('artmobilib.js'))
    .pipe(gulp.dest('../ArtMobilib-js/build/'))
    .pipe(gulp.dest('./www/lib/ArtMobilib/build/'))
    .pipe(uglify())
    .pipe(rename({ extname: '.min.js' }))
    .pipe(gulp.dest('../ArtMobilib-js/build/'))
    .pipe(gulp.dest('./www/lib/ArtMobilib/build/'));
});

gulp.task('copy-artmobilis-js-ngmodules', ['lint-ngmodules'], function() {
    gulp.src(paths.artmobilis_js_ngmodules_src)
    .pipe(gulp.dest('./lib/ArtMobilis-js-ngmodules/modules/'));
});

gulp.task('watch', function() {
  gulp.watch(paths.sass, ['sass']);
  gulp.watch(paths.artmobilib_src, ['minify-artmobilib']);
  gulp.watch(paths.artmobilis_js_ngmodules_src, ['copy-artmobilis-js-modules']);
});

gulp.task('install', ['git-check'], function() {
  return bower.commands.install()
    .on('log', function(data) {
      gutil.log('bower', gutil.colors.cyan(data.id), data.message);
    });
});

gulp.task('git-check', function(done) {
  if (!sh.which('git')) {
    console.log(
      '  ' + gutil.colors.red('Git is not installed.'),
      '\n  Git, the version control system, is required to download Ionic.',
      '\n  Download git here:', gutil.colors.cyan('http://git-scm.com/downloads') + '.',
      '\n  Once git is installed, run \'' + gutil.colors.cyan('gulp install') + '\' again.'
    );
    process.exit(1);
  }
  done();
});
