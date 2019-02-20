const linter = new (require('eslint').CLIEngine)({
	envs: ['browser', 'mocha']
});
const gulp = require('gulp');
const run = require('gulp-run-command').default;
const fs = require('fs');

const webExt = require('web-ext').default;

const config = require('./package.json');

const CHROME_BIN = process.env.CHROME_BIN || 'google-chrome';

const CHROME_KEY_NAME = 'chrome-extract-json.pem';
const chromeKeyExists = (() => {
	try {
		fs.accessSync(CHROME_KEY_NAME);
		return true;
	}
	catch (e) {
		return false;
	}
})();

gulp.task('updateManifest', function updateManifest (done) {
	const manifest = require('./src/manifest.json');
	manifest.version = config.version;
	manifest.description = config.description;
	fs.writeFile('./src/manifest.json', JSON.stringify(manifest, null, '\t'), done);
});

gulp.task('checkStyle', function checkStyle (done) {
	var report = linter.executeOnFiles(['./src/*.js']);
	var err = null;
	if (report.errorCount > 0) {
		var formatter = linter.getFormatter();
		console.log(formatter(report.results));
		err = new Error('ESLint errors found');
	}

	done(err);
});

gulp.task('clean:source', run([
	'rm -rf ./build-src'
], {ignoreErrors: true}));

gulp.task('clean:build', run([
	'rm -rf ./build/*',
	'mkdir -p ./build'
], {ignoreErrors: true}));

gulp.task('prepare', gulp.series(
	'updateManifest',
	'checkStyle',
	run(['cp -a ./src ./build-src'])
));

gulp.task('build:Chrome', run([
	`${CHROME_BIN} --disable-gpu --pack-extension=./build-src` + (chromeKeyExists ? ` --pack-extension-key=./${CHROME_KEY_NAME}` : ''),
	'mv ./build-src.crx ./build/chrome-extract-json.crx',
	chromeKeyExists ? '' : `mv ./build-src.pem ${CHROME_KEY_NAME}`
], {ignoreErrors: true}));

gulp.task('build:Firefox:lint', function buildFirefoxLint (done) {
	webExt.cmd.lint({
		sourceDir       : './build-src',
		artifactsDir    : './build',
		warningsAsErrors: true
	}, { shouldExitProgram: false })
		.then(report => {
			if (report.summary.warnings > 0) {
				throw 'No warnings for Firefox extension allowed';
			}

			done();
		})
		.catch(done)
	;
});

gulp.task('build:Firefox:build', function buildFirefoxBuild (done) {
	webExt.cmd.build({
		sourceDir    : './build-src',
		artifactsDir : './build',
		overwriteDest: true
	})
		.then(() => done())
		.catch(done)
	;
});

gulp.task('build:Firefox:package', run([
	// 'web-ext lint -s ./build-src/ -o text',
	// 'web-ext build -s ./build-src/ -a ./build/ -o',
	`mv ./build/extract_json-${config.version}.zip ./build/firefox-extract-json.zip`
], {ignoreErrors: true}));

gulp.task('build:Firefox', gulp.series(
	'build:Firefox:lint',
	'build:Firefox:build',
	'build:Firefox:package'
));

gulp.task('build', gulp.parallel('build:Chrome', 'build:Firefox'));
gulp.task('clean', gulp.parallel('clean:source', 'clean:build'));

exports.default = gulp.series(
	'clean',
	'prepare',
	'build',
	'clean:source'
);
