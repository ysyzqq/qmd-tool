const {join} = require('path')
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



module.exports = function getWebpackConfig(opts = {}) {
    const {cwd} = opts;
    return {
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
        },
        resolve: {
            extensions: ['.js', '.jsx', '.ts', '.tsx']
        }
    }
}