"use client";

import { useState, useRef, useEffect } from "react";
import {
  Search,
  Zap,
  Target,
  TrendingUp,
  Shield,
  Users,
  MapPin,
  Brain,
  ChevronRight,
  Activity,
  Star,
  AlertCircle,
  RefreshCw,
  Sparkles,
  Trophy,
  Filter,
  CheckCircle2,
} from "lucide-react";

// ────────────────────────────────────────────
// TYPES
// ────────────────────────────────────────────
export interface PlayerStat {
  label: string;
  value: number;
  unit?: string;
  max: number;
}

export interface Player {
  id: string;
  name: string;
  age: number;
  currentTeam: string;
  position: string;
  similarityScore: number;
  matchPercentage: number;
  aiSummary: string;
  stats: PlayerStat[];
  nationality: string;
  countryName: string;
  iso2: string;
  appearances?: number;
  minutes?: number;
}

interface RawPlayerPayload {
  id?: string | number;
  Player?: string;
  Pos?: string;
  Squad?: string;
  Comp?: string;
  Age?: number;
  MP?: number;
  text_profile?: string;
}

interface SearchResultItem {
  jugador: RawPlayerPayload;
  similitud: number;
}

// ────────────────────────────────────────────
// COMPREHENSIVE COUNTRY & FLAG CDN MAPPING (98 NATIONS)
// ────────────────────────────────────────────
const COUNTRY_DATA: Record<string, { iso2: string; name: string }> = {
  ALB: { iso2: "al", name: "Albania" },
  ALG: { iso2: "dz", name: "Algeria" },
  ANG: { iso2: "ao", name: "Angola" },
  ARG: { iso2: "ar", name: "Argentina" },
  AUS: { iso2: "au", name: "Australia" },
  AUT: { iso2: "at", name: "Austria" },
  BDI: { iso2: "bi", name: "Burundi" },
  BEL: { iso2: "be", name: "Belgium" },
  BEN: { iso2: "bj", name: "Benin" },
  BFA: { iso2: "bf", name: "Burkina Faso" },
  BIH: { iso2: "ba", name: "Bosnia & Herzegovina" },
  BRA: { iso2: "br", name: "Brazil" },
  BUL: { iso2: "bg", name: "Bulgaria" },
  CAN: { iso2: "ca", name: "Canada" },
  CGO: { iso2: "cg", name: "Congo" },
  CHI: { iso2: "cl", name: "Chile" },
  CIV: { iso2: "ci", name: "Ivory Coast" },
  CMR: { iso2: "cm", name: "Cameroon" },
  COD: { iso2: "cd", name: "DR Congo" },
  COL: { iso2: "co", name: "Colombia" },
  CRC: { iso2: "cr", name: "Costa Rica" },
  CRO: { iso2: "hr", name: "Croatia" },
  CTA: { iso2: "cf", name: "Central African Rep." },
  CZE: { iso2: "cz", name: "Czech Republic" },
  DEN: { iso2: "dk", name: "Denmark" },
  DOM: { iso2: "do", name: "Dominican Republic" },
  ECU: { iso2: "ec", name: "Ecuador" },
  EGY: { iso2: "eg", name: "Egypt" },
  ENG: { iso2: "gb-eng", name: "England" },
  EQG: { iso2: "gq", name: "Equatorial Guinea" },
  ESP: { iso2: "es", name: "Spain" },
  EST: { iso2: "ee", name: "Estonia" },
  FIN: { iso2: "fi", name: "Finland" },
  FRA: { iso2: "fr", name: "France" },
  GAB: { iso2: "ga", name: "Gabon" },
  GAM: { iso2: "gm", name: "Gambia" },
  GEO: { iso2: "ge", name: "Georgia" },
  GER: { iso2: "de", name: "Germany" },
  DEU: { iso2: "de", name: "Germany" },
  GHA: { iso2: "gh", name: "Ghana" },
  GLP: { iso2: "gp", name: "Guadeloupe" },
  GNB: { iso2: "gw", name: "Guinea-Bissau" },
  GRE: { iso2: "gr", name: "Greece" },
  GUI: { iso2: "gn", name: "Guinea" },
  HAI: { iso2: "ht", name: "Haiti" },
  HUN: { iso2: "hu", name: "Hungary" },
  IDN: { iso2: "id", name: "Indonesia" },
  IRL: { iso2: "ie", name: "Ireland" },
  ISL: { iso2: "is", name: "Iceland" },
  ISR: { iso2: "il", name: "Israel" },
  ITA: { iso2: "it", name: "Italy" },
  JAM: { iso2: "jm", name: "Jamaica" },
  JOR: { iso2: "jo", name: "Jordan" },
  JPN: { iso2: "jp", name: "Japan" },
  KEN: { iso2: "ke", name: "Kenya" },
  KOR: { iso2: "kr", name: "South Korea" },
  KVX: { iso2: "xk", name: "Kosovo" },
  LTU: { iso2: "lt", name: "Lithuania" },
  MAD: { iso2: "mg", name: "Madagascar" },
  MAR: { iso2: "ma", name: "Morocco" },
  MEX: { iso2: "mx", name: "Mexico" },
  MKD: { iso2: "mk", name: "North Macedonia" },
  MLI: { iso2: "ml", name: "Mali" },
  MNE: { iso2: "me", name: "Montenegro" },
  MOZ: { iso2: "mz", name: "Mozambique" },
  MTN: { iso2: "mr", name: "Mauritania" },
  MTQ: { iso2: "mq", name: "Martinique" },
  NED: { iso2: "nl", name: "Netherlands" },
  NGA: { iso2: "ng", name: "Nigeria" },
  NIG: { iso2: "ne", name: "Niger" },
  NIR: { iso2: "gb-nir", name: "Northern Ireland" },
  NOR: { iso2: "no", name: "Norway" },
  NZL: { iso2: "nz", name: "New Zealand" },
  PAR: { iso2: "py", name: "Paraguay" },
  PER: { iso2: "pe", name: "Peru" },
  PHI: { iso2: "ph", name: "Philippines" },
  POL: { iso2: "pl", name: "Poland" },
  POR: { iso2: "pt", name: "Portugal" },
  ROU: { iso2: "ro", name: "Romania" },
  RUS: { iso2: "ru", name: "Russia" },
  SCO: { iso2: "gb-sct", name: "Scotland" },
  SEN: { iso2: "sn", name: "Senegal" },
  SRB: { iso2: "rs", name: "Serbia" },
  SUI: { iso2: "ch", name: "Switzerland" },
  CHE: { iso2: "ch", name: "Switzerland" },
  SUR: { iso2: "sr", name: "Suriname" },
  SVK: { iso2: "sk", name: "Slovakia" },
  SVN: { iso2: "si", name: "Slovenia" },
  SWE: { iso2: "se", name: "Sweden" },
  TAN: { iso2: "tz", name: "Tanzania" },
  TOG: { iso2: "tg", name: "Togo" },
  TUN: { iso2: "tn", name: "Tunisia" },
  TUR: { iso2: "tr", name: "Turkey" },
  UKR: { iso2: "ua", name: "Ukraine" },
  URU: { iso2: "uy", name: "Uruguay" },
  USA: { iso2: "us", name: "United States" },
  UZB: { iso2: "uz", name: "Uzbekistan" },
  VEN: { iso2: "ve", name: "Venezuela" },
  WAL: { iso2: "gb-wls", name: "Wales" },
  ZAM: { iso2: "zm", name: "Zambia" },
};

function extractNationality(text: string): { code: string; name: string; iso2: string } {
  const match = text.match(/(?:from|nacionalidad|de nacionalidad|nacido en)\s+([A-Z]{2,4})\b/i);
  const code = match ? match[1].toUpperCase() : "ESP";
  const info = COUNTRY_DATA[code] || { iso2: code.toLowerCase(), name: code };
  return { code, name: info.name, iso2: info.iso2 };
}

function parseStatsFromProfile(text: string): {
  stats: PlayerStat[];
  appearances?: number;
  minutes?: number;
} {
  if (!text) return { stats: [] };

  // Parse appearances & minutes
  const appMatch = text.match(/(\d+)\s+(?:appearances|partidos)/i);
  const minMatch = text.match(/(\d+)\s+minutes/i);
  const appearances = appMatch ? parseInt(appMatch[1], 10) : undefined;
  const minutes = minMatch ? parseInt(minMatch[1], 10) : undefined;

  // Goalkeeper metrics
  const savesMatch = text.match(/(\d+)\s+(?:saves|paradas)/i);
  const saveRateMatch = text.match(/([\d.]+)%\s+(?:save\s+rate|porcentaje\s+de\s+paradas)/i);
  const cleanSheetsMatch = text.match(/(\d+)\s+(?:clean\s+sheets|porter[ií]as\s+a\s+cero)/i);

  if (savesMatch || saveRateMatch || /goalkeeper|portero|gk/i.test(text)) {
    return {
      appearances,
      minutes,
      stats: [
        {
          label: "Saves",
          value: savesMatch ? parseInt(savesMatch[1], 10) : 0,
          max: 40,
        },
        {
          label: "Save Rate",
          value: saveRateMatch ? parseFloat(saveRateMatch[1]) : 0,
          unit: "%",
          max: 100,
        },
        {
          label: "Clean Sheets",
          value: cleanSheetsMatch ? parseInt(cleanSheetsMatch[1], 10) : 0,
          max: 8,
        },
      ],
    };
  }

  // Outfield player metrics (bilingual regex support)
  const goalsMatch = text.match(/(\d+)\s+(?:goals|goles)/i);
  const assistsMatch = text.match(/(\d+)\s+(?:assists|asistencias)/i);
  const tacklesMatch = text.match(/(\d+)\s+(?:tackles\s+won|entradas\s+ganadas|recuperaciones)/i);
  const interceptionsMatch = text.match(/(\d+)\s+(?:interceptions|intercepciones)/i);

  const stats: PlayerStat[] = [];
  if (goalsMatch) {
    stats.push({ label: "Goals", value: parseInt(goalsMatch[1], 10), max: 15 });
  }
  if (assistsMatch) {
    stats.push({ label: "Assists", value: parseInt(assistsMatch[1], 10), max: 12 });
  }
  if (tacklesMatch) {
    stats.push({ label: "Tackles Won", value: parseInt(tacklesMatch[1], 10), max: 15 });
  } else if (interceptionsMatch) {
    stats.push({ label: "Interceptions", value: parseInt(interceptionsMatch[1], 10), max: 15 });
  }

  // Fallback defaults if regex found nothing
  if (stats.length === 0) {
    stats.push(
      { label: "Goals", value: 0, max: 10 },
      { label: "Assists", value: 0, max: 10 },
      { label: "Tackles Won", value: 0, max: 15 }
    );
  }

  return { stats, appearances, minutes };
}

function mapApiResultToPlayer(item: SearchResultItem, index: number): Player {
  const { jugador, similitud } = item;
  const profileText = jugador.text_profile || "";
  const { stats, appearances, minutes } = parseStatsFromProfile(profileText);
  const { code: nationality, name: countryName, iso2 } = extractNationality(profileText);

  // Normalize similarity score into an intuitive 65%-99% match percentage
  // Cosine similarities typically range ~0.35 to ~0.75 for top semantic text hits
  const rawPct = Math.round(((similitud - 0.25) / (0.75 - 0.25)) * 35 + 64);
  const matchPercentage = Math.min(Math.max(rawPct, 65), 98);

  // Clean competition name (e.g. "es La Liga" -> "La Liga")
  const rawComp = jugador.Comp || "";
  const cleanComp = rawComp.replace(/^[a-z]{2,3}\s+/i, "");
  const currentTeam = jugador.Squad
    ? cleanComp
      ? `${jugador.Squad} • ${cleanComp}`
      : jugador.Squad
    : "Free Agent";

  return {
    id: String(jugador.id || `candidate-${index + 1}`),
    name: jugador.Player || "Unknown Candidate",
    age: jugador.Age || 24,
    currentTeam,
    position: jugador.Pos || "MF",
    similarityScore: similitud,
    matchPercentage,
    aiSummary: profileText,
    stats,
    nationality,
    countryName,
    iso2,
    appearances,
    minutes,
  };
}

// ────────────────────────────────────────────
// HEADER COMPONENT
// ────────────────────────────────────────────
function Header() {
  return (
    <header className="relative z-20 flex items-center justify-between px-6 py-4 border-b border-slate-800/80 backdrop-blur-xl bg-slate-950/70">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-10 h-10 rounded-xl bg-emerald-500/10 border border-emerald-500/30 shadow-[0_0_15px_rgba(16,185,129,0.15)]">
          <Zap className="w-5 h-5 text-emerald-400" strokeWidth={2.5} />
        </div>
        <div>
          <div className="flex items-center gap-2">
            <h1 className="text-xl font-black tracking-tight text-white leading-none">
              Scout <span className="gradient-text">AI</span>
            </h1>
            <span className="px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-300 bg-emerald-500/10 border border-emerald-500/20 rounded-full">
              AWS Bedrock
            </span>
          </div>
          <p className="text-[11px] text-slate-400 tracking-wider uppercase mt-1">
            Tactical Vector Intelligence · Transfer Market
          </p>
        </div>
      </div>

      <div className="flex items-center gap-4">
        <div className="hidden sm:flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-slate-900/90 border border-emerald-500/30 text-emerald-400 text-xs font-semibold shadow-[0_0_20px_rgba(16,185,129,0.1)]">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-400"></span>
          </span>
          Titan Embeddings Live
        </div>
      </div>
    </header>
  );
}

// ────────────────────────────────────────────
// HERO / SEARCH COMPONENT
// ────────────────────────────────────────────
function HeroSection({
  query,
  onQueryChange,
  onSearch,
  isLoading,
  textareaRef,
}: {
  query: string;
  onQueryChange: (v: string) => void;
  onSearch: (q?: string) => void;
  isLoading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  const quickPrompts = [
    "Box-to-box midfielder similar to Rodri with line-breaking passes",
    "Pacey left winger strong in 1v1 duels and chance creation",
    "Dominant goalkeeper with high save percentage and aerial command",
    "Ball-playing center back composed under pressure with high duel win rate",
  ];

  return (
    <section className="relative px-6 pt-16 pb-12 text-center">
      <div className="absolute inset-0 grid-pattern pointer-events-none opacity-40" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="relative max-w-4xl mx-auto">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/25 bg-emerald-500/10 text-emerald-300 text-xs font-medium mb-6 tracking-wide shadow-[0_0_15px_rgba(16,185,129,0.1)]">
          <Brain className="w-3.5 h-3.5 text-emerald-400" />
          <span>Generative Scouting Engine · 1,677 Profiles Indexed</span>
        </div>

        <h2 className="text-4xl sm:text-5xl md:text-6xl font-black text-white tracking-tight leading-[1.08] mb-4">
          Discover your next{" "}
          <span className="gradient-text">tactical signing</span>
        </h2>
        <p className="text-slate-300/80 text-base sm:text-lg max-w-2xl mx-auto mb-10 leading-relaxed">
          Describe the exact tactical profile and roles you require in natural language.
          AWS Bedrock computes cosine similarities across semantic vector embeddings to pinpoint the top candidates.
        </p>

        {/* Tactical Search Box */}
        <div className="search-bar-glow relative flex flex-col sm:flex-row items-stretch sm:items-center bg-slate-900/90 border border-slate-700/80 rounded-2xl p-2.5 max-w-3xl mx-auto backdrop-blur-xl shadow-2xl transition-all duration-300">
          <div className="hidden sm:flex items-center pl-3 pr-1 text-emerald-400/70">
            <Search className="w-5 h-5" />
          </div>
          <textarea
            ref={textareaRef}
            id="search-query"
            rows={2}
            value={query}
            autoComplete="off"
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="e.g., Box-to-box midfielder who breaks lines with progressive passing and intense pressing..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm px-3 py-2 resize-none outline-none leading-relaxed min-h-[56px]"
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                onSearch();
              }
            }}
          />
          <button
            id="search-button"
            type="button"
            onClick={() => onSearch()}
            disabled={isLoading || !query.trim()}
            className="mt-2 sm:mt-0 flex-shrink-0 flex items-center justify-center gap-2 bg-gradient-to-r from-emerald-500 to-teal-400 hover:from-emerald-400 hover:to-teal-300 disabled:from-emerald-500/20 disabled:to-emerald-500/20 disabled:text-slate-500 disabled:cursor-not-allowed text-slate-950 font-bold text-sm px-6 py-3.5 rounded-xl transition-all duration-200 active:scale-95 shadow-lg shadow-emerald-500/25 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                <span>Searching...</span>
              </>
            ) : (
              <>
                <Zap className="w-4 h-4 fill-slate-950" />
                <span>Find Candidates</span>
              </>
            )}
          </button>
        </div>

        {/* Suggestion Chips */}
        <div className="mt-6 flex flex-wrap justify-center items-center gap-2 max-w-3xl mx-auto text-xs">
          <span className="text-slate-500 font-medium mr-1 flex items-center gap-1">
            <Sparkles className="w-3 h-3 text-emerald-400" />
            Quick Prompts:
          </span>
          {quickPrompts.map((prompt) => (
            <button
              key={prompt}
              type="button"
              onClick={() => onSearch(prompt)}
              className="px-3 py-1.5 rounded-lg bg-slate-800/60 hover:bg-emerald-500/10 border border-slate-700/60 hover:border-emerald-500/30 text-slate-300 hover:text-emerald-300 transition-all duration-200 text-left truncate max-w-[280px] cursor-pointer"
            >
              {prompt}
            </button>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────
// MATCH PERCENTAGE RING
// ────────────────────────────────────────────
function MatchRing({ percentage }: { percentage: number }) {
  const radius = 26;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const strokeColor =
    percentage >= 85 ? "#10b981" : percentage >= 75 ? "#14b8a6" : "#38bdf8";

  return (
    <div className="relative flex items-center justify-center w-18 h-18 flex-shrink-0">
      <svg className="w-18 h-18 -rotate-90" viewBox="0 0 68 68">
        <circle
          cx="34"
          cy="34"
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth="5.5"
        />
        <circle
          cx="34"
          cy="34"
          r={radius}
          fill="none"
          stroke={strokeColor}
          strokeWidth="5.5"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s cubic-bezier(0.4, 0, 0.2, 1)" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-sm font-extrabold text-white leading-none tracking-tight">
          {percentage}%
        </span>
        <span className="text-[9px] font-semibold text-slate-400 uppercase tracking-wider mt-0.5">
          match
        </span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// STAT BAR
// ────────────────────────────────────────────
function StatBar({ label, value, unit, max }: PlayerStat) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className="text-emerald-300 font-bold tabular-nums">
          {value}
          {unit || ""}
        </span>
      </div>
      <div className="h-1.5 bg-slate-800/90 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full progress-bar-fill"
          style={{
            width: `${pct}%`,
            background: "linear-gradient(90deg, #059669, #10b981)",
          }}
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// PLAYER CARD COMPONENT
// Steady illuminated border on hover (no blinking/flickering)
// High-resolution Flagcdn image flags for 100% reliable rendering
// ────────────────────────────────────────────
function PlayerCard({ player, index }: { player: Player; index: number }) {
  const [imageFailed, setImageFailed] = useState(false);
  const flagUrl = `https://flagcdn.com/w80/${player.iso2}.png`;

  return (
    <article
      className="card-glow group relative flex flex-col bg-slate-900/80 backdrop-blur-md border border-slate-800/90 rounded-2xl overflow-hidden transition-all duration-300 animate-fade-in-up"
      style={{ animationDelay: `${index * 80}ms` }}
    >
      {/* Top Emerald Ambient Gradient Line */}
      <div className="absolute top-0 left-0 right-0 h-[2px] bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent group-hover:via-emerald-400 transition-all duration-300" />

      {/* Card Header */}
      <div className="p-5 pb-3 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3.5 min-w-0">
          {/* Flag & Avatar Badge */}
          <div className="relative flex-shrink-0 w-13 h-13 rounded-2xl bg-gradient-to-br from-slate-800 to-slate-950 flex items-center justify-center border border-slate-700/80 shadow-md overflow-hidden">
            {!imageFailed ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={flagUrl}
                alt={player.countryName}
                className="w-8 h-5.5 object-cover rounded shadow-md border border-slate-600/40 transition-transform duration-300 group-hover:scale-110"
                loading="lazy"
                onError={() => setImageFailed(true)}
              />
            ) : (
              <span className="text-xs font-extrabold text-emerald-400">
                {player.nationality}
              </span>
            )}
          </div>

          {/* Name & Squad */}
          <div className="min-w-0">
            <h3 className="font-extrabold text-white text-base leading-tight truncate group-hover:text-emerald-300 transition-colors">
              {player.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-1 text-xs text-slate-400">
              <MapPin className="w-3.5 h-3.5 text-slate-500 flex-shrink-0" />
              <span className="truncate">{player.currentTeam}</span>
            </div>
          </div>
        </div>

        {/* Tactical Compatibility Ring */}
        <MatchRing percentage={player.matchPercentage} />
      </div>

      {/* Badges Bar: Position, Age, Nationality, Score */}
      <div className="px-5 flex flex-wrap items-center gap-2 mb-3">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 text-xs text-slate-300 font-semibold border border-slate-700/50">
          <Target className="w-3 h-3 text-emerald-400" />
          {player.position}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 text-xs text-slate-300 font-medium border border-slate-700/50">
          <Users className="w-3 h-3 text-sky-400" />
          {player.age} yrs
        </span>
        <span
          className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-slate-800/80 text-xs text-slate-300 font-medium border border-slate-700/50"
          title={player.countryName}
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            src={flagUrl}
            alt={player.countryName}
            className="w-4 h-3 object-cover rounded-[1px]"
            loading="lazy"
            onError={(e) => {
              (e.currentTarget as HTMLElement).style.display = "none";
            }}
          />
          <span>{player.nationality}</span>
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-xs text-emerald-300 font-semibold border border-emerald-500/20">
          <Trophy className="w-3 h-3 text-emerald-400" />
          {(player.similarityScore * 100).toFixed(1)}% sim
        </span>
      </div>

      {/* AI Tactical Summary */}
      <div className="px-5 mb-4 flex-1">
        <div className="flex items-center gap-1.5 mb-1.5">
          <Brain className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-[11px] font-bold text-emerald-400 uppercase tracking-wider">
            Tactical Analysis
          </span>
        </div>
        <p className="text-xs text-slate-300/90 leading-relaxed line-clamp-3 bg-slate-950/40 p-2.5 rounded-xl border border-slate-800/60">
          {player.aiSummary}
        </p>
      </div>

      {/* Key Metrics */}
      {player.stats && player.stats.length > 0 && (
        <div className="px-5 pb-4 space-y-2 mt-auto">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3 h-3 text-slate-500" />
            <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
              Key Stats
            </span>
          </div>
          {player.stats.map((stat) => (
            <StatBar key={stat.label} {...stat} />
          ))}
        </div>
      )}

      {/* Action Footer */}
      <div className="px-5 pb-5 pt-1">
        <button
          type="button"
          onClick={() => {
            alert(`Player Profile: ${player.name}\nTeam: ${player.currentTeam}\nPosition: ${player.position}\nCountry: ${player.countryName} (${player.nationality})\n\nTactical Report:\n${player.aiSummary}`);
          }}
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700/70 text-slate-300 text-xs font-semibold hover:border-emerald-500/50 hover:text-emerald-300 hover:bg-emerald-500/10 transition-all duration-200 group/btn cursor-pointer shadow-sm"
        >
          <span>View Scouting Report</span>
          <ChevronRight className="w-3.5 h-3.5 group-hover/btn:translate-x-1 transition-transform" />
        </button>
      </div>
    </article>
  );
}

// ────────────────────────────────────────────
// RESULTS SECTION
// ────────────────────────────────────────────
function ResultsSection({ players }: { players: Player[] }) {
  return (
    <section className="px-6 pb-20 max-w-7xl mx-auto w-full">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mb-6 pb-4 border-b border-slate-800/60">
        <div>
          <h2 className="text-xl font-extrabold text-white flex items-center gap-2.5">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            <span>Top Tactical Recommendations</span>
            <span className="px-2.5 py-0.5 rounded-full bg-emerald-500/15 text-emerald-300 text-xs font-bold border border-emerald-500/30">
              {players.length} Candidates
            </span>
          </h2>
          <p className="text-slate-400 text-xs mt-1">
            Ranked by cosine vector proximity to your tactical description
          </p>
        </div>

        <div className="flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 px-3 py-1.5 rounded-xl border border-slate-800">
          <Shield className="w-4 h-4 text-emerald-400" />
          <span>Verified FBref & StatsBomb Data</span>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {players.map((player, index) => (
          <PlayerCard key={player.id} player={player} index={index} />
        ))}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────
// LOADING STATE
// ────────────────────────────────────────────
function LoadingState() {
  return (
    <section className="px-6 pb-20 max-w-7xl mx-auto w-full text-center">
      <div className="flex flex-col items-center justify-center py-12">
        <div className="relative flex items-center justify-center w-16 h-16 mb-4">
          <div className="absolute inset-0 rounded-full border-4 border-emerald-500/20 animate-ping" />
          <div className="w-12 h-12 rounded-full border-4 border-emerald-500 border-t-transparent animate-spin" />
        </div>
        <h3 className="text-lg font-bold text-white mb-2">
          Generating Vector Embedding & Searching Players...
        </h3>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Querying Amazon Bedrock Titan Text v2 and AWS Lambda to compute cosine similarity across 1,677 player vectors.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 opacity-40">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-96 bg-slate-900/50 border border-slate-800 rounded-2xl animate-pulse"
          />
        ))}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────
// ERROR STATE
// ────────────────────────────────────────────
function ErrorState({
  message,
  onRetry,
}: {
  message: string;
  onRetry: () => void;
}) {
  return (
    <section className="px-6 pb-20 max-w-2xl mx-auto w-full">
      <div className="flex flex-col items-center text-center p-8 rounded-2xl bg-rose-500/10 border border-rose-500/30 backdrop-blur-md">
        <AlertCircle className="w-12 h-12 text-rose-400 mb-3" />
        <h3 className="text-base font-bold text-rose-200 mb-2">
          Unable to Connect to AWS Backend
        </h3>
        <p className="text-xs text-rose-300/80 mb-6 leading-relaxed max-w-md">
          {message}
        </p>
        <button
          type="button"
          onClick={onRetry}
          className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 text-xs font-bold transition-all duration-200 cursor-pointer shadow-lg shadow-rose-500/20"
        >
          <RefreshCw className="w-4 h-4" />
          <span>Retry Search</span>
        </button>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────
// EMPTY INITIAL STATE
// ────────────────────────────────────────────
function EmptyState({
  onSelectSuggestion,
}: {
  onSelectSuggestion: (s: string) => void;
}) {
  const exampleCards = [
    {
      role: "Pivote Organizador",
      title: "Deep-Lying Playmaker",
      prompt: "Mediocampista organizador con alta precisión de pase, visión de juego y control del tempo similar a Busquets o Rodri",
      icon: Target,
    },
    {
      role: "Extremo Desequilibrante",
      title: "Dynamic Winger",
      prompt: "Extremo veloz y ágil con alto porcentaje de regates completados y centros precisos",
      icon: Zap,
    },
    {
      role: "Central Dominante",
      title: "Ball-Playing Center Back",
      prompt: "Defensa central con salida de balón limpia, contundencia en duelos aéreos y recuperaciones",
      icon: Shield,
    },
  ];

  return (
    <section className="px-6 pb-20 max-w-5xl mx-auto w-full text-center">
      <div className="flex items-center justify-center w-16 h-16 mx-auto mb-4 rounded-2xl bg-slate-900/80 border border-slate-800 shadow-inner">
        <Search className="w-7 h-7 text-emerald-400/80" />
      </div>
      <h3 className="text-xl font-bold text-white mb-2">
        Ready for Semantic Scouting
      </h3>
      <p className="text-slate-400 text-xs max-w-md mx-auto mb-8">
        Click any example archetype below or describe your custom tactical requirements in the search bar.
      </p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {exampleCards.map((card) => {
          const Icon = card.icon;
          return (
            <button
              key={card.title}
              type="button"
              onClick={() => onSelectSuggestion(card.prompt)}
              className="group card-glow flex flex-col items-start text-left p-5 rounded-2xl bg-slate-900/60 border border-slate-800/80 hover:border-emerald-500/40 hover:bg-slate-900/90 transition-all duration-200 cursor-pointer"
            >
              <div className="flex items-center justify-between w-full mb-3">
                <div className="w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400 group-hover:scale-110 transition-transform">
                  <Icon className="w-4 h-4" />
                </div>
                <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">
                  Archetype
                </span>
              </div>
              <h4 className="text-sm font-bold text-white group-hover:text-emerald-300 transition-colors mb-1">
                {card.title}
              </h4>
              <p className="text-xs text-slate-400 line-clamp-2 leading-relaxed">
                {card.prompt}
              </p>
            </button>
          );
        })}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────
// MAIN PAGE ROOT
// ────────────────────────────────────────────
export default function Home() {
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Auto-fill query if textarea had pre-filled text
  useEffect(() => {
    if (textareaRef.current?.value && !query) {
      setQuery(textareaRef.current.value);
    }
  }, []);

  const handleSearch = async (overridePrompt?: string) => {
    const rawQuery = overridePrompt !== undefined ? overridePrompt : query;
    const textToSearch = rawQuery.trim() || textareaRef.current?.value.trim() || "";

    if (!textToSearch) {
      textareaRef.current?.focus();
      return;
    }

    setQuery(textToSearch);
    if (textareaRef.current) {
      textareaRef.current.value = textToSearch;
    }

    setIsLoading(true);
    setErrorMessage(null);

    try {
      // Call Next.js server proxy API to prevent browser CORS blocks
      const response = await fetch("/api/search", {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: textToSearch }),
      });

      if (!response.ok) {
        const errJson = await response.json().catch(() => null);
        throw new Error(
          errJson?.error || `Server responded with HTTP ${response.status}`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          data?.error || "Invalid response: expected an array of player candidates."
        );
      }

      const formatted = data.map((item: SearchResultItem, index: number) =>
        mapApiResultToPlayer(item, index)
      );

      setPlayers(formatted);
      setHasSearched(true);
    } catch (err: unknown) {
      console.error("Search error:", err);
      const msg =
        err instanceof Error
          ? err.message
          : "An unexpected error occurred while contacting the AWS backend.";
      setErrorMessage(msg);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="hero-bg min-h-screen flex flex-col selection:bg-emerald-500/30 selection:text-emerald-200">
      <Header />

      <HeroSection
        query={query}
        onQueryChange={setQuery}
        onSearch={handleSearch}
        isLoading={isLoading}
        textareaRef={textareaRef}
      />

      <main className="flex-1 flex flex-col">
        {isLoading ? (
          <LoadingState />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={() => handleSearch()} />
        ) : hasSearched ? (
          players.length > 0 ? (
            <ResultsSection players={players} />
          ) : (
            <div className="text-center py-20 text-slate-400">
              <p className="text-base font-semibold text-slate-300 mb-1">
                No matching candidates found
              </p>
              <p className="text-xs text-slate-500">
                Try broadening your tactical prompt or using different keywords.
              </p>
            </div>
          )
        ) : (
          <EmptyState onSelectSuggestion={(s) => handleSearch(s)} />
        )}
      </main>

      <footer className="border-t border-slate-800/60 px-6 py-4 text-center text-xs text-slate-500 bg-slate-950/40">
        Scout AI · AWS Hackathon · Powered by Amazon Bedrock Titan & AWS Lambda
      </footer>
    </div>
  );
}
