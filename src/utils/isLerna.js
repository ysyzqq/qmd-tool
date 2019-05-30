/**
 * 判断是否是lerna项目
 * @param {*} cwd 
 */
const {existsSync} = require('fs');
const {join} = require('path');

function isLerna(cwd) {
    return existsSync(join(cwd, 'lerna.json'))
}

module.exports = isLerna;