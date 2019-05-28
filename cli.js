#!/usr/bin/env node

const argsParser = require('yargs-parser');
const singal = require('signale');

const args = argsParser(process.argv.slice(2));

if (args.v || args.version) {
    // 如果是获取版本信息
    console.log(require('./package.json').version);
    process.exit(0);
}

switch(args._[0]) {
    case 'build':
    case 'rollup':
        require(`./src/${args._}`);
        break;
    default:
        singal.error(`unknown command ${args._}`);
        break;
}