/**
 * 获取 babel配置
 * @param {*} isBrowser 浏览器环境还是node环境
 */
function getBabelConfig(isBrowser) {
    const targets = isBrowser ? {browsers: ['last 2 versions', 'IE 10']} : {node: 6};
    return {
        presets: [
            [
                require.resolve('@babel/preset-typescript'), // ts预设
                {},
            ],
            [
                require.resolve('@babel/preset-env'), // 官方推荐的env预设
                {
                  targets,
                  ...(isBrowser ? { modules: false } : {}),
                },
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
}

module.exports = getBabelConfig;
