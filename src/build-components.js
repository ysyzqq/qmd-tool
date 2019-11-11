//使用webpack对组件进行打包

const yParser = require('yargs-parser');
const { join, resolve, extname, basename } = require('path');
const { existsSync, statSync, readdirSync, copyFileSync } = require('fs-extra');
const assert = require('assert');
const execa = require('execa');
const slash = require('slash2');
const chalk = require('chalk');
const rimraf = require('rimraf');
const globby = require('globby');
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
                const output = `${outputPath}/style/${base}`
                copyFileSync(path, `${output}.less`)
                //编译为css
                execa.commandSync(`less ${path} ${output}.css`)
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
        lessHandle()
        // const info = stats.toJson();

        // if (stats.hasErrors()) {
        //     console.error(info.errors);
        // }

        // if (stats.hasWarnings()) {
        //     console.warn(info.warnings);
        // }
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
