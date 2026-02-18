const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '..');

const config = getDefaultConfig(projectRoot);

// Watch the workspace root for changes in the library source
config.watchFolders = [workspaceRoot];

// Ensure Metro resolves modules from both the example app and the workspace root
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// Make sure symlinked packages resolve their peer dependencies from the example app
config.resolver.unstable_enableSymlinks = true;

// Prevent duplicate React / React Native packages by blocking them from the workspace root
config.resolver.blockList = [
  new RegExp(
    path.resolve(workspaceRoot, 'node_modules', 'react-native', '.*').replace(/[/\\]/g, '[/\\\\]')
  ),
  new RegExp(
    path.resolve(workspaceRoot, 'node_modules', 'react', '.*').replace(/[/\\]/g, '[/\\\\]')
  ),
];

// Ensure react and react-native always resolve from the example app's node_modules
config.resolver.extraNodeModules = {
  react: path.resolve(projectRoot, 'node_modules', 'react'),
  'react-native': path.resolve(projectRoot, 'node_modules', 'react-native'),
};

module.exports = config;