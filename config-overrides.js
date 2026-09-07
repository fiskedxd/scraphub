const webpack = require('webpack');

function override(config, env) {
  config.resolve.fallback = {
    ...config.resolve.fallback,
    "fs": false,
    "path": require.resolve("path-browserify"),
    "crypto": require.resolve("crypto-browserify"),
    "stream": require.resolve("stream-browserify"),
    "buffer": require.resolve("buffer/"),
    "vm": require.resolve("vm-browserify")
  };
  
  config.plugins = [
    ...config.plugins,
    new webpack.ProvidePlugin({
      Buffer: ['buffer', 'Buffer'],
    }),
  ];

  if (env === 'production') {
    config.devtool = false;
    config.optimization = {
      ...config.optimization,
      minimize: true
    };
  }
  
  return config;
}

module.exports = {
  webpack: override,
  devServer: function (configFunction) {
    return function (proxy, allowedHost) {
      const config = configFunction(proxy, allowedHost);
      const ignored = ['**/node_modules/**', '**/uploads/**', '**/public/uploads/**'];
      const applyWatchIgnore = (staticEntry) => {
        if (!staticEntry || typeof staticEntry === 'string') return staticEntry;
        return {
          ...staticEntry,
          watch: {
            ...(typeof staticEntry.watch === 'object' ? staticEntry.watch : {}),
            ignored
          }
        };
      };
      if (Array.isArray(config.static)) {
        config.static = config.static.map(applyWatchIgnore);
      } else if (config.static) {
        config.static = applyWatchIgnore(config.static);
      }
      return config;
    };
  }
};