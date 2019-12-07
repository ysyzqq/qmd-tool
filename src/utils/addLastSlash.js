function addLastSlash(path) {
    return path.slice(-1) === '/' ? path : `${path}/`;
}

module.exports = addLastSlash;