export const IOS_BUNDLE_ID = "app.limitlesscoaching";
export const APP_UNIVERSAL_LINK_HOST = "limitlesscoaching.app";

export const APP_UNIVERSAL_LINK_HOSTS = [
  APP_UNIVERSAL_LINK_HOST,
  `www.${APP_UNIVERSAL_LINK_HOST}`,
] as const;
