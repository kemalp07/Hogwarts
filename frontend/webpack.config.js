const createExpoWebpackConfigAsync = require('@expo/webpack-config');

module.exports = async function (env, argv) {
  const config = await createExpoWebpackConfigAsync(env, argv);

  // Ensure hot reload / live reload is enabled and disable aggressive caching
  if (!config.devServer) config.devServer = {};
  config.devServer.hot = true;
  config.devServer.liveReload = true;
  config.devServer.historyApiFallback = true;
  config.devServer.headers = Object.assign({}, config.devServer.headers, {
    'Cache-Control': 'no-store, no-cache, must-revalidate, proxy-revalidate',
    Pragma: 'no-cache',
    Expires: '0',
    'Surrogate-Control': 'no-store',
  });

  // Watch more aggressively for changes (helps on some Windows setups)
  config.devServer.watchOptions = Object.assign({}, config.devServer.watchOptions, {
    ignored: /node_modules/,
    aggregateTimeout: 200,
    poll: 1000,
  });

  return config;
};
