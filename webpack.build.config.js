const path = require('path');
const HtmlWebpackPlugin = require('html-webpack-plugin');
const CleanWebpackPlugin = require('clean-webpack-plugin');
const webpack = require('webpack');
const MiniCssExtractPlugin = require("mini-css-extract-plugin");

module.exports = {
	entry: {
      	'js/index': './src/index.js'
    },
    devtool: 'inline-source-map', // may be too slow an option; set to another if so
    mode: 'production',
    module: {
    	rules: [
	       	{
	        	test: /\.scss$/,
	         	use: [{
	         		loader: MiniCssExtractPlugin.loader,
	         	},{
         			loader: 'css-loader',
	         		options: {
	         			modules: true,
	         			localIdentName: '[name]_[local]__[hash:base64:5]',
	         			sourceMap: true,
	         			minimize: true,
	         			importLoaders: 1		
	         		}
	         	},{
	         		loader: 'postcss-loader',
	         		options: {
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
			      use: ['babel-loader','eslint-loader']
		    }
     	]
   },
    plugins: [
    	new CleanWebpackPlugin(['dist']),
    	new HtmlWebpackPlugin({
    		title: 'Output Management',
    		inject: false,
		    template: require('html-webpack-template'),
		}),
     	new MiniCssExtractPlugin({
	      // Options similar to the same options in webpackOptions.output
	      // both options are optional
	      filename: "css/styles.css",
	      chunkFilename: "[id].css",
	    })
    ],
  	output: {
    	filename: '[name].js',
    	path: path.resolve(__dirname, 'dist')
  	}
};