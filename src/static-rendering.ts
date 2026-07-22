let globalIsUsingStaticRendering = false;

export function enableStaticRendering(enable: boolean): void {
  globalIsUsingStaticRendering = enable;
}

export function isUsingStaticRendering(): boolean {
  return globalIsUsingStaticRendering;
}
