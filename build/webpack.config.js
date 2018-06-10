const path = require('path')

module.exports = {
    mode: 'development',
    context: path.resolve(__dirname, '../'),
    entry: {
      app: ['babel-polyfill', './src/index.js']
    },
    //entry: './src/index.js',
    output: {
      path: path.resolve('./dist'),
      filename: 'bundle.js'
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
    },
    devtool: 'cheap-module-eval-source-map'
}