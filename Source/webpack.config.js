const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const ngAnnotatePlugin = require('ng-annotate-webpack-plugin');
const UglifyJSPlugin = require('uglifyjs-webpack-plugin');


const conf = {
  node: {
    fs: 'empty',
  },
  context: path.join(__dirname, 'src'),
  entry: {
    module: './module.ts',
  },
  devtool: 'source-map',
  output: {
    filename: '[name].js',
    path: path.join(__dirname, '../Build/Output/Debug/dist'),
    libraryTarget: 'amd',
  },
  externals: [
    'lodash',
    'moment',
    'jquery',
    function(context, request, callback) {
      var prefix = 'grafana/';
      if (request.indexOf(prefix) === 0) {
        return callback(null, request.substr(prefix.length));
      }
      callback();
    },
  ],
  plugins: [
    new CleanWebpackPlugin('../Build/Output/Debug/dist', { allowExternal: true }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new CopyWebpackPlugin([
      { from: 'plugin.json', to: '.' },
      { from: '../../docs/README.md', to: '.' },
      { from: '../../LICENSE', to: '.' },
      { from: 'partials/*', to: '.' },
      { from: 'images/*', to: '.' },
      { from: 'css/*', to: '.' },
      { from: 'data/*', to: '.' },
    ]),
  ],
  resolve: {
    extensions: ['.ts', '.js'],
  },
  module: {
    rules: [
      {
        test: /\.(png|jpg|gif|svg|ico)$/,
        loader: 'file-loader',
        query: {
          outputPath: './images/',
          name: '[name].[ext]',
        },
      },
      {
        test: /\.tsx?$/,
        loaders: [
          {
            loader: 'babel-loader',
            options: { presets: ['env'] },
          },
          'ts-loader',
        ],
        exclude: /node_modules/,
      },
      {
        test: /\.css$/,
        use: [
          {
            loader: 'style-loader',
          },
          {
            loader: 'css-loader',
            options: {
              importLoaders: 1,
              sourceMap: true,
            },
          }
        ],
      },
    ],
  },
};

module.exports = (env, argv) => {

	  if (argv.mode === 'development') {
		return conf;
	  }

	  if (argv.mode === 'production') {
	  
	  conf.output.path = path.join(__dirname, '../Build/Output/Release/dist');
	conf.plugins[0] = new CleanWebpackPlugin('../Build/Output/Release/dist', { allowExternal: true });
	conf.plugins.push(new ngAnnotatePlugin());
	conf.plugins.push(
	  new UglifyJSPlugin({
		sourceMap: true,
	  })
	);

    return conf;
  }

  return conf;
};