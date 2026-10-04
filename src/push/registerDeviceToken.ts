export interface DeviceTokenTarget {
  setDeviceToken(token: string | null): boolean;
}

export function registerDeviceToken(
  client: DeviceTokenTarget,
  token: string | null
): boolean {
  return client.setDeviceToken(token);
}
