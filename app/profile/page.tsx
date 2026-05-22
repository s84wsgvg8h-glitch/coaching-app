"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabaseClient";

type DashboardLink = {
  href?: string;
  icon: string;
  title: string;
  description?: string;
  badge?: number;
};

type BodyArea = {
  id: string;
  label: string;
  side: "front" | "back";
  path: string;
  labelX: number;
  labelY: number;
};

const bodyAreas: BodyArea[] = [
  { id: "front-left-shoulder", label: "Left shoulder", side: "front", labelX: 126, labelY: 138, path: "M94 128 C108 108 136 101 158 119 C150 145 130 163 103 168 C93 160 88 144 94 128 Z" },
  { id: "front-right-shoulder", label: "Right shoulder", side: "front", labelX: 254, labelY: 138, path: "M286 128 C272 108 244 101 222 119 C230 145 250 163 277 168 C287 160 292 144 286 128 Z" },

  { id: "front-left-chest", label: "Left chest", side: "front", labelX: 160, labelY: 188, path: "M124 157 C141 134 176 129 189 150 L189 223 C152 222 124 202 119 176 C118 166 120 161 124 157 Z" },
  { id: "front-right-chest", label: "Right chest", side: "front", labelX: 220, labelY: 188, path: "M256 157 C239 134 204 129 191 150 L191 223 C228 222 256 202 261 176 C262 166 260 161 256 157 Z" },

  { id: "front-left-arm", label: "Left arm", side: "front", labelX: 83, labelY: 279, path: "M92 159 C70 178 59 224 57 277 C55 319 61 374 73 421 C79 444 97 439 100 417 C96 376 97 333 105 292 C114 244 118 191 92 159 Z" },
  { id: "front-right-arm", label: "Right arm", side: "front", labelX: 297, labelY: 279, path: "M288 159 C310 178 321 224 323 277 C325 319 319 374 307 421 C301 444 283 439 280 417 C284 376 283 333 275 292 C266 244 262 191 288 159 Z" },

  { id: "front-left-abs", label: "Left abs", side: "front", labelX: 166, labelY: 303, path: "M145 224 C158 221 177 221 189 224 L189 394 C171 395 149 384 142 362 C134 319 134 263 145 224 Z" },
  { id: "front-right-abs", label: "Right abs", side: "front", labelX: 214, labelY: 303, path: "M235 224 C222 221 203 221 191 224 L191 394 C209 395 231 384 238 362 C246 319 246 263 235 224 Z" },

  { id: "front-groin", label: "Groin", side: "front", labelX: 190, labelY: 425, path: "M145 391 C164 409 216 409 235 391 C229 432 211 464 190 493 C169 464 151 432 145 391 Z" },

  { id: "front-left-quad", label: "Left quad", side: "front", labelX: 148, labelY: 555, path: "M139 430 C116 489 109 588 116 671 C120 703 144 706 154 674 C168 609 182 527 187 470 C183 450 167 434 139 430 Z" },
  { id: "front-right-quad", label: "Right quad", side: "front", labelX: 232, labelY: 555, path: "M241 430 C264 489 271 588 264 671 C260 703 236 706 226 674 C212 609 198 527 193 470 C197 450 213 434 241 430 Z" },

  { id: "front-left-calf", label: "Left calf", side: "front", labelX: 138, labelY: 718, path: "M116 668 C106 708 105 759 111 800 C122 812 144 808 154 791 C155 749 151 708 146 668 Z" },
  { id: "front-right-calf", label: "Right calf", side: "front", labelX: 242, labelY: 718, path: "M264 668 C274 708 275 759 269 800 C258 812 236 808 226 791 C225 749 229 708 234 668 Z" },

  { id: "back-left-shoulder", label: "Left rear shoulder", side: "back", labelX: 126, labelY: 138, path: "M94 128 C108 108 136 101 158 119 C151 146 130 164 103 169 C93 160 88 144 94 128 Z" },
  { id: "back-right-shoulder", label: "Right rear shoulder", side: "back", labelX: 254, labelY: 138, path: "M286 128 C272 108 244 101 222 119 C229 146 250 164 277 169 C287 160 292 144 286 128 Z" },

  { id: "back-left-upper", label: "Left upper back", side: "back", labelX: 158, labelY: 220, path: "M124 158 C147 133 177 130 190 149 L190 333 C166 283 140 219 124 158 Z" },
  { id: "back-right-upper", label: "Right upper back", side: "back", labelX: 222, labelY: 220, path: "M256 158 C233 133 203 130 190 149 L190 333 C214 283 240 219 256 158 Z" },

  { id: "back-left-lat", label: "Left lat", side: "back", labelX: 145, labelY: 325, path: "M122 214 C145 260 166 317 184 382 C163 399 134 386 122 352 C110 307 110 256 122 214 Z" },
  { id: "back-right-lat", label: "Right lat", side: "back", labelX: 235, labelY: 325, path: "M258 214 C235 260 214 317 196 382 C217 399 246 386 258 352 C270 307 270 256 258 214 Z" },

  { id: "back-lower", label: "Lower back", side: "back", labelX: 190, labelY: 407, path: "M154 382 C168 396 212 396 226 382 C228 419 213 453 190 485 C167 453 152 419 154 382 Z" },

  { id: "back-left-glute", label: "Left glute", side: "back", labelX: 150, labelY: 498, path: "M136 455 C159 435 184 443 190 482 C182 530 148 548 117 521 C112 494 118 472 136 455 Z" },
  { id: "back-right-glute", label: "Right glute", side: "back", labelX: 230, labelY: 498, path: "M244 455 C221 435 196 443 190 482 C198 530 232 548 263 521 C268 494 262 472 244 455 Z" },

  { id: "back-left-hamstring", label: "Left hamstring", side: "back", labelX: 148, labelY: 625, path: "M126 523 C105 586 107 660 116 704 C123 735 148 732 157 701 C172 637 181 577 186 510 C168 532 145 536 126 523 Z" },
  { id: "back-right-hamstring", label: "Right hamstring", side: "back", labelX: 232, labelY: 625, path: "M254 523 C275 586 273 660 264 704 C257 735 232 732 223 701 C208 637 199 577 194 510 C212 532 235 536 254 523 Z" },

  { id: "back-left-calf", label: "Left calf", side: "back", labelX: 138, labelY: 720, path: "M116 689 C106 726 105 766 111 800 C122 812 144 808 154 791 C155 755 151 721 147 689 Z" },
  { id: "back-right-calf", label: "Right calf", side: "back", labelX: 242, labelY: 720, path: "M264 689 C274 726 275 766 269 800 C258 812 236 808 226 791 C225 755 229 721 233 689 Z" },
];

function HumanLineArt({ side }: { side: "front" | "back" }) {
  return (
    <g>
      <g fill="#f7f9fc" stroke="#222222" strokeWidth="2.6" strokeLinecap="round" strokeLinejoin="round">
        <path d="M190 20 C160 20 140 43 142 75 C144 101 158 119 171 130 L169 150 C153 156 136 163 119 178 C99 195 89 217 81 247 C69 286 64 331 66 382 C68 428 76 478 84 520 C91 554 114 557 126 537 C131 529 128 513 126 499 C120 456 120 414 127 371 C135 321 143 273 137 232 C150 231 160 225 170 216 C174 238 175 264 172 294 C168 338 156 386 142 433 C122 503 112 602 116 668 C108 701 105 759 106 801 C107 826 113 846 124 858 C140 866 162 858 169 842 C176 812 167 763 162 735 C165 667 178 580 188 517 C190 506 190 497 190 491 C190 497 190 506 192 517 C202 580 215 667 218 735 C213 763 204 812 211 842 C218 858 240 866 256 858 C267 846 273 826 274 801 C275 759 272 701 264 668 C268 602 258 503 238 433 C224 386 212 338 208 294 C205 264 206 238 210 216 C220 225 230 231 243 232 C237 273 245 321 253 371 C260 414 260 456 254 499 C252 513 249 529 254 537 C266 557 289 554 296 520 C304 478 312 428 314 382 C316 331 311 286 299 247 C291 217 281 195 261 178 C244 163 227 156 211 150 L209 130 C222 119 236 101 238 75 C240 43 220 20 190 20 Z" />
      </g>

      <g fill="none" stroke="#222222" strokeWidth="2.05" strokeLinecap="round" strokeLinejoin="round">
        {side === "front" ? (
          <>
            <path d="M126 184 C151 203 229 203 254 184" />
            <path d="M190 149 L190 491" />
            <path d="M123 232 C151 276 158 348 142 433" />
            <path d="M257 232 C229 276 222 348 238 433" />
            <path d="M146 253 C164 265 216 265 234 253" />
            <path d="M145 311 C164 325 216 325 235 311" />
            <path d="M149 370 C166 386 214 386 231 370" />
            <path d="M142 433 L190 491 L238 433" />
            <path d="M117 668 C131 690 147 690 162 668" />
            <path d="M218 668 C233 690 249 690 263 668" />
            <path d="M70 410 C63 425 54 433 42 439" />
            <path d="M310 410 C317 425 326 433 338 439" />
            <path d="M57 277 C45 306 36 333 27 357" />
            <path d="M323 277 C335 306 344 333 353 357" />
          </>
        ) : (
          <>
            <path d="M190 149 L190 491" />
            <path d="M124 185 C151 239 173 300 190 382 C207 300 229 239 256 185" />
            <path d="M122 214 C144 257 166 316 184 382" />
            <path d="M258 214 C236 257 214 316 196 382" />
            <path d="M143 433 C163 463 217 463 237 433" />
            <path d="M119 522 C151 548 177 535 190 491 C203 535 229 548 261 522" />
            <path d="M117 689 C131 707 147 707 162 689" />
            <path d="M218 689 C233 707 249 707 263 689" />
            <path d="M70 410 C63 425 54 433 42 439" />
            <path d="M310 410 C317 425 326 433 338 439" />
          </>
        )}
      </g>
    </g>
  );
}

function BodyDiagram({ side }: { side: "front" | "back" }) {
  const title = side === "front" ? "Front" : "Back";
  const areas = bodyAreas.filter((area) => area.side === side);
  const [hoveredArea, setHoveredArea] = useState<BodyArea | null>(null);

  return (
    <div className="flex flex-col items-center">
      <h2 className="mb-2 text-xl font-bold text-black">{title}</h2>

      <div className="relative h-[760px] w-[320px] overflow-visible">
        <svg viewBox="40 0 300 880" className="h-full w-full overflow-visible">
          <HumanLineArt side={side} />

          {areas.map((area) => (
            <g
              key={area.id}
              onMouseEnter={() => setHoveredArea(area)}
              onMouseLeave={() => setHoveredArea(null)}
              onFocus={() => setHoveredArea(area)}
              onBlur={() => setHoveredArea(null)}
              tabIndex={0}
              className="cursor-pointer outline-none"
            >
              <path
                d={area.path}
                fill="#ef4444"
                fillOpacity={hoveredArea?.id === area.id ? 0.9 : 0}
                stroke={hoveredArea?.id === area.id ? "#b91c1c" : "transparent"}
                strokeWidth="2.4"
                strokeLinejoin="round"
                className="transition-all duration-150"
              />

              {hoveredArea?.id === area.id && (
                <g>
                  <rect
                    x={area.labelX - Math.min(area.label.length * 4.7, 86) - 13}
                    y={area.labelY - 56}
                    width={Math.min(area.label.length * 9.4 + 26, 172)}
                    height="33"
                    rx="7"
                    fill="#111827"
                    opacity="0.96"
                  />
                  <text
                    x={area.labelX}
                    y={area.labelY - 35}
                    textAnchor="middle"
                    fill="white"
                    fontSize="12"
                    fontWeight="800"
                  >
                    {area.label}
                  </text>
                </g>
              )}

              <title>{area.label}</title>
            </g>
          ))}
        </svg>
      </div>

      <div className="mt-2 h-[34px] rounded-lg border border-gray-200 bg-white px-3 py-2 text-xs font-bold text-black shadow-sm">
        {hoveredArea ? hoveredArea.label : "Hover over een area"}
      </div>
    </div>
  );
}

export default function ProfilePage() {
  const [userId, setUserId] = useState("");
  const [fullName, setFullName] = useState("");
  const [role, setRole] = useState("");
  const [email, setEmail] = useState("");
  const [lidnummer, setLidnummer] = useState("");
  const [geboortedatum, setGeboortedatum] = useState("");
  const [pendingCount, setPendingCount] = useState(0);

  const [editedFullName, setEditedFullName] = useState("");
  const [editedEmail, setEditedEmail] = useState("");
  const [editedPassword, setEditedPassword] = useState("");
  const [editedLidnummer, setEditedLidnummer] = useState("");
  const [editedGeboortedatum, setEditedGeboortedatum] = useState("");

  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  useEffect(() => {
    async function getProfile() {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (!user) {
        window.location.href = "/login";
        return;
      }

      setUserId(user.id);
      setEmail(user.email || "");
      setEditedEmail(user.email || "");

      const { data } = await supabase
        .from("profiles")
        .select("*")
        .eq("id", user.id)
        .single();

      if (data) {
        setFullName(data.full_name || "");
        setEditedFullName(data.full_name || "");
        setRole(data.role || "");
        setLidnummer(data.lidnummer || "");
        setEditedLidnummer(data.lidnummer || "");
        setGeboortedatum(data.geboortedatum || "");
        setEditedGeboortedatum(data.geboortedatum || "");
      }

      const { data: pendingProfiles } = await supabase
        .from("profiles")
        .select("*")
        .eq("role", "pending");

      setPendingCount(pendingProfiles?.length || 0);
    }

    getProfile();
  }, []);

  async function saveProfile() {
    if (!editedFullName.trim()) {
      setMessage("Vul een naam in.");
      return;
    }

    setSaving(true);
    setMessage("");

    const { error: profileError } = await supabase
      .from("profiles")
      .update({
        full_name: editedFullName.trim(),
        lidnummer: editedLidnummer.trim(),
        geboortedatum: editedGeboortedatum || null,
      })
      .eq("id", userId);

    if (profileError) {
      setSaving(false);
      setMessage("Er ging iets mis bij het opslaan van je profiel.");
      return;
    }

    const authUpdates: { email?: string; password?: string } = {};

    if (editedEmail.trim() && editedEmail.trim() !== email) {
      authUpdates.email = editedEmail.trim();
    }

    if (editedPassword.trim()) {
      authUpdates.password = editedPassword.trim();
    }

    if (Object.keys(authUpdates).length > 0) {
      const { error: authError } = await supabase.auth.updateUser(authUpdates);

      if (authError) {
        setSaving(false);
        setMessage("Profiel opgeslagen, maar email/wachtwoord aanpassen is niet gelukt.");
        return;
      }
    }

    setFullName(editedFullName.trim());
    setEmail(editedEmail.trim());
    setLidnummer(editedLidnummer.trim());
    setGeboortedatum(editedGeboortedatum);
    setEditedPassword("");
    setSaving(false);
    setMessage("Profiel opgeslagen.");
  }

  async function logout() {
    await supabase.auth.signOut();
    window.location.href = "/login";
  }

  const coachLinks: DashboardLink[] = [
    { href: "/dashboard", icon: "🏠", title: "Dashboard", description: "Ga terug naar het dashboard." },
    { href: "/athletes", icon: "👥", title: "Atleten beheren", description: "Bekijk en accepteer atleten.", badge: pendingCount },
    { href: "/athlete-profiles", icon: "📋", title: "Atleten profielen", description: "Bekijk alle geaccepteerde atleten." },
    { href: "/programs", icon: "🏋️", title: "Programma’s", description: "Maak trainingsschema’s aan." },
    { href: "/chat", icon: "💬", title: "Chat", description: "Stuur berichten naar atleten." },
    { href: "/wedstrijd-kalender", icon: "📅", title: "Wedstrijd kalender", description: "Bekijk en beheer wedstrijden." },
    { href: "/limitless-data", icon: "📊", title: "Limitless Data", description: "Voeg atleten toe en beheer lidgegevens." },
  ];

  const athleteLinks: DashboardLink[] = [
    { href: "/dashboard", icon: "🏠", title: "Dashboard", description: "Ga terug naar het dashboard." },
    { href: "/training", icon: "🔥", title: "Mijn training", description: "Bekijk je training van vandaag." },
    { href: "/progress", icon: "📈", title: "Voortgang", description: "Bekijk je resultaten." },
    { href: "/programs", icon: "🏋️", title: "Programma’s", description: "Bekijk je trainingsprogramma’s." },
    { href: "/chat", icon: "💬", title: "Chat met coach", description: "Stel vragen aan je coach." },
    { href: "/wedstrijd-kalender", icon: "📅", title: "Wedstrijd kalender", description: "Bekijk je aankomende wedstrijden." },
  ];

  const links = role === "coach" ? coachLinks : athleteLinks;

  return (
    <main className="min-h-screen bg-gray-100">
      <div className="flex min-h-screen">
        <aside className="group w-20 hover:w-64 bg-white shadow-xl p-3 flex flex-col transition-all duration-300 overflow-hidden">
          <div className="flex items-center justify-center group-hover:justify-between mb-5 transition-all">
            <a href="/profile" className="flex items-center gap-3 bg-black text-white transition rounded-xl px-2 py-2 w-full">
              <div className="min-w-9 h-9 rounded-lg bg-white text-black shadow flex items-center justify-center text-lg">👤</div>
              <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap overflow-hidden">
                <p className="font-semibold text-sm">{fullName}</p>
                <p className="text-xs text-gray-300 capitalize">Ingelogd als {role}</p>
                <p className="text-xs text-gray-400 mt-1">Profiel aanpassen</p>
              </div>
            </a>
          </div>

          <nav className="flex flex-col gap-2 flex-1">
            {links.map((item) => (
              <a key={item.title} href={item.href} className="relative bg-gray-100 hover:bg-gray-200 p-3 rounded-xl transition-all duration-200 flex items-center gap-3">
                <div className="relative">
                  <div className="min-w-9 h-9 rounded-lg bg-white shadow flex items-center justify-center text-lg">{item.icon}</div>
                  {item.badge !== undefined && item.badge > 0 && (
                    <div className="absolute -top-2 -right-2 min-w-[20px] h-[20px] px-1 bg-red-500 text-white rounded-full flex items-center justify-center text-[10px] font-bold border-2 border-white shadow">
                      {item.badge}
                    </div>
                  )}
                </div>
                <div className="opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap overflow-hidden">
                  <h3 className="font-semibold text-sm">{item.title}</h3>
                  <p className="text-xs text-gray-500">{item.description}</p>
                </div>
              </a>
            ))}
          </nav>

          <button onClick={logout} className="bg-black text-white px-3 py-2 rounded-xl mt-5 flex items-center gap-3 hover:opacity-90 transition">
            <span className="min-w-9 text-lg">🚪</span>
            <span className="opacity-0 group-hover:opacity-100 transition-all duration-200 whitespace-nowrap overflow-hidden text-sm">Uitloggen</span>
          </button>
        </aside>

        <section className="flex-1 p-6 space-y-6">
          <div className="rounded-3xl border border-gray-200 bg-[#f1f3f5] p-8 shadow-xl">
            <div className="mb-6 flex items-start justify-between gap-4">
              <div>
                <h1 className="text-4xl font-bold text-black">Lichaamsgebieden</h1>
                <p className="mt-2 text-gray-500">Hover over een vlak om de naam van de area te zien.</p>
              </div>
              <a href="/profile" className="rounded-xl border border-gray-200 bg-white px-4 py-2 text-sm font-bold text-black shadow-sm hover:bg-gray-100">Profiel gegevens</a>
            </div>

            <div className="flex flex-col items-center justify-center gap-16 xl:flex-row xl:items-start xl:justify-center">
              <BodyDiagram side="front" />
              <BodyDiagram side="back" />
            </div>
          </div>

          <div className="bg-white rounded-3xl shadow-xl p-8 max-w-3xl">
            <h2 className="text-3xl font-bold mb-2">Profiel aanpassen</h2>
            <p className="text-gray-500 mb-8">Pas hier je persoonlijke gegevens aan.</p>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
              <div>
                <label className="block text-sm font-semibold mb-2">Volledige naam</label>
                <input type="text" value={editedFullName} onChange={(e) => setEditedFullName(e.target.value)} className="w-full border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Email</label>
                <input type="email" value={editedEmail} onChange={(e) => setEditedEmail(e.target.value)} className="w-full border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Nieuw wachtwoord</label>
                <input type="password" value={editedPassword} onChange={(e) => setEditedPassword(e.target.value)} placeholder="Laat leeg als je niks wilt wijzigen" className="w-full border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Geboortedatum</label>
                <input type="date" value={editedGeboortedatum} onChange={(e) => setEditedGeboortedatum(e.target.value)} className="w-full border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Lidnummer</label>
                <input type="text" value={editedLidnummer} onChange={(e) => setEditedLidnummer(e.target.value)} className="w-full border border-gray-300 rounded-2xl px-4 py-3 outline-none focus:ring-2 focus:ring-black" />
              </div>
              <div>
                <label className="block text-sm font-semibold mb-2">Rol</label>
                <div className="w-full bg-gray-100 rounded-2xl px-4 py-3 text-gray-600 capitalize">{role}</div>
              </div>
            </div>

            {message && <p className="mt-6 text-sm text-gray-600">{message}</p>}

            <button onClick={saveProfile} disabled={saving} className="mt-8 bg-black text-white px-6 py-3 rounded-2xl hover:opacity-90 transition disabled:opacity-50">
              {saving ? "Opslaan..." : "Profiel opslaan"}
            </button>
          </div>
        </section>
      </div>
    </main>
  );
}
