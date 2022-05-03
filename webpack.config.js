const nodeExternals = require('webpack-node-externals');

module.exports = {
    mode: 'production',
    entry: './src/main.ts',
    target: 'node',
    module: {
        rules: [
            {
                test: /\.ts$/,
                exclude: /mode_modules/,
                use: [{
                    loader: 'ts-loader'
                }]
            }
        ]
    },
    resolve: {
        extensions: [
            '.ts', '.js'
        ],
        modules: ['node_modules']
    },
    externals: [
        nodeExternals()
    ]
};
