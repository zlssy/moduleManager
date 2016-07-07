var gulp = require('gulp');
var concat = require('gulp-concat');
var sass = require('gulp-sass');

/*
* nested：嵌套缩进的css代码，它是默认值。
* expanded：没有缩进的、扩展的css代码。
* compact：简洁格式的css代码。
* compressed：压缩后的css代码。
*/
gulp.task('sass', function () {
    gulp.src(['sass/base.scss', 'sass/[^base]*.scss'])
        .pipe(sass({
            outputStyle: 'compact'
        }).on('error', sass.logError))
        .pipe(concat('style.css'))
        .pipe(gulp.dest('./public/css'))
});

gulp.task('default', ['sass']);