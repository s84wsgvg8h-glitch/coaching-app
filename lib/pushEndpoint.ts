export const IOS_PUSH_ENDPOINT_PREFIX = "ios:";

export function isIosPushEndpoint(endpoint: string): boolean {
  return endpoint.startsWith(IOS_PUSH_ENDPOINT_PREFIX);
}

export function toIosPushEndpoint(deviceToken: string): string {
  return `${IOS_PUSH_ENDPOINT_PREFIX}${deviceToken}`;
}

export function iosTokenFromEndpoint(endpoint: string): string {
  return endpoint.slice(IOS_PUSH_ENDPOINT_PREFIX.length);
}
