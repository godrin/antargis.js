var gulp=require('gulp');
var mainBowerFiles = require('main-bower-files');

var libs=['bower_components/threejs-examples/examples/js/loaders/OBJLoader.js'].concat(mainBowerFiles());

gulp.task('debug',function() {
  return gulp.src(libs).pipe(gulp.dest('public/js/libs'));
});

gulp.task('default',['debug']);
