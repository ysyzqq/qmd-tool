/**
 * rollup指令, 通过rollup去编译打包
 */
const yParser = require('yargs-parser');
const rollup = require('rollup');
const assert = require('assert');
const { existsSync, readdirSync } = require('fs');
const { join } = require('path');
const nodeResolve = require('rollup-plugin-node-resolve');
const commonjs = require('rollup-plugin-commonjs');
const replace = require('rollup-plugin-replace');
const postcss = require('rollup-plugin-postcss');
const log = require('./utils/log');
const parseGlobals = require('./utils/parseGlobals');
const isLerna = require('./utils/isLerna');

const env = process.env.NODE_ENV;

function build(dir, opts = {}) {
    const { cwd, watch, globals = {} } = opts;
    assert(dir.charAt(0) !== '/', `dir should be relative`);
    assert(cwd, `opts.cwd should be supplied`);
    
    const pkgPath = join(cwd, dir, 'package.json');
    assert(existsSync(pkgPath), 'package.json should exist');

    const inputOptions = {
        external: ['react', 'react-dom', ...Object.keys(global)],
        plugins: [
            nodeResolve({
                jsnext: true,
            }),
            replace({
                'process.env.NODE_ENV': JSON.stringify(env),
            }),
            commonjs(),
            postcss({
                extract: true
            }),
        ]
    }

    const outputOptions = {
        format: 'umd',
        extend: true,
        globals: {
          'react': 'React',
          'react-dom': 'ReactDOM',
          ...globals,
        },    
    }

    const pkg = require(pkgPath);
    const { rollupFiles = [] } = pkg.qmdTool || {};

    async function transform() {
        for (let rollupFile of rollupFiles) { // 每个文件都要走一遍rollup
            const [file, config = {}] = rollupFile;
            log.info(`build ${file}`);
            const input = {
                ...inputOptions,
                input: join(dir, file)
            };
            const output = {
                ...outputOptions,
                file: join(dir, file.replace(/\.js$/, '.umd.js')),
                name: config.name,
            }
            if (watch) {
                const watcher = rollup.watch({
                    ...input,
                    output,
                });
                watcher.on('event', event => {
                    log.info(`watch ${event.code}`)
                });
            } else {
                const bunlde = await rollup.rollup(input);
                await bunlde.write(output);
            }
        }
    }

    transform();
}


// 开始
const args = yParser(process.argv.slice(2));
const watch = args.w || args.watch;
const globals = parseGlobals(args.g || args.globals || ''); // 解析需要排除在外的全局变量,比如jquery, lodash
const cwd = process.cwd();
if (isLerna(cwd)) {
    const dirs = readdirSync(join(cwd, 'packages'));
    dirs.forEach(pkg => {
        if (pkg.charAt(0) === '.') return;
        build(`./packages/${pkg}`, {
            watch,
            cwd,
            globals,
        })
    })
} else {
    build('./', {
        watch,
        cwd,
        globals,
    })
}