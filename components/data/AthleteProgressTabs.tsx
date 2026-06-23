import Link from "next/link";

type AthleteProgressTab = "data" | "video";

export default function AthleteProgressTabs({
  active,
}: {
  active: AthleteProgressTab;
}) {
  const tabs: Array<{ id: AthleteProgressTab; href: string; label: string }> = [
    { id: "data", href: "/data", label: "Voortgang" },
    { id: "video", href: "/video-gallery", label: "Video's" },
  ];

  return (
    <div className="mb-6 -mx-1 overflow-x-auto px-1 scrollbar-none">
      <div className="inline-flex min-w-full gap-1 rounded-xl bg-app-surface p-1 shadow-sm sm:flex-wrap">
      {tabs.map((tab) => (
        <Link
          key={tab.id}
          href={tab.href}
          className={`rounded-lg px-4 py-2 text-sm font-bold transition ${
            active === tab.id
              ? "bg-app-text text-app-bg"
              : "text-app-muted hover:bg-app-bg"
          }`}
        >
          {tab.label}
        </Link>
      ))}
      </div>
    </div>
  );
}
