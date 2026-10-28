import type { ReactNode } from "react";

type AthleteRouteLoadingShellProps = {
  children: ReactNode;
  /** Hide bottom nav skeleton (e.g. chat detail) */
  hideBottomNav?: boolean;
  /** Hide top bar skeleton (e.g. leaderboard) */
  hideMobileTopBar?: boolean;
};

export default function AthleteRouteLoadingShell({
  children,
  hideBottomNav = false,
  hideMobileTopBar = false,
}: AthleteRouteLoadingShellProps) {
  return (
    <div
      className={`athlete-route-loading-shell mobile-page-shell${
        hideBottomNav ? "" : " mobile-page-shell--reserve-bottom-nav"
      }`}
    >
      {hideMobileTopBar ? (
        <div className="mobile-safe-top bg-app-bg" aria-hidden="true" />
      ) : (
        <div className="mobile-page-shell__header">
          <div className="athlete-route-loading-topbar" aria-hidden="true">
            <div className="athlete-route-loading-bar athlete-route-loading-bar--title" />
            <div className="flex gap-2">
              <div className="athlete-route-loading-bar athlete-route-loading-bar--icon" />
              <div className="athlete-route-loading-bar athlete-route-loading-bar--chip" />
            </div>
          </div>
        </div>
      )}
      <div className="mobile-page-shell__body app-page-content px-2">{children}</div>
      {!hideBottomNav ? (
        <nav className="athlete-mobile-tab-bar athlete-route-loading-tabbar" aria-hidden="true">
          <div className="grid grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="athlete-route-loading-tab">
                <div className="athlete-route-loading-bar athlete-route-loading-bar--tab-icon" />
                <div className="athlete-route-loading-bar athlete-route-loading-bar--tab-label" />
              </div>
            ))}
          </div>
        </nav>
      ) : null}
    </div>
  );
}
