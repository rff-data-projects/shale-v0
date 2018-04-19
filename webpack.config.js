const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const webpack = require('webpack');

module.exports = {
	entry: {
      	app: './src/index.js'
    },
    devtool: 'inline-source-map', // may be too slow an option; set to another if so
    devServer: {
  		contentBase: './dist',
  		hot: true
    },
    mode: 'development',
    module: {
    	rules: [
	       	{
	        	test: /\.scss$/,
	         	use: [{
	         		loader: 'style-loader'
	         	},{
	         		loader: 'css-loader',
	         		options: {
	         			modules: true,
	         			localIdentName: '[name]_[local]__[hash:base64:5]',
	         			sourceMap: true
	         		}
	         	},{
	         		loader: 'sass-loader',
	         		options: {
	         			sourceMap: true
	         		}
	         	}]
	        },
	        {
			      test: /\.js$/,
			      exclude: /node_modules/,
			      use: ['eslint-loader']
		    }
     	]
   },
    plugins: [
    	new CleanWebpackPlugin(['dist']),
    	new HtmlWebpackPlugin({
    		title: 'Shale Research Clearinghouse',
    		inject: false,
		    template: require('html-webpack-template'),
		}),
    // 	new webpack.NamedModulesPlugin(),
    	new webpack.HotModuleReplacementPlugin()
    ],
  	output: {
    	filename: '[name].bundle.js',
    	path: path.resolve(__dirname, 'dist')
  	}
};