const gulp = require('gulp');
const run = require('gulp-run-command').default;
const sequence = require('gulp-sequence');
const fs = require('fs');

const config = require('./package.json');

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

gulp.task('clean', run([
	'rm -rf ./build-src'
], {ignoreErrors: true}));

gulp.task('build-prepare', run([
	'rm -rf ./build/*',
	'mkdir -p ./build'
], {ignoreErrors: true}));

gulp.task('build-sources-manifest', function (done) {
	const manifest = require('./src/manifest.json');
	manifest.version = config.version;
	manifest.description = config.description;
	fs.writeFile('./src/manifest.json', JSON.stringify(manifest, null, '\t'), done);
});

gulp.task('build-sources-prepare', run([
	'cp -a ./src ./build-src'
]));

gulp.task('build-sources', sequence('build-sources-manifest', 'build-sources-prepare'));

gulp.task('build-export-chrome', run([
	'google-chrome --pack-extension=./build-src' + (chromeKeyExists ? ` --pack-extension-key=./${CHROME_KEY_NAME}` : ''),
	'mv ./build-src.crx ./build/chrome-extract-json.crx',
	chromeKeyExists ? '' : `mv ./build-src.pem ${CHROME_KEY_NAME}`
], {ignoreErrors: true}));

gulp.task('build-export-firefox', run([
	// 'zip -r -FS ../build/firefox-extract-json.zip . -i *'
	'web-ext build -s ./build-src/ -a ./build/ -o',
	`mv ./build/extract_json-${config.version}.zip ./build/firefox-extract-json.zip`
], {ignoreErrors: true}));

gulp.task('build', sequence('clean', 'build-prepare', 'build-sources', ['build-export-chrome', 'build-export-firefox']));

gulp.task('default', sequence('build', 'clean'));
