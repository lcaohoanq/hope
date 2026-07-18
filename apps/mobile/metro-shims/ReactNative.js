/**
 * RN 0.86 removed Libraries/Renderer/shims/ReactNative.
 * react-native-gesture-handler still imports it; map to Fabric shim.
 */
export { default } from "react-native/Libraries/Renderer/shims/ReactFabric";
