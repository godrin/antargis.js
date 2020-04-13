const path = require('path');

module.exports = {
    entry: './src/index.js',
    output: {
        filename: 'index.js',
        path: path.resolve(__dirname, 'dist'),
    },
    module: {
        rules: [
            {
                test: /\.s[ac]ss$/,
                /*
                use: [
                    'style-loader',
                    'css-loader',
                    'sass-loader'
                ],*/
                use: [
                    // https://florianbrinkmann.com/sass-webpack-4849/
                    // damit ein separates css file rausfällt
                    {
                        loader: 'file-loader',
                        options: {
                            name: '[name].css',
                            outputPath: '.'
                        }
                    },
                    {
                        loader: 'extract-loader'
                    },
                    {
                        loader: 'css-loader'
                    },
                    {
                        loader: 'postcss-loader'
                    },
                    {
                        loader: 'sass-loader'
                    }
                ]
            },
        ],
    },
};
