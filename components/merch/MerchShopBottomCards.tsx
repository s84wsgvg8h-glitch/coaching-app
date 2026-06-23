"use client";

import type { LucideIcon } from "lucide-react";
import { Medal, Megaphone, Percent, Users } from "lucide-react";

type BottomCard = {
  icon: LucideIcon;
  iconClass: string;
  bgClass: string;
  title: string;
  description: string;
};

const CARDS: BottomCard[] = [
  {
    icon: Users,
    iconClass: "text-sky-300",
    bgClass: "bg-sky-500/10",
    title: "Teambestellingen",
    description:
      "Zet één shirt op concept en deel het pas live als het team compleet wil bestellen.",
  },
  {
    icon: Percent,
    iconClass: "text-emerald-300",
    bgClass: "bg-emerald-500/10",
    title: "Teamkorting",
    description:
      "Verlaag de prijs tijdelijk voor je atleten door het bedrag per product aan te passen.",
  },
  {
    icon: Medal,
    iconClass: "text-amber-300",
    bgClass: "bg-amber-500/10",
    title: "Wedstrijd merch",
    description:
      "Maak wedstrijd-specifieke producten en zet ze live in aanloop naar een meet.",
  },
  {
    icon: Megaphone,
    iconClass: "text-violet-300",
    bgClass: "bg-violet-500/10",
    title: "Promoot de shop",
    description:
      "Deel een broadcast in de chat zodra een nieuw product live staat in de shop.",
  },
];

export default function MerchShopBottomCards() {
  return (
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
      {CARDS.map((card) => (
        <article
          key={card.title}
          className="rounded-2xl border border-app-border/80 bg-[#161B22]/80 p-4"
        >
          <div
            className={`mb-3 flex h-9 w-9 items-center justify-center rounded-xl ${card.bgClass}`}
          >
            <card.icon className={`h-5 w-5 ${card.iconClass}`} />
          </div>
          <p className="text-[13px] font-semibold text-app-text">{card.title}</p>
          <p className="mt-1 text-[12px] leading-relaxed text-app-muted">
            {card.description}
          </p>
        </article>
      ))}
    </div>
  );
}
