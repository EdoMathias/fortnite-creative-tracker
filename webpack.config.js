const
    path = require('path'),
    HtmlWebpackPlugin = require('html-webpack-plugin'),
    CopyPlugin = require("copy-webpack-plugin"),
    { CleanWebpackPlugin } = require('clean-webpack-plugin'),
    OverwolfPlugin = require('./overwolf.webpack');

module.exports = env => ({
    entry: {
        background: './src/main/background.ts',
        tracker_desktop: './src/renderer/tracker/tracker.tsx',
        tracker_ingame: './src/renderer/tracker/tracker.tsx'
    },
    devtool: 'inline-source-map',
    module: {
        rules: [
            {
                test: /\.tsx?$/,
                use: 'ts-loader',
                exclude: /node_modules/
            },
            {
                test: /\.css$/,
                use: [
                    'style-loader',
                    {
                        loader: 'css-loader',
                        options: {
                            url: {
                                filter: (url, resourcePath) => {
                                    // Don't process URLs for window control SVGs
                                    // These are already copied by CopyPlugin to dist/img/
                                    if (url.includes('img/window_') || url.includes('../../public/img/') || url.startsWith('img/')) {
                                        return false;
                                    }
                                    return true;
                                }
                            }
                        }
                    }
                ]
            }
        ]
    },
    resolve: {
        extensions: ['.tsx', '.ts', '.js']
    },
    output: {
      path: path.resolve(__dirname, 'dist/'),
      filename: 'js/[name].js'
    },
    plugins: [
        new CleanWebpackPlugin,
        new CopyPlugin({
            patterns: [ { from: "public", to: "./" } ],
        }),
        new HtmlWebpackPlugin({
            template: './src/main/background.html',
            filename: path.resolve(__dirname, './dist/background.html'),
            chunks: ['background']
        }),
        new HtmlWebpackPlugin({
            template: './src/renderer/tracker/tracker.html',
            filename: path.resolve(__dirname, './dist/tracker_desktop.html'),
            chunks: ['tracker_desktop']
        }),
        new HtmlWebpackPlugin({
            template: './src/renderer/tracker/tracker.html',
            filename: path.resolve(__dirname, './dist/tracker_ingame.html'),
            chunks: ['tracker_ingame']
        }),
        new HtmlWebpackPlugin({
            template: './src/renderer/tracker/uninstall.html',
            filename: path.resolve(__dirname, './dist/uninstall.html'),
            chunks: []
        }),
        new OverwolfPlugin(env)
    ]
})
