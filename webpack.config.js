const path = require('path');

module.exports = {
    entry: './src/tiff.js',
    output: {
        path: path.join(__dirname, 'dist'),
        filename: 'tiff.bundle.js',
        globalObject: 'this',
        library: {
            name: 'tiff',
            type: 'umd'
        }
    },
    mode: 'development'
};