//使用webpack对组件进行打包

const yParser = require('yargs-parser');
const { join, extname, basename } = require('path');
const { existsSync, statSync, readdirSync, copyFileSync, readFileSync, writeFileSync, ensureDirSync } = require('fs-extra');
const rimraf = require('rimraf');
const globby = require('globby');
const less = require('less');
const webpack = require('webpack');
const log = require('./utils/log');
const getWebpackConfig = require('./utils/getWebpackConfig');
const cwd = process.cwd();


function build(dir, opts = {}) {
    const { cwd } = opts;
    const inputPath = join(cwd, 'components', dir);
    const outputPath = join(cwd, 'antd', dir);
    const jsEntries = globby.sync(
        [
            `${inputPath}/**/*.(js|jsx|ts|tsx)`,
            `!${inputPath}/__tests__`,
            `!${inputPath}/demo`
        ],
        {

        }
    ).reduce((memo, cur) => {
        const ext = extname(cur);
        return { ...memo, [cur.replace(`${inputPath}/`, '').replace(ext, '')]: cur }
    }, {})
    function lessHandle() {
        globby.sync(
            [
                `${inputPath}/style/*.less`
            ]
        ).forEach(path => {
            try {
                //复制
                const base = basename(path, '.less');
                const outputDir = `${outputPath}/style`
                const output = `${outputDir}/${base}`
                if (!existsSync(outputDir)) {
                    ensureDirSync(outputDir);
                }
                log.info(
                    `
                    copy: ${path} -- ${output}.less
                    destExist: ${existsSync(outputDir)}
                    `
                )
                copyFileSync(path, `${output}.less`)
                //编译为css
                const lessInputContent = readFileSync(path).toString()
                less.render(lessInputContent, {}, (err, info) => {
                    if (info && info.css) {
                        const css = info.css;
                        writeFileSync(`${output}.css`, css)
                    }
                })
            } catch (e) {
                throw (`less处理出错: ${e}`)
            }
        })
    }
    const compiler = webpack({
        ...getWebpackConfig({cwd}),
        entry: jsEntries,
        output: {
            path: outputPath,
            filename: '[name].js'
        }
    });
    compiler.run((err, stats) => { // Stats Object
        if (err) {
            console.error(err.stack || err);
            return;
        }
        const info = stats.toJson();

        if (stats.hasErrors()) {
            console.error(info.errors);
            return;
        }

        lessHandle()
    })
}

const componentsDir = join(cwd, 'components')
if (existsSync(componentsDir) && statSync(componentsDir).isDirectory) {
    const components = readdirSync(componentsDir)
        .filter(dir => dir.charAt(0) !== '.'); // 不包含.开头的文件
    rimraf.sync(join(cwd, 'antd'));
    components.forEach(cmp => {
        build(
            `./${cmp}`,
            {
                cwd
            }
        )
    })
} else {
    log.error('components文件夹有误')
}
