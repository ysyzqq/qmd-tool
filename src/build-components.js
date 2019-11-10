//使用webpack对组件进行打包

const yParser = require('yargs-parser');
const { join, resolve } = require('path');
const { existsSync, statSync, readdirSync } = require('fs');
const assert = require('assert');
const log = require('./utils/log');
const slash = require('slash2');
const chalk = require('chalk');
const rimraf = require('rimraf');
const globby = require('globby');
const webpack = require('webpack');
const cwd = process.cwd();
const postcssPresetEnv = require('postcss-preset-env');

const BabelOption = {
    presets: [
        [
            require.resolve('@babel/preset-typescript'), // ts预设
            {},
        ],
        [
            require.resolve('@babel/preset-env'), // 官方推荐的env预设
        ],
        require.resolve('@babel/preset-react')
        // ...(isBrowser ? [require.resolve('@babel/preset-react')] : []), // 浏览器环境加入react预设
    ],
    plugins: [
        require.resolve('@babel/plugin-proposal-export-default-from'),
        require.resolve('@babel/plugin-proposal-do-expressions'),
        require.resolve('@babel/plugin-proposal-class-properties'),
    ]
}
function build(dir, opts = {}) {
    const { cwd } = opts;
    const inputPath = join(cwd, 'components', dir);
    const outputPath = join(cwd, 'antd', dir);
    const entries = globby.sync(
        [
            `${inputPath}/**/*.(js|jsx|ts|tsx)`,
            `!${inputPath}/__tests__`,
            `!${inputPath}/demo`
        ],
        {

        }
    ).reduce((memo, cur) => {
        return { ...memo, [cur.replace(`${inputPath}/`, '')]: cur }
    }, {})
    const compiler = webpack({
        entry: entries,
        mode: 'production',
        output: {
            path: outputPath,
            filename: '[name].js'
        },
        module: {
            rules: [
                {
                    test: /\.(js|jsx)$/,
                    loader: 'babel-loader',
                    options: BabelOption,
                    exclude: /node_modules/,
                },
                {
                    test: /\.(ts|tsx)$/,
                    use: [
                        {
                            loader: 'babel-loader',
                            options: BabelOption,
                        },
                        {
                            loader: 'ts-loader',
                            options: {
                                configFile: join(cwd, 'tsconfig.json'),
                            }
                        }
                    ],
                    exclude: /node_modules/,
                },
                {
                    test: /\.(css|less)$/,
                    exclude: /node_modules/,
                    use: [{
                        loader: 'style-loader'
                    },
                    {
                        loader: 'css-loader',
                        options: {
                            sourceMap: true,
                            modules: { // 适配css-loader2
                                localIdentName: '[local].[hash:8]'
                            },
                        }
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            ident: 'postcss',
                            plugins: () => [postcssPresetEnv()]
                        }
                    },
                    {
                        loader: 'less-loader',
                        options: {
                            javascriptEnabled: true
                        }
                    }
                    ]
                },
                {
                    test: /\.(css|less)$/,
                    include: /node_modules/,
                    use: [{
                        loader: 'style-loader'
                    },
                    {
                        loader: 'css-loader',
                        options: {}
                    },
                    {
                        loader: 'postcss-loader',
                        options: {
                            ident: 'postcss',
                            plugins: () => [postcssPresetEnv()]
                        }
                    },
                    {
                        loader: 'less-loader',
                        options: {
                            javascriptEnabled: true,
                        }
                    }
                    ]
                },
                {
                    test: /\.svg(\?v=\d+\.\d+\.\d+)?$/,
                    use: [
                        {
                            loader: 'babel-loader'
                        },
                        {
                            loader: '@svgr/webpack',
                            options: {
                                babel: false,
                                icon: true
                            }
                        }
                    ]
                },
                {
                    test: /\.(png|svg|jpe?g|gif)$/i,
                    use: [{
                        loader: 'file-loader',
                        options: {
                            limit: 500,
                            outputPath: 'public/images/',
                            name: '[name].[hash:8].[ext]'
                        }
                    }]
                },
                {
                    test: /\.md$/,
                    use: [
                        {
                            loader: "html-loader"
                        },
                        {
                            loader: "markdown-loader",
                            options: {
                                /* your options here */
                            }
                        }
                    ]
                },
                {
                    test: /\.(woff|woff2|eot|ttf|otf)$/,
                    use: [
                        'file-loader'
                    ]
                }
            ]
        },
        externals: {
            'react': 'react',
            'react-dom': 'react-dom'
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
        }

        if (stats.hasWarnings()) {
            console.warn(info.warnings);
        }
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
