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
} from "lucide-react";
import { type Player, type PlayerStat } from "./data/mockPlayers";

// Call Next.js internal API route proxy to eliminate all browser CORS and preflight blocks
const BACKEND_API_URL = "/api/search";

// Flag emoji map by ISO country code
const FLAG_MAP: Record<string, string> = {
  ESP: "🇪🇸",
  FRA: "🇫🇷",
  ENG: "🏴󠁧󠁢󠁥󠁮󠁧󠁿",
  GER: "🇩🇪",
  ITA: "🇮🇹",
  BRA: "🇧🇷",
  ARG: "🇦🇷",
  USA: "🇺🇸",
  MAR: "🇲🇦",
  POR: "🇵🇹",
  NED: "🇳🇱",
  BEL: "🇧🇪",
  URU: "🇺🇾",
  COL: "🇨🇴",
  SEN: "🇸🇳",
  NGA: "🇳🇬",
  ALG: "🇩🇿",
  EGY: "🇪🇬",
  JPN: "🇯🇵",
  KOR: "🇰🇷",
  CRO: "🇭🇷",
  SWE: "🇸🇪",
  NOR: "🇳🇴",
  DEN: "🇩🇰",
  SUI: "🇨🇭",
  AUT: "🇦🇹",
  SCO: "🏴󠁧󠁢󠁳󠁣󠁴󠁿",
  WAL: "🏴󠁧󠁢󠁷󠁬󠁳󠁿",
  IRL: "🇮🇪",
  POL: "🇵🇱",
  CZE: "🇨🇿",
  UKR: "🇺🇦",
  TUR: "🇹🇷",
  GRE: "🇬🇷",
  SRB: "🇷🇸",
  CIV: "🇨🇮",
  GHA: "🇬🇭",
  CMR: "🇨🇲",
  MLI: "🇲🇱",
  TUN: "🇹🇳",
  CHI: "🇨🇱",
  PAR: "🇵🇾",
  ECU: "🇪🇨",
  PER: "🇵🇪",
  VEN: "🇻🇪",
  MEX: "🇲🇽",
  CAN: "🇨🇦",
  AUS: "🇦🇺",
};

interface ApiPlayer {
  id: string | number;
  Player: string;
  Pos: string;
  Squad: string;
  Comp?: string;
  Age: number;
  text_profile: string;
}

interface SearchResultItem {
  jugador: ApiPlayer;
  similitud: number;
}

function parseStatsFromProfile(text: string): PlayerStat[] {
  if (!text) return [];

  // Goalkeeper stats
  const savesMatch = text.match(/(\d+)\s+saves?/i);
  const saveRateMatch = text.match(/([\d.]+)%\s+save\s+rate/i);
  const cleanSheetsMatch = text.match(/(\d+)\s+clean\s+sheets?/i);

  if (savesMatch || saveRateMatch || text.toLowerCase().includes("goalkeeper")) {
    return [
      {
        label: "Saves",
        value: savesMatch ? parseInt(savesMatch[1], 10) : 0,
        max: 30,
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
        max: 5,
      },
    ];
  }

  // Outfield player stats
  const goalsMatch = text.match(/(\d+)\s+goals?/i);
  const assistsMatch = text.match(/(\d+)\s+assists?/i);
  const tacklesMatch = text.match(/(\d+)\s+tackles?\s+won/i);

  return [
    {
      label: "Goals",
      value: goalsMatch ? parseInt(goalsMatch[1], 10) : 0,
      max: 10,
    },
    {
      label: "Assists",
      value: assistsMatch ? parseInt(assistsMatch[1], 10) : 0,
      max: 10,
    },
    {
      label: "Tackles Won",
      value: tacklesMatch ? parseInt(tacklesMatch[1], 10) : 0,
      max: 15,
    },
  ];
}

function extractNationality(text: string): string {
  const match = text.match(/from\s+([A-Z]{2,4})\b/i);
  if (match) return match[1].toUpperCase();
  return "ESP";
}

function mapApiResultToPlayer(item: SearchResultItem, index: number): Player {
  const { jugador, similitud } = item;
  const profileText = jugador.text_profile || "";
  const stats = parseStatsFromProfile(profileText);
  const nationality = extractNationality(profileText);
  const flag = FLAG_MAP[nationality] || "⚽";

  // Compatibility percentage score
  const rawPct = Math.round((similitud / 0.5) * 100);
  const matchPercentage = Math.min(Math.max(rawPct, 55), 98);

  const competition = jugador.Comp
    ? ` • ${jugador.Comp.replace(/^[a-z]{2,3}\s+/i, "")}`
    : "";

  return {
    id: String(jugador.id || `result-${index + 1}`),
    name: jugador.Player || "Player",
    age: jugador.Age || 0,
    currentTeam: `${jugador.Squad || "Club"}${competition}`,
    position: jugador.Pos || "Position",
    marketValue: `${(similitud * 100).toFixed(1)}% match`,
    matchPercentage,
    aiSummary: profileText,
    stats,
    nationality,
    flag,
  };
}

// ────────────────────────────────────────────
// HEADER
// ────────────────────────────────────────────
function Header() {
  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800/60 backdrop-blur-sm bg-slate-950/40">
      <div className="flex items-center gap-3">
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <Zap className="w-5 h-5 text-emerald-400" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white leading-none">
            Scout <span className="gradient-text">AI</span>
          </h1>
          <p className="text-[10px] text-slate-500 tracking-widest uppercase mt-0.5">
            Tactical Intelligence for Transfer Markets
          </p>
        </div>
      </div>

      <div className="hidden md:flex items-center gap-6">
        <nav className="flex items-center gap-5 text-sm text-slate-400">
          <a
            href="#"
            className="hover:text-emerald-400 transition-colors duration-200"
          >
            Search
          </a>
          <a
            href="#"
            className="hover:text-emerald-400 transition-colors duration-200"
          >
            Compare
          </a>
          <a
            href="#"
            className="hover:text-emerald-400 transition-colors duration-200"
          >
            Reports
          </a>
        </nav>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          AWS Bedrock Live
        </div>
      </div>
    </header>
  );
}

// ────────────────────────────────────────────
// HERO SECTION
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
  onSearch: () => void;
  isLoading: boolean;
  textareaRef: React.RefObject<HTMLTextAreaElement | null>;
}) {
  return (
    <section className="relative px-6 pt-20 pb-16 text-center">
      <div className="absolute inset-0 grid-pattern pointer-events-none opacity-50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="relative max-w-4xl mx-auto animate-fade-in-up">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium mb-6 tracking-wide">
          <Brain className="w-3.5 h-3.5" />
          Vector Semantic Search · Amazon Titan & Lambda
        </div>

        <h2 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.08] mb-4">
          Discover your next{" "}
          <span className="gradient-text">ideal signing</span>
        </h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
          Describe the tactical profile you need in your own words. AWS Bedrock analyzes
          semantic vector embeddings across 1,600+ players to deliver your top 5 recommendations.
        </p>

        {/* Search bar */}
        <div className="search-bar-glow relative flex items-center bg-slate-900/80 border border-slate-700/60 rounded-2xl p-2 max-w-3xl mx-auto transition-all duration-300">
          <Search className="ml-3 w-5 h-5 text-slate-500 flex-shrink-0" />
          <textarea
            ref={textareaRef}
            id="search-query"
            rows={2}
            value={query}
            autoComplete="off"
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="e.g., Box-to-box midfielder who breaks lines with progressive passing and intense pressing..."
            className="flex-1 bg-transparent text-white placeholder-slate-500 text-sm px-4 py-2 resize-none outline-none leading-relaxed"
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
            onClick={onSearch}
            disabled={isLoading}
            className="flex-shrink-0 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-75 disabled:cursor-wait text-slate-950 font-bold text-sm px-6 py-3 rounded-xl transition-all duration-200 active:scale-95 shadow-lg shadow-emerald-500/20 cursor-pointer"
          >
            {isLoading ? (
              <>
                <RefreshCw className="w-4 h-4 animate-spin" />
                Searching...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Search
              </>
            )}
          </button>
        </div>

        {/* Quick stat pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-8 text-xs text-slate-500">
          {[
            "⚡ Bedrock Titan Text v2 (1024-d)",
            "🧠 Cosine similarity vector matching",
            "🏆 Top 5 real-time recommendations",
          ].map((pill) => (
            <span
              key={pill}
              className="px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/40"
            >
              {pill}
            </span>
          ))}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────
// MATCH RING
// ────────────────────────────────────────────
function MatchRing({ percentage }: { percentage: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 85 ? "#10b981" : percentage >= 70 ? "#34d399" : "#6ee7b7";

  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke="#1e293b"
          strokeWidth="6"
        />
        <circle
          cx="36"
          cy="36"
          r={radius}
          fill="none"
          stroke={color}
          strokeWidth="6"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 1s ease-out" }}
        />
      </svg>
      <div className="absolute flex flex-col items-center">
        <span className="text-sm font-bold text-white leading-none">
          {percentage}%
        </span>
        <span className="text-[9px] text-slate-500 mt-0.5">match</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// STAT BAR
// ────────────────────────────────────────────
function StatBar({
  label,
  value,
  unit,
  max,
}: {
  label: string;
  value: number;
  unit?: string;
  max: number;
}) {
  const pct = Math.min((value / max) * 100, 100);
  return (
    <div className="space-y-1.5">
      <div className="flex justify-between items-center text-xs">
        <span className="text-slate-400 font-medium">{label}</span>
        <span className="text-emerald-400 font-semibold tabular-nums">
          {value}
          {unit}
        </span>
      </div>
      <div className="h-1.5 bg-slate-800 rounded-full overflow-hidden">
        <div
          className="h-full rounded-full progress-bar-fill"
          style={{
            width: `${pct}%`,
            background: `linear-gradient(90deg, #059669, #10b981)`,
          }}
        />
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// PLAYER CARD
// ────────────────────────────────────────────
function PlayerCard({ player, index }: { player: Player; index: number }) {
  const delayClass =
    [
      `animate-fade-in-up-delay-1`,
      `animate-fade-in-up-delay-2`,
      `animate-fade-in-up-delay-3`,
    ][index] ?? "animate-fade-in-up";

  return (
    <article
      className={`card-glow group relative flex flex-col bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-emerald-500/30 hover:-translate-y-1 ${delayClass}`}
    >
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          <div className="relative flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-2xl select-none border border-slate-700/60">
            {player.flag}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-base leading-tight truncate">
              {player.name}
            </h3>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
              <MapPin className="w-3 h-3 flex-shrink-0 text-emerald-400/80" />
              <span className="truncate">{player.currentTeam}</span>
            </div>
          </div>
        </div>
        <MatchRing percentage={player.matchPercentage} />
      </div>

      {/* Badges */}
      <div className="px-5 flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 text-xs text-slate-300 font-medium border border-slate-700/40">
          <Target className="w-3 h-3 text-emerald-400" />
          {player.position}
        </span>
        {player.age > 0 && (
          <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 text-xs text-slate-300 font-medium border border-slate-700/40">
            <Users className="w-3 h-3 text-sky-400" />
            {player.age} yrs
          </span>
        )}
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-xs text-emerald-400 font-semibold border border-emerald-500/20">
          <Sparkles className="w-3 h-3" />
          {player.marketValue}
        </span>
      </div>

      {/* Generative AI Summary */}
      <div className="px-5 mb-5">
        <div className="flex items-center gap-1.5 mb-2">
          <Brain className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Generative Tactical Profile
          </span>
        </div>
        <p className="text-sm text-slate-300/90 leading-relaxed line-clamp-4">
          {player.aiSummary}
        </p>
      </div>

      {/* Stats */}
      {player.stats && player.stats.length > 0 && (
        <div className="px-5 pb-5 space-y-3 mt-auto">
          <div className="flex items-center gap-1.5 mb-1">
            <Activity className="w-3.5 h-3.5 text-slate-500" />
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Key Metrics
            </span>
          </div>
          {player.stats.map((stat) => (
            <StatBar key={stat.label} {...stat} />
          ))}
        </div>
      )}

      {/* CTA Button */}
      <div className="px-5 pb-5 pt-1">
        <button
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700/60 text-slate-400 text-sm font-medium hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all duration-200 group cursor-pointer"
          aria-label={`View profile of ${player.name}`}
        >
          View Scouting Report
          <ChevronRight className="w-4 h-4 group-hover:translate-x-0.5 transition-transform" />
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
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-lg font-bold text-white flex items-center gap-2">
            <TrendingUp className="w-5 h-5 text-emerald-400" />
            Top Recommended Candidates
            <span className="ml-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-sm font-semibold border border-emerald-500/20">
              {players.length}
            </span>
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Ranked in real time by AWS Lambda & Amazon Bedrock
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-400 bg-slate-900/60 border border-slate-800 px-3 py-1.5 rounded-lg">
          <Shield className="w-3.5 h-3.5 text-emerald-400" />
          Ranked by vector cosine similarity
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
        {players.map((player, i) => (
          <PlayerCard key={player.id} player={player} index={i} />
        ))}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────
// LOADING SKELETON
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
          Querying Amazon Bedrock & Vector Database...
        </h3>
        <p className="text-sm text-slate-400 max-w-md">
          Generating embedding with Titan Text v2 and calculating cosine similarities
          to extract the top 5 tactical candidates.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 opacity-40">
        {[1, 2, 3].map((n) => (
          <div
            key={n}
            className="h-80 bg-slate-900/40 border border-slate-800 rounded-2xl animate-pulse"
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
      <div className="flex flex-col items-center text-center p-6 rounded-2xl bg-rose-500/10 border border-rose-500/30">
        <AlertCircle className="w-10 h-10 text-rose-400 mb-3" />
        <h3 className="text-base font-semibold text-rose-300 mb-1">
          Error Connecting to AWS Backend
        </h3>
        <p className="text-sm text-rose-200/80 mb-5 leading-relaxed">
          {message}
        </p>
        <button
          onClick={onRetry}
          className="flex items-center gap-2 px-4 py-2 rounded-xl bg-rose-500 hover:bg-rose-400 text-slate-950 text-sm font-semibold transition-all duration-200 cursor-pointer"
        >
          <RefreshCw className="w-4 h-4" />
          Retry Search
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
  const suggestions = [
    "Box-to-box midfielder similar to Rodri",
    "Fast, agile winger creating chances in transition and dangerous in 1v1 duels",
    "Dominant goalkeeper with excellent reflexes, high save percentage, and aerial reach",
    "Ball-playing center back with composure under pressure and defensive duel win rate",
  ];

  return (
    <section className="px-6 pb-20 max-w-4xl mx-auto w-full text-center">
      <div className="flex items-center justify-center w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-800/60 border border-slate-700/40">
        <Search className="w-7 h-7 text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">
        Perform your first semantic search
      </h3>
      <p className="text-slate-500 text-sm mb-8 max-w-md mx-auto">
        Describe the tactical characteristics you require in natural language, and
        Amazon Bedrock will identify the highest compatibility matches.
      </p>
      <div className="space-y-2.5">
        <p className="text-xs text-slate-600 uppercase tracking-widest mb-3">
          Example queries (click to test)
        </p>
        {suggestions.map((s) => (
          <button
            key={s}
            onClick={() => onSelectSuggestion(s)}
            className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-700/30 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200 text-sm text-slate-400 hover:text-slate-200 cursor-pointer"
          >
            <Star className="w-4 h-4 text-emerald-500/60 flex-shrink-0" />
            {s}
          </button>
        ))}
      </div>
    </section>
  );
}

// ────────────────────────────────────────────
// PAGE ROOT COMPONENT
// ────────────────────────────────────────────
export default function Home() {
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [players, setPlayers] = useState<Player[]>([]);
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  // Sync with DOM value if browser restored cached value
  useEffect(() => {
    if (textareaRef.current?.value && !query) {
      setQuery(textareaRef.current.value);
    }
  }, []);

  const handleSearch = async (overrideQuery?: string) => {
    // Read from overrideQuery, textarea DOM ref, or React state
    const domValue = textareaRef.current?.value ?? "";
    const textToSearch = (overrideQuery ?? (query.trim() || domValue)).trim();

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
      const response = await fetch(BACKEND_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ query: textToSearch }),
      });

      if (!response.ok) {
        const errorBody = await response.text();
        throw new Error(
          `Server returned ${response.status}: ${errorBody || response.statusText}`
        );
      }

      const data = await response.json();

      if (!Array.isArray(data)) {
        throw new Error(
          data?.error || "Invalid response format: expected an array of results."
        );
      }

      const formattedPlayers: Player[] = data.map(
        (item: SearchResultItem, idx: number) => mapApiResultToPlayer(item, idx)
      );

      setPlayers(formattedPlayers);
      setHasSearched(true);
    } catch (err: unknown) {
      console.error("Search error:", err);
      const message =
        err instanceof Error
          ? err.message
          : "Unexpected error communicating with AWS Lambda.";
      setErrorMessage(message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="hero-bg min-h-screen flex flex-col">
      <Header />
      <HeroSection
        query={query}
        onQueryChange={setQuery}
        onSearch={() => handleSearch()}
        isLoading={isLoading}
        textareaRef={textareaRef}
      />
      <div className="flex-1 flex flex-col">
        {isLoading ? (
          <LoadingState />
        ) : errorMessage ? (
          <ErrorState message={errorMessage} onRetry={() => handleSearch()} />
        ) : hasSearched ? (
          players.length > 0 ? (
            <ResultsSection players={players} />
          ) : (
            <div className="text-center py-16 text-slate-400">
              No candidates found matching this search criteria.
            </div>
          )
        ) : (
          <EmptyState onSelectSuggestion={(s) => handleSearch(s)} />
        )}
      </div>

      <footer className="border-t border-slate-800/50 px-6 py-4 text-center text-xs text-slate-600">
        Scout AI · AWS Hackathon · Powered by Amazon Bedrock & AWS Lambda
      </footer>
    </div>
  );
}
