import { options } from ".";

export function logDebug(message: string) {
  if (options.debug) {
    console.debug(message);
  }
}
export function logVerbose(message: string) {
  if (options.verbose || options.debug) {
    console.log(message);
  }
}
export function logError(message: string) {
  console.error(message);
}
export function logInfo(message: string) {
  console.log(message);
}
export function logWarning(message: string) {
  console.warn(message);
}
