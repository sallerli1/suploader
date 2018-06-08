const path = require('path')

module.exports = {
    context: path.resolve(__dirname, '../'),
    entry: {
      app: ['babel-polyfill', './src/index.js']
    },
    output: {
      path: path.resolve('../dist'),
      filename: 'file-upload.js'
    },
    module: {
        rules: [{
            test: /\.js$/,
            loader: 'babel-loader',
            include: [
              path.resolve('../src'),
              path.resolve('../test')
            ]}
        ]
    }

}