"use client";

import { useState } from "react";
import {
  Search,
  Zap,
  Target,
  TrendingUp,
  Shield,
  Users,
  Euro,
  MapPin,
  Brain,
  ChevronRight,
  Activity,
  Star,
} from "lucide-react";
import { mockPlayers, type Player } from "./data/mockPlayers";

// ────────────────────────────────────────────
// HEADER
// ────────────────────────────────────────────
function Header() {
  return (
    <header className="relative z-10 flex items-center justify-between px-6 py-4 border-b border-slate-800/60 backdrop-blur-sm bg-slate-950/40">
      <div className="flex items-center gap-3">
        {/* Logo mark */}
        <div className="flex items-center justify-center w-9 h-9 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <Zap className="w-5 h-5 text-emerald-400" strokeWidth={2.5} />
        </div>
        <div>
          <h1 className="text-xl font-bold tracking-tight text-white leading-none">
            Scout <span className="gradient-text">AI</span>
          </h1>
          <p className="text-[10px] text-slate-500 tracking-widest uppercase mt-0.5">
            Inteligencia Táctica para Mercado de Fichajes
          </p>
        </div>
      </div>

      {/* Nav right */}
      <div className="hidden md:flex items-center gap-6">
        <nav className="flex items-center gap-5 text-sm text-slate-400">
          <a href="#" className="hover:text-emerald-400 transition-colors duration-200">Búsqueda</a>
          <a href="#" className="hover:text-emerald-400 transition-colors duration-200">Comparar</a>
          <a href="#" className="hover:text-emerald-400 transition-colors duration-200">Informes</a>
        </nav>
        <div className="flex items-center gap-2 px-3 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs font-medium">
          <span className="relative flex h-2 w-2">
            <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
            <span className="relative inline-flex rounded-full h-2 w-2 bg-emerald-500"></span>
          </span>
          AWS Bedrock Activo
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
}: {
  query: string;
  onQueryChange: (v: string) => void;
  onSearch: () => void;
  isLoading: boolean;
}) {
  return (
    <section className="relative px-6 pt-20 pb-16 text-center">
      {/* Background decoration */}
      <div className="absolute inset-0 grid-pattern pointer-events-none opacity-50" />
      <div className="absolute top-0 left-1/2 -translate-x-1/2 w-96 h-px bg-gradient-to-r from-transparent via-emerald-500/50 to-transparent" />

      <div className="relative max-w-4xl mx-auto animate-fade-in-up">
        {/* Eyebrow badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs font-medium mb-6 tracking-wide">
          <Brain className="w-3.5 h-3.5" />
          Análisis predictivo con IA Generativa · Amazon Bedrock
        </div>

        <h2 className="text-5xl md:text-6xl font-extrabold text-white tracking-tight leading-[1.08] mb-4">
          Encuentra tu próximo{" "}
          <span className="gradient-text">jugador ideal</span>
        </h2>
        <p className="text-slate-400 text-lg max-w-2xl mx-auto mb-12 leading-relaxed">
          Describe con tus propias palabras el perfil que buscas. La IA analizará
          miles de jugadores y encontrará los candidatos más compatibles con tu
          sistema de juego.
        </p>

        {/* Search bar */}
        <div className="search-bar-glow relative flex items-center bg-slate-900/80 border border-slate-700/60 rounded-2xl p-2 max-w-3xl mx-auto transition-all duration-300">
          <Search className="ml-3 w-5 h-5 text-slate-500 flex-shrink-0" />
          <textarea
            id="search-query"
            rows={2}
            value={query}
            onChange={(e) => onQueryChange(e.target.value)}
            placeholder="Ej: Busco un mediocentro sub-23 que rompa líneas en salida de balón como Rodri..."
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
            onClick={onSearch}
            disabled={isLoading || !query.trim()}
            className="flex-shrink-0 flex items-center gap-2 bg-emerald-500 hover:bg-emerald-400 disabled:bg-emerald-500/30 disabled:cursor-not-allowed text-slate-950 font-semibold text-sm px-5 py-3 rounded-xl transition-all duration-200 active:scale-95"
          >
            {isLoading ? (
              <>
                <span className="animate-spin inline-block w-4 h-4 border-2 border-slate-900 border-t-transparent rounded-full" />
                Analizando...
              </>
            ) : (
              <>
                <Zap className="w-4 h-4" />
                Buscar
              </>
            )}
          </button>
        </div>

        {/* Quick stat pills */}
        <div className="flex flex-wrap justify-center gap-3 mt-8 text-xs text-slate-500">
          {["⚽ +12,000 jugadores indexados", "📊 47 métricas por perfil", "🌍 32 ligas analizadas"].map(
            (pill) => (
              <span key={pill} className="px-3 py-1 rounded-full bg-slate-800/60 border border-slate-700/40">
                {pill}
              </span>
            )
          )}
        </div>
      </div>
    </section>
  );
}

// ────────────────────────────────────────────
// MATCH PERCENTAGE RING
// ────────────────────────────────────────────
function MatchRing({ percentage }: { percentage: number }) {
  const radius = 28;
  const circumference = 2 * Math.PI * radius;
  const offset = circumference - (percentage / 100) * circumference;

  const color =
    percentage >= 90 ? "#10b981" : percentage >= 80 ? "#34d399" : "#6ee7b7";

  return (
    <div className="relative flex items-center justify-center w-20 h-20">
      <svg className="w-20 h-20 -rotate-90" viewBox="0 0 72 72">
        <circle cx="36" cy="36" r={radius} fill="none" stroke="#1e293b" strokeWidth="6" />
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
        <span className="text-sm font-bold text-white leading-none">{percentage}%</span>
        <span className="text-[9px] text-slate-500 mt-0.5">match</span>
      </div>
    </div>
  );
}

// ────────────────────────────────────────────
// STAT BAR
// ────────────────────────────────────────────
function StatBar({ label, value, unit, max }: { label: string; value: number; unit?: string; max: number }) {
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
  const delayClass = [`animate-fade-in-up-delay-1`, `animate-fade-in-up-delay-2`, `animate-fade-in-up-delay-3`][index] ?? "animate-fade-in-up";

  return (
    <article
      className={`card-glow group relative flex flex-col bg-slate-900/60 backdrop-blur-sm border border-slate-700/50 rounded-2xl overflow-hidden transition-all duration-300 hover:border-emerald-500/30 hover:-translate-y-1 ${delayClass}`}
    >
      {/* Card top accent line */}
      <div className="absolute top-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-emerald-500/40 to-transparent" />

      {/* Header */}
      <div className="px-5 pt-5 pb-4 flex items-start justify-between gap-3">
        <div className="flex items-center gap-3 min-w-0">
          {/* Avatar placeholder */}
          <div className="relative flex-shrink-0 w-12 h-12 rounded-xl bg-gradient-to-br from-slate-700 to-slate-800 flex items-center justify-center text-xl select-none border border-slate-700/60">
            {player.flag}
          </div>
          <div className="min-w-0">
            <h3 className="font-bold text-white text-base leading-tight truncate">{player.name}</h3>
            <div className="flex items-center gap-1.5 mt-0.5 text-xs text-slate-400">
              <MapPin className="w-3 h-3 flex-shrink-0" />
              <span className="truncate">{player.currentTeam}</span>
            </div>
          </div>
        </div>
        <MatchRing percentage={player.matchPercentage} />
      </div>

      {/* Badges row */}
      <div className="px-5 flex flex-wrap gap-2 mb-4">
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 text-xs text-slate-300 font-medium border border-slate-700/40">
          <Target className="w-3 h-3 text-emerald-400" />
          {player.position}
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-slate-800/80 text-xs text-slate-300 font-medium border border-slate-700/40">
          <Users className="w-3 h-3 text-sky-400" />
          {player.age} años
        </span>
        <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg bg-emerald-500/10 text-xs text-emerald-400 font-semibold border border-emerald-500/20">
          <Euro className="w-3 h-3" />
          {player.marketValue}
        </span>
      </div>

      {/* AI Summary */}
      <div className="px-5 mb-5">
        <div className="flex items-center gap-1.5 mb-2">
          <Brain className="w-3.5 h-3.5 text-emerald-400" />
          <span className="text-xs font-semibold text-emerald-400 uppercase tracking-wider">
            Análisis IA
          </span>
        </div>
        <p className="text-sm text-slate-400 leading-relaxed line-clamp-3">
          {player.aiSummary}
        </p>
      </div>

      {/* Stats */}
      <div className="px-5 pb-5 space-y-3 mt-auto">
        <div className="flex items-center gap-1.5 mb-1">
          <Activity className="w-3.5 h-3.5 text-slate-500" />
          <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
            Métricas clave
          </span>
        </div>
        {player.stats.map((stat) => (
          <StatBar key={stat.label} {...stat} />
        ))}
      </div>

      {/* CTA */}
      <div className="px-5 pb-5 pt-1">
        <button
          className="w-full flex items-center justify-center gap-2 py-2.5 rounded-xl border border-slate-700/60 text-slate-400 text-sm font-medium hover:border-emerald-500/40 hover:text-emerald-400 hover:bg-emerald-500/5 transition-all duration-200 group"
          aria-label={`Ver perfil completo de ${player.name}`}
        >
          Ver perfil completo
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
            Candidatos encontrados
            <span className="ml-1 px-2 py-0.5 rounded-md bg-emerald-500/10 text-emerald-400 text-sm font-semibold border border-emerald-500/20">
              {players.length}
            </span>
          </h2>
          <p className="text-slate-500 text-sm mt-0.5">
            Ordenados por compatibilidad con tu perfil de búsqueda
          </p>
        </div>
        <div className="hidden sm:flex items-center gap-2 text-xs text-slate-500">
          <Shield className="w-3.5 h-3.5 text-emerald-500" />
          Verificado con datos Opta & StatsBomb
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
// EMPTY STATE
// ────────────────────────────────────────────
function EmptyState() {
  const suggestions = [
    "Lateral derecho sub-25 con calidad en el uno contra uno",
    "Delantero centro que presione en la salida rival y sea referencia aérea",
    "Portero con buen juego de pies para un sistema de salida desde atrás",
  ];
  return (
    <section className="px-6 pb-20 max-w-4xl mx-auto w-full text-center">
      <div className="flex items-center justify-center w-16 h-16 mx-auto mb-5 rounded-2xl bg-slate-800/60 border border-slate-700/40">
        <Search className="w-7 h-7 text-slate-500" />
      </div>
      <h3 className="text-lg font-semibold text-white mb-2">Realiza tu primera búsqueda</h3>
      <p className="text-slate-500 text-sm mb-8">
        Describe el perfil del jugador que necesitas en lenguaje natural y la IA
        encontrará los mejores candidatos.
      </p>
      <div className="space-y-2.5">
        <p className="text-xs text-slate-600 uppercase tracking-widest mb-3">
          Ejemplos de búsqueda
        </p>
        {suggestions.map((s) => (
          <button
            key={s}
            className="flex items-center gap-3 w-full text-left px-4 py-3 rounded-xl bg-slate-800/40 border border-slate-700/30 hover:border-emerald-500/30 hover:bg-emerald-500/5 transition-all duration-200 text-sm text-slate-400 hover:text-slate-300"
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
// PAGE ROOT
// ────────────────────────────────────────────
export default function Home() {
  const [query, setQuery] = useState("");
  const [hasSearched, setHasSearched] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const handleSearch = () => {
    if (!query.trim()) return;
    setIsLoading(true);
    // Simulate AI processing delay
    setTimeout(() => {
      setIsLoading(false);
      setHasSearched(true);
    }, 1600);
  };

  return (
    <div className="hero-bg min-h-screen flex flex-col">
      <Header />
      <HeroSection
        query={query}
        onQueryChange={setQuery}
        onSearch={handleSearch}
        isLoading={isLoading}
      />
      <div className="flex-1 flex flex-col">
        {hasSearched ? (
          <ResultsSection players={mockPlayers} />
        ) : (
          <EmptyState />
        )}
      </div>

      {/* Footer */}
      <footer className="border-t border-slate-800/50 px-6 py-4 text-center text-xs text-slate-600">
        Scout AI · MVP Hackathon AWS · Powered by Amazon Bedrock & Claude 3
      </footer>
    </div>
  );
}
