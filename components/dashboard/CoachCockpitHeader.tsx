"use client";

type CoachCockpitHeaderProps = {
  fullName: string;
};

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return "Goedemorgen";
  if (hour < 18) return "Goedemiddag";
  return "Goedenavond";
}

function firstName(fullName: string) {
  return fullName.split(/\s+/)[0] || fullName || "Coach";
}

export default function CoachCockpitHeader({ fullName }: CoachCockpitHeaderProps) {
  return (
    <header className="dashboard-greeting-header">
      <h1 className="text-[26px] font-semibold tracking-tight text-app-text md:text-[31px] md:leading-[1.1]">
        {getGreeting()}, {firstName(fullName)}
      </h1>
    </header>
  );
}
