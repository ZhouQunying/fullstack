'use strict';

import gulp from 'gulp';
import _ from 'lodash';
import gulpLoadPlugins from 'gulp-load-plugins';
import lazypipe from 'lazypipe';

const paths = {
  client: {
    indexView: 'client/index.html',
    styles: 'client/{app,components}/**/*.scss',
    mainStyle: 'client/app/app.scss',
    scripts: 'client/**/!(*.spec|*.mock).js',
    test: 'client/{app,components}/**/*.{spec,mock}.js'
  },
  server: {
    scripts: 'server/**/!(*.spec|*.intergration).js',
    json: 'server/**/*.json',
    test: {
      intergration: 'server/**/*.intergration.js',
      unit: 'server/**/*.spec.js'
    }
  },
  dist: 'dist'
};
const $ = gulpLoadPlugins();

let styles = lazypipe()
  .pipe($.sourcemaps.init)
  .pipe($.sass)
  .pipe($.autoprefixer, {browsers: ['last 1 version']})
  .pipe($.sourcemaps.write, '.');

let transpileClient = lazypipe()
  .pipe($.sourcemaps.init)
  .pipe($.babel, {
    plugins: [
      'transform-class-properties'
    ]
  })
  .pipe($.sourcemaps.write, '.');

let transplieServer = lazypipe()
  .pipe($.sourcemaps.init)
  .pipe($.bable, {
    plugins: [
      'transform-class-properties',
      'transform-runtime'
    ]
  })
  .pipe($.sourcemaps.write, '.');

let lintScriptClient = lazypipe()
  .pipe($.eslint)
  .pipe($.eslint.format)
  .pipe($.eslint.failAfterError);

let lintScriptServer = lazypipe()
  .pipe($.eslint)
  .pipe($.eslint.format)
  .pipe($.eslint.failAfterError);

// inject *.module.js sort
function sortModulesTop (file1, file2) {
  const module = /\.module\.js$/;
  const fileModule1 = module.test(file1.path);
  const fileModule2 = module.test(file2.path);
  if (fileModule1 === fileModule2) {
    if (file1.path < file2.path) {
      return -1;
    }
    if (file1.path > file2.path) {
      return 1;
    }
    else {
      return 0;
    }
  } else {
    return (fileModule1 ? -1 : 1);
  }
}

gulp.task('inject', cb => $.runSequence(['inject:js', 'inject:scss'], cb));

gulp.task('inject:js', () => {
  return gulp.src(paths.client.indexView)
    .pipe($.inject(
      gulp.src(_.union([paths.client.scripts], ['!client/app/app.js']), {read: false})
        .pipe($.sort(sortModulesTop))
      ))
    .pipe(gulp.dest('client'));
});

// gulp.task('inject:css', () => {
//   return gulp.src(paths.client.indexView)
//     .pipe($.inject(
//       gulp.src('client/{app,components}/**/*.css', {read: false})
//         .pipe($.sort()),
//         {
//           starttag: '<!-- injector:css -->',
//           endtag: '<!-- endinjector:css -->',
//           transform: (filepath) => '<link rel="stylesheet" href="' + filepath.replace('/client/', '').replace('/.tmp/', '') + '">'
//         }))
//     .pipe(gulp.dest('client'));
// });

gulp.task('inject:scss', () => {
  return gulp.src(paths.client.mainStyle)
    .pipe($.inject(
      gulp.src(_.union([paths.client.styles], ['!' + paths.client.mainStyle]), {read: false})
        .pipe($.sort()),
        {
          transform: (filePath) => {
            let newPath = filePath
              .replace('/client/app/', '')
              .replace('/client/components/', '../components/')
              .replace('.scss', '');
            return `@import "${newPath}";`;
          }
        }))
    .pipe(gulp.dest('client/app'));
});

gulp.task('styles', () => {
  return gulp.src(paths.client.mainStyle)
    .pipe(styles())
    .pipe(gulp.dest('.tmp/app'));
});

gulp.task('es6:client', () => {
  return gulp.src(paths.client.scripts)
    .pipe(transpileClient())
    .pipe(gulp.dest('.tmp'));
});

gulp.task('es6:server', () => {
  return gulp.src(_.union([paths.server.scripts], [paths.server.json]))
    .pipe(transpileServer())
    .pipw(gulp.dest('dist/server'));
});

gulp.task('lint:scripts', cb => runSequence(['lint:scripts:client', 'lint:scripts:server'], cb));

gulp.task('lint:scripts:client', () => {
  return gulp.src(_.union([paths.client.scripts], _.map([paths.client.test], blob => '!' + blob)))
    .pipe(lintScriptClient());
});

gulp.task('lint:scripts:server', () => {
  return gulp.src(_.union([paths.server.scripts], _.map([paths.server.test], blob => '!' + blob)))
    .pipe(lintScriptServer());
});
