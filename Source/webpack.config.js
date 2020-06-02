const path = require('path');
const webpack = require('webpack');
const CopyWebpackPlugin = require('copy-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const ngAnnotatePlugin = require('ng-annotate-webpack-plugin');

const conf = {
  target: 'node',
  context: path.join(__dirname, 'src'),
  entry: {
    module: './module.ts',
  },
  output: {
    filename: '[name].js',
    path: path.join(__dirname, '../Build/Output/Debug/dist'),
    libraryTarget: 'amd',
  },
   externals: [
  {
    // remove the line below if you don't want to use buildin versions
        jquery: 'jquery',
	    lodash: 'lodash', 
        moment: 'moment',

	},
    function(context, request, callback) {
      var prefix = 'grafana/';
      if (request.indexOf(prefix) === 0) {
        return callback(null, request.substr(prefix.length));
      }
      callback();
    }
  ],
  plugins: [
    new CleanWebpackPlugin('../Build/Output/Debug/dist', { allowExternal: true }),
    new webpack.optimize.OccurrenceOrderPlugin(),
    new CopyWebpackPlugin([
      { from: 'plugin.json', to: '.' },
      { from: '../../docs/README.md', to: '.' },
      { from: 'partials/*', to: '.' },
      { from: 'images/*', to: '.' },
      { from: 'css/*', to: '.' },
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
  optimization: {
		// We no not want to minimize our code.
		minimize: false
	}
};

module.exports = (env, argv) => {

	  if (argv.mode === 'development') {
		return conf;
	  }

	  if (argv.mode === 'production') {
	  
	  conf.output.path = path.join(__dirname, '../Build/Output/Release/dist');
	conf.plugins[0] = new CleanWebpackPlugin('../Build/Output/Release/dist', { allowExternal: true });
	conf.plugins.push(new ngAnnotatePlugin());
    return conf;
  }

  return conf;
};