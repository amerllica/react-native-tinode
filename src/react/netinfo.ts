export interface NetInfoStateLike {
  isConnected: boolean | null;
}

export interface NetInfoLike {
  addEventListener(listener: (state: NetInfoStateLike) => void): () => void;
}

export function subscribeToNetwork(
  onOnline: () => void,
  netInfo: NetInfoLike | null | undefined
): () => void {
  if (!netInfo) {
    return () => {};
  }
  let wasConnected: boolean | null = null;
  return netInfo.addEventListener(({ isConnected }) => {
    if (isConnected && wasConnected === false) {
      onOnline();
    }
    wasConnected = isConnected;
  });
}
