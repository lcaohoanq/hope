const { getDefaultConfig } = require("expo/metro-config");
const path = require("node:path");

const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, "../..");

/** @type {import('expo/metro-config').MetroConfig} */
const config = getDefaultConfig(projectRoot);

config.watchFolders = [workspaceRoot];
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, "node_modules"),
  path.resolve(workspaceRoot, "node_modules"),
];
config.resolver.disableHierarchicalLookup = true;

const defaultResolveRequest = config.resolver.resolveRequest;
config.resolver.resolveRequest = (context, moduleName, platform) => {
  if (moduleName === "react-native/Libraries/Renderer/shims/ReactNative") {
    return {
      type: "sourceFile",
      filePath: path.resolve(projectRoot, "metro-shims/ReactNative.js"),
    };
  }
  if (defaultResolveRequest) {
    return defaultResolveRequest(context, moduleName, platform);
  }
  return context.resolveRequest(context, moduleName, platform);
};

// Keep server packages out of the mobile bundle.
config.resolver.blockList = [
  ...(Array.isArray(config.resolver.blockList)
    ? config.resolver.blockList
    : config.resolver.blockList
      ? [config.resolver.blockList]
      : []),
  new RegExp(
    `${path.resolve(workspaceRoot, "packages/core").replace(/[/\\]/g, "[/\\\\]")}[/\\\\].*`,
  ),
  new RegExp(`${path.resolve(workspaceRoot, "packages/db").replace(/[/\\]/g, "[/\\\\]")}[/\\\\].*`),
  new RegExp(
    `${path.resolve(workspaceRoot, "apps/api/src").replace(/[/\\]/g, "[/\\\\]")}[/\\\\].*`,
  ),
];

module.exports = config;
