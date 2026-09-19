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
  marketValue: string;
  matchPercentage: number;
  aiSummary: string;
  stats: PlayerStat[];
  nationality: string;
  flag: string;
}

export const mockPlayers: Player[] = [
  {
    id: "1",
    name: "Lamine Varela",
    age: 21,
    currentTeam: "Sporting CP",
    position: "Mediocentro",
    marketValue: "€28M",
    matchPercentage: 94,
    nationality: "Portugal",
    flag: "🇵🇹",
    aiSummary:
      "Varela destaca por su extraordinaria capacidad de romper líneas con pase progresivo y presión alta. Su perfil físico y técnico es altamente compatible con sistemas de pressing intenso. Jugador perfecto para liderar la transición defensa-ataque.",
    stats: [
      { label: "Pases progresivos", value: 9.4, unit: "/90", max: 15 },
      { label: "Intercepciones", value: 7.1, unit: "/90", max: 10 },
      { label: "Duelos ganados", value: 68, unit: "%", max: 100 },
    ],
  },
  {
    id: "2",
    name: "Matías Enzo Herrera",
    age: 22,
    currentTeam: "River Plate",
    position: "Mediocentro Defensivo",
    marketValue: "€15M",
    matchPercentage: 87,
    nationality: "Argentina",
    flag: "🇦🇷",
    aiSummary:
      "Herrera combina una lectura táctica excepcional con una capacidad física sobresaliente. Su habilidad para anticipar movimientos rivales y distribuir el balón con precisión lo convierte en un pivote defensivo de primer nivel a nivel continental.",
    stats: [
      { label: "Pases progresivos", value: 7.8, unit: "/90", max: 15 },
      { label: "Intercepciones", value: 8.9, unit: "/90", max: 10 },
      { label: "Duelos ganados", value: 72, unit: "%", max: 100 },
    ],
  },
  {
    id: "3",
    name: "Theo Mühlbach",
    age: 20,
    currentTeam: "RB Leipzig (Sub-23)",
    position: "Mediocentro",
    marketValue: "€8M",
    matchPercentage: 81,
    nationality: "Alemania",
    flag: "🇩🇪",
    aiSummary:
      "Joven promesa del fútbol alemán formada en la cantera RB con el ADN de pressing y transiciones rápidas. Mühlbach ya muestra una madurez táctica impropia de su edad, con capacidad para jugar tanto de '6' como de '8' en sistemas de doble pivote.",
    stats: [
      { label: "Pases progresivos", value: 8.2, unit: "/90", max: 15 },
      { label: "Intercepciones", value: 5.6, unit: "/90", max: 10 },
      { label: "Duelos ganados", value: 61, unit: "%", max: 100 },
    ],
  },
];
