/**
 * 处理build指令, 核心是找到所有packages下面的文件, babel编译所有的src/**下面的文件
 */

const babel = require('@babel/core');
const yParser = require('yargs-parser');
const { join, extname, sep } = require('path');
const { existsSync, statSync, readdirSync } = require('fs');
const assert = require('assert');
const log = require('./utils/log');
const slash = require('slash2');
const chalk = require('chalk');
const rimraf = require('rimraf');
const vfs = require('vinyl-fs');
const through = require('through2');
const chokidar = require('chokidar');
const isLerna = require('./utils/isLerna');
const getBabelConfig = require('./utils/getBabelConfig');

const cwd = process.cwd(); // 获取cwd
let pkgCount = null;



function addLastSlash(path) {
    return path.slice(-1) === '/' ? path : `${path}/`;
}

/**
 * 通过babel编译
 * @param {*} opts 
 */
function transform(opts = {}) {
    const { content, path, pkg, root } = opts;
    assert(content, `opts.content should be supplied for transform()`);
    assert(path, `opts.path should be supplied for transform()`);
    assert(pkg, `opts.pkg should be supplied for transform()`);
    assert(root, `opts.root should be supplied for transform()`);
    assert(['.js', '.ts', '.tsx'].includes(extname(path)), `extname of opts.path should be .js, .ts or .tsx`);
    
    // 根据包里的package.json里的qmdTool配置来判断是不是浏览器环境
    const { browserFiles } = pkg.qmdTool || {};
    const isBrowser = browserFiles && browserFiles.includes(slash(path).replace(`${addLastSlash(slash(root))}`, ''));
    const babelConfig = getBabelConfig(isBrowser);

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

/**
 * 构建
 * @param {*} dir 要构建的包的文件夹
 * @param {*} opts 选项
 */
function build(dir, opts = {}) {
    const {cwd, watch} = opts;
    assert(dir.charAt(0) !== '/', `解析文件夹必须是相对路径`);
    assert(cwd, `opts.cwd 必须提供`);

    const pkgPath = join(cwd, dir, 'package.json');
    assert(existsSync(pkgPath), 'package.json 应该存在');

    const pkg = require(pkgPath);
    const libDir = join(dir, 'lib');
    const srcDir = join(dir, 'src');

    // clean
    rimraf.sync(join(cwd, libDir));

    function createStream(src) {
        assert(typeof src === 'string', `src for createStream should be string`);
        // 文件流处理
        // todo ts测试文件
        return vfs.src(
            [
                src,
                `!${join(srcDir, 'test/**')}`, // 不包含test文件
            ],
            {
                allowEmpty: true,
                base: srcDir,
            }
        )
        .pipe(
            through.obj((f, env, cb) => { // f是可读流输出的object stream
                if (['.js', '.ts', '.tsx'].includes(extname(f.path)) && !f.path.includes(`${sep}templates${sep}`)) { // 找到js和ts文件
                    f.contents = Buffer.from(
                        transform({
                            content: f.contents,
                            path: f.path,
                            pkg,
                            root: join(cwd, dir),
                        }),              
                    );
                    f.path = f.path.replace(extname(f.path), '.js'); // 全部转换成js文件
                }
                cb(null, f); // alternative this.push(data) 写入
            })
        )
        .pipe(
            vfs.dest(
                libDir
            )
        )
    }

    // build
    const stream = createStream(join(srcDir, '**/*'));
    stream.on('end', () => { // 监听build结束
        pkgCount -= 1;
        if (pkgCount === 0 && process.send) {
          process.send('BUILD_COMPLETE');
        }
        // watch 一个包编译结束后开始监听
        if (watch) {
            log.pending('start watch', srcDir);
            const watcher = chokidar.watch(join(cwd, srcDir), {
              ignoreInitial: true,
            });
            watcher.on('all', (event, fullPath) => {
              const relPath = fullPath.replace(join(cwd, srcDir), '');
              log.watch(`[${event}] ${join(srcDir, relPath)}`);
              if (!existsSync(fullPath)) return;
              if (statSync(fullPath).isFile()) {
                createStream(fullPath);
              }
            });      
        }
    })
}


// 开始执行

const args = yParser(process.argv.slice(2));
const watch = args.w || args.watch;
let specifiedPkg; // 指定要build的包
if (args.scope) {
    specifiedPkg = args.scope;
    assert(typeof specifiedPkg === 'string' || Array.isArray(specifiedPkg) ,`scope must be string or array`)
    if (typeof specifiedPkg === 'string') {
        specifiedPkg = [specifiedPkg];
    }
    specifiedPkg = specifiedPkg.map(_ => _.trim()).filter(_ => _);
}
if (isLerna(cwd)) {
    const dirs = readdirSync(join(cwd, 'packages'))
                    .filter(dir => dir.charAt(0) !== '.'); // 不包含.开头的文件
    if (specifiedPkg && specifiedPkg.length) {
        specifiedPkg = specifiedPkg.filter(pkg => {
            if (dirs.includes(pkg)) {
                return true;
            }
            log.warn(`${pkg} doesn't exist in packages`)
            return false;
        })
        pkgCount = specifiedPkg.length;
        specifiedPkg.forEach(pkg => {
            build(
                `./packages/${pkg}`,
                {
                    watch,
                    cwd,
                }
            )
        })
    } else {
        pkgCount = dirs.length;
        dirs.forEach(pkg => {
            build(
                `./packages/${pkg}`,
                {
                    watch, 
                    cwd
                }
            )
        })
    }
} else {
    pkgCount = 1;
    build(
        './',
        {
            watch, 
            cwd
        }
    )
}