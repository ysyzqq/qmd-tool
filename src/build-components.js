//使用webpack对组件进行打包

const yParser = require('yargs-parser');
const { join, extname, basename, sep } = require('path');
const { existsSync, statSync, readdirSync, copyFileSync, readFileSync, writeFileSync, ensureDirSync } = require('fs-extra');
const rimraf = require('rimraf');
const globby = require('globby');
const less = require('less');
const log = require('./utils/log');
const cwd = process.cwd();
const assert = require('assert');
const vfs = require('vinyl-fs');
const through = require('through2');
const babel = require('@babel/core');
const getBabelConfig = require('./utils/getBabelConfig');
const chalk = require('chalk');
const slash = require('slash2');


/**
 * 通过babel编译
 * @param {*} opts 
 */
function transform(opts = {}) {
    const { content, path, root } = opts;
    assert(content, `opts.content should be supplied for transform()`);
    assert(path, `opts.path should be supplied for transform()`);
    assert(root, `opts.root should be supplied for transform()`);
    assert(['.js', '.ts', '.tsx'].includes(extname(path)), `extname of opts.path should be .js, .ts or .tsx`);
    
    // 根据包里的package.json里的qmdTool配置来判断是不是浏览器环境
    const isBrowser = false;
    const babelConfig = getBabelConfig(isBrowser, 'umd');

    log.transform(
        chalk[isBrowser ? 'yellow' : 'blue'](
          `${slash(path).replace(`${cwd}/`, '')}`,
        ),
    );
    
    return babel.transform(content, {
        ...babelConfig,
        filename: path,
    }).code;
}

function build(dir, opts = {}) {
    const { cwd } = opts;
    const inputPath = join(cwd, 'components', dir);
    const outputPath = join(cwd, 'antd', dir);

    function lessHandle() {
        globby.sync(
            [
                `${inputPath}/style/*.less`
            ]
        ).forEach(path => {
            try {
                //复制
                const base = basename(path, '.less');
                const inputDir = `${inputPath}/style`;
                const outputDir = `${outputPath}/style`;
                const output = `${outputDir}/${base}`;

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
                less.render(lessInputContent, {
                    filename: path,
                    paths: [inputDir], // 查找@import的路径
                }, (err, info) => {
                    log.success(
                        `
                        less文件: ${path}
                        编译后: ${info}
                        `
                    )
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

    function createStream(src) {
        assert(typeof src === 'string', `src for createStream should be string`);
        // 文件流处理
        // todo ts测试文件
        return vfs.src(
            [
                src,
                `!${join(inputPath, 'test/**')}`, // 不包含test文件
            ],
            {
                allowEmpty: true,
                base: inputPath,
            }
        )
        .pipe(
            through.obj((f, env, cb) => { // f是可读流输出的object stream
                if (['.js', '.jsx', '.ts', '.tsx'].includes(extname(f.path)) && !f.path.includes(`${sep}templates${sep}`)) { 
                    // 找到js和ts文件, 不包括模板文件
                    f.contents = Buffer.from(
                        transform({
                            content: f.contents,
                            path: f.path,
                            root: join(inputPath),
                        }),              
                    );
                    f.path = f.path.replace(extname(f.path), '.js'); // 全部转换成js文件
                }
                cb(null, f); // alternative this.push(data) 写入
            })
        )
        .pipe(
            vfs.dest(
                outputPath
            )
        )
    }

    const stream = createStream(join(inputPath, '**/*'))

    stream.on('end', () => {
        lessHandle()
    })
}

const componentsDir = join(cwd, 'components')
if (existsSync(componentsDir) && statSync(componentsDir).isDirectory) {
    const components = readdirSync(componentsDir)
        .filter(dir => dir.charAt(0) !== '.'); // 不包含.开头的文件
    rimraf.sync(join(cwd, 'antd'));
    // 打包单独的组件, 保证组件可以懒加载
    components.forEach(cmp => {
        build(
            `./${cmp}`,
            {
                cwd
            }
        )
    })
    // webpack打包index文件, 打出ui库
} else {
    log.error('components文件夹有误')
}
