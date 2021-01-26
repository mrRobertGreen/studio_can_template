let {
	src,
	dest
} = require("gulp"); // пара основных функций из gulp
let fs = require('fs'); // плагин для работы с файловой системой
let gulp = require("gulp"); // сам gulp
let browsersync = require("browser-sync").create(); // плагин для синхронизации браузера с изменениями в коде
let autoprefixer = require("gulp-autoprefixer"); // плагин для добавления префиксов для стилей css
let scss = require("gulp-sass"); // плагин для перевода scss/sass в css, понятный браузеру
let group_media = require("gulp-group-css-media-queries"); // плагин для перемещения медиа-запросов в конец css файла
let plumber = require("gulp-plumber"); // "сантехник" - плагин для вывода синтаксических ошибок в консоли без прерывания работы gulp
let del = require("del"); // плагин для удаления/очищение файлов/папок
let imagemin = require("gulp-imagemin"); // плагин для сжатия изображений
let uglify = require("gulp-uglify-es").default; // плагин для минификации js файла 
let rename = require("gulp-rename"); // плагин переименования файлов
let fileinclude = require("gulp-file-include"); // плагин для импорта кода в html (конструкции типа @@include('file.html'))
let clean_css = require("gulp-clean-css"); // плагин для минификации css файла
let newer = require('gulp-newer'); // плагин для запуска задач только для тех файлов, которые изменились
let webp = require('imagemin-webp'); // плагин для конфертации картинок в webp формат
let webphtml = require('gulp-webp-html'); // плагин для интеграции webp в html
let version = require('gulp-version-number'); // плагин для добавления номера версии к файлам css/js
let fonter = require('gulp-fonter'); // плагин для конвертации шрифтов

let ttf2woff = require('gulp-ttf2woff'); // плагин для конвертации ttf шрифтов в woff
let ttf2woff2 = require('gulp-ttf2woff2'); // плагин для конвертации ttf шрифтов в woff2

let project_name = "build"; // папка с конечными файлами проекта (build)
let src_folder = "src"; // папка с исходниками

let path = {
	// устанавливаем переменную с путями
	build: { // пути к собранным файлам 
		html: project_name + "/",
		js: project_name + "/js/",
		css: project_name + "/css/",
		images: project_name + "/img/",
		fonts: project_name + "/fonts/",
		php: project_name + "/",
		favicon: project_name + "/favicons/",
	},
	src: { // пути к исходным файлам	
		favicon: src_folder + "/favicons/**",
		html: [src_folder + "/*.html", "!" + src_folder + "/_*.html"],
		js: [src_folder + "/js/index.js", src_folder + "/js/libs.js"],
		php: [src_folder + "/php/**"],
		css: [src_folder + "/scss/*.scss", "!" + src_folder + "/_*.scss"],
		images: [src_folder + "/img/**/*.{jpg,png,svg,gif,ico,webp}", "!**/favicon.*"],
		fonts: src_folder + "/fonts/*.ttf",
	},
	watch: { // пути к файлам, за изменениями которых, хотим следить
		html: src_folder + "/**/**",
		js: src_folder + "/**/**",
		php: src_folder + "/php/**",
		css: src_folder + "/scss/**/**",
		images: src_folder + "/img/**/*.{jpg,png,svg,gif,ico,webp}"
	},
	clean: "./" + project_name + "/" // папка, которые нужно чистить при запуске gulp
};

function browserSync(done) {
	// функция, которая обновляет страницу
	browsersync.init({
		server: {
			baseDir: "./" + project_name + "/" // папка с проектом
		},
		notify: false, // отключаем уведомления
		port: 5500, // указываем прт
	});
}

function html() { // функция обработки html
	return src(path.src.html, {}) // src - функция добавляет в поток файлы из path.src.html
		.pipe(plumber({ // проверка на синтаксические ошибки
			errorHandler: function (err) {
				console.error(err);
				this.emit('end');
			}
		}))
		.pipe(fileinclude()) // включение возможность использовать @@include
		.pipe(webphtml()) // интеграция webp
		.pipe(version({ // добавление номера версии к файлам css
			value: "%TS%", // значение номера - timestamp
			append: {
				key: "v",
				to: ["css", "js"]
			}
		}))
		.pipe(dest(path.build.html)) // dest - функция кладет обработанные в потоке файлы в path.build.html
		.pipe(browsersync.stream()); // синхронизация с браузером
}

function php() { // функция обработки php
	return src(path.src.php, {})
		.pipe(dest(path.build.php))
		.pipe(browsersync.stream());
}

function css() { // функция обработки файлов со стилями
	return src(path.src.css, {})
		.pipe(plumber({
			errorHandler: function (err) {
				console.error(err);
				this.emit('end');
			}
		}))
		.pipe( // перевод из scss в css
			scss({
				outputStyle: "expanded"
			})
		)
		.pipe(group_media()) // перенос всех медиазапросов в конец css файла
		.pipe(
			autoprefixer({ // добавление браузерных префиксов в css стилях
				grid: true,
				overrideBrowserslist: ["last 5 versions"],
				cascade: true
			})
		)
		.pipe(dest(path.build.css)) // кладем в path.build.css НЕ минифицированную версию css
		.pipe(clean_css()) // минифицкация css файла
		.pipe(
			rename({
				extname: ".min.css" // переименовываем, добавляя к имени .min
			})
		)
		.pipe(dest(path.build.css)) // кладем в path.build.css минифицированную версию css
		.pipe(browsersync.stream());
}

function js() {
	return src(path.src.js, {})
		.pipe(plumber({ // проверка на синтаксические ошибки
			errorHandler: function (err) {
				console.error(err);
				this.emit('end');
			}
		}))
		.pipe(fileinclude())
		.pipe(dest(path.build.js)) // сохраняем НЕ минифицированную версию js
		.pipe(uglify( /* options */ )) // минификация js файла
		.pipe(
			rename({
				suffix: ".min", // переименовываем, добавляя к имени .min
				extname: ".js"
			})
		)
		.pipe(dest(path.build.js)) // сохраняем минифицированную версию js
		.pipe(browsersync.stream());
}

function images() {
	return src(path.src.images)
		.pipe(newer(path.build.images)) // пропуск только новых изображений
		.pipe(
			imagemin([
				webp({
					quality: 75 // конвертация в webp формат
				})
			])
		)
		.pipe(
			rename({
				extname: ".webp" // замена расширения на webp
			})
		)
		.pipe(dest(path.build.images))
		.pipe(src(path.src.images))
		.pipe(newer(path.build.images))
		.pipe(
			imagemin({ // сжатие изображений
				progressive: true,
				svgoPlugins: [{
					removeViewBox: false
				}],
				interlaced: true,
				optimizationLevel: 3 // 0 to 7
			})
		)
		.pipe(dest(path.build.images))
}

function favicon() {
	return src(path.src.favicon)
		.pipe(plumber({
			errorHandler: function (err) {
				console.error(err);
				this.emit('end');
			}
		}))
		.pipe(dest(path.build.favicon))
}

function fonts_otf() { // функция для конвертирования otf шрифтов в ttf
	return src('./' + src_folder + '/fonts/*.otf')
		.pipe(plumber({ // проверка на синтаксические ошибки
			errorHandler: function (err) {
				console.error(err);
				this.emit('end');
			}
		}))
		.pipe(fonter({
			formats: ['ttf']
		}))
		.pipe(gulp.dest('./' + src_folder + +'/fonts/'));
}

function fonts() { // функция для конвертирования ttf шрифтов в woff И woff2 
	src(path.src.fonts)
		.pipe(plumber({
			errorHandler: function (err) {
				console.error(err);
				this.emit('end');
			}
		}))
		.pipe(ttf2woff())
		.pipe(dest(path.build.fonts));
	return src(path.src.fonts)
		.pipe(ttf2woff2())
		.pipe(dest(path.build.fonts))
		.pipe(browsersync.stream());
}

async function add_fonts_to_scss() { // функция для добавления импортов шрифтов в файл _fonts.scss
	/* после выполнения функции стоит зайти в файл /scss/_fonts.scss и при надобности изменить
	   у импортированных шрифтов значения font-weight и font-style
	   */
	fs.writeFile(src_folder + '/scss/_fonts.scss', '', emptyCallback);
	fs.readdir(path.build.fonts, async function (err, files) {
		if (!files) return
		files = removeExtensionsFromFiles(files)
		files = removeDuplicatesFromArr(files)
		if (err) {
			console.error(err)
		} else {
			await fs.appendFile(src_folder + '/scss/_fonts.scss', '@import "_vars.scss";\r\n', emptyCallback)

			for (const font of files) {
				
				await fs.appendFile(src_folder + '/scss/_fonts.scss', '@include font("' + font + '", "' + font + '", "400", "normal");\r\n', emptyCallback);
			}
		}
	})
}

function removeExtensionsFromFiles(files) {
	return files.map(file => file.split(".")[0])
}

function removeDuplicatesFromArr(arr) {
	return [...new Set(arr)]
}

function emptyCallback() {}

function clean() { // очистка папки с билдом, нужна после каждого изменения для удаления лишнего и неактуального
	return del(path.clean);
}

function watchFiles() { // наблюдение за измениями в указанных папках
	gulp.watch([path.watch.html], html); // следим за path.watch.html и при изменении выполняем функцию html
	gulp.watch([path.watch.css], css);
	gulp.watch([path.watch.js], js);
	gulp.watch([path.watch.php], php);
	gulp.watch([path.watch.images], images);
}

// private tasks
let build = gulp.series(clean, fonts_otf, gulp.parallel(html, css, js, images, php, favicon), fonts);
let watch = gulp.parallel(build, watchFiles, browserSync); // комбинируем задания, которые нужно выполнять параллельно

// чтобы зарегестрировать задания, их нужно экспортировать
exports.html = html;
exports.css = css;
exports.js = js;
exports.php = php;
exports.favicon = favicon;
exports.fonts_otf = fonts_otf;
exports.add_fonts_to_scss = add_fonts_to_scss;
exports.fonts = fonts;
exports.images = images;
exports.clean = clean;
exports.build = build;
exports.watch = watch;
exports.default = watch; // задание, которое выполняется по умолчанию	