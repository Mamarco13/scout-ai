"""
Player Data Processing Script for Scout AI (AWS Hackathon)
===========================================================
This script reads football player statistical data from CSV, cleans and normalizes
the records, filters players based on match involvement, generates comprehensive
natural language profiles in English (optimized for Amazon Bedrock / Titan Embeddings),
and exports the dataset to JSON.
"""

import os
import sys
import re
import csv
import json
import argparse
from pathlib import Path
import pandas as pd

# Ensure UTF-8 output encoding across Windows consoles
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass


# Position code mapping to English descriptive terminology
POS_MAP = {
    'GK': 'Goalkeeper',
    'DF': 'Defender',
    'MF': 'Midfielder',
    'FW': 'Forward',
    'DF,MF': 'Defender / Midfielder',
    'MF,DF': 'Midfielder / Defender',
    'MF,FW': 'Midfielder / Forward',
    'FW,MF': 'Forward / Midfielder',
    'DF,FW': 'Defender / Forward',
    'FW,DF': 'Forward / Defender',
}


def resolve_paths() -> tuple[Path, Path]:
    """
    Resolves input and output file paths dynamically, allowing
    execution from any working directory (project root, app/, or scripts/).
    """
    script_dir = Path(__file__).resolve().parent
    
    csv_candidates = [
        script_dir.parent / "data" / "jugadores_stats.csv",
        Path("../data/jugadores_stats.csv"),
        Path("app/data/jugadores_stats.csv"),
        Path("data/jugadores_stats.csv"),
    ]
    
    csv_path = None
    for p in csv_candidates:
        if p.exists():
            csv_path = p.resolve()
            break
            
    if csv_path is None:
        csv_path = (script_dir.parent / "data" / "jugadores_stats.csv").resolve()

    json_path = (csv_path.parent / "perfiles_procesados.json").resolve()
    return csv_path, json_path


def detect_separator_and_encoding(file_path: Path) -> tuple[str, str]:
    """
    Automatically detects the CSV delimiter (comma, semicolon, tab, pipe)
    and optimal file encoding to prevent parsing errors.
    """
    delimiters = [',', ';', '\t', '|']
    encodings = ['utf-8', 'latin-1', 'cp1252', 'utf-8-sig']
    
    for encoding in encodings:
        try:
            with open(file_path, 'r', encoding=encoding, errors='strict') as f:
                sample = f.read(4096)
                if not sample:
                    continue
                
                # Attempt sniffing via csv.Sniffer
                try:
                    sniffer = csv.Sniffer()
                    dialect = sniffer.sniff(sample, delimiters=',;\t|')
                    return dialect.delimiter, encoding
                except Exception:
                    first_line = sample.splitlines()[0] if sample.splitlines() else ''
                    counts = {d: first_line.count(d) for d in delimiters}
                    best_delim = max(counts, key=counts.get)
                    if counts[best_delim] > 0:
                        return best_delim, encoding
                    return ',', encoding
        except (UnicodeDecodeError, UnicodeError):
            continue
            
    return ',', 'latin-1'


def find_column(df: pd.DataFrame, possible_names: list[str]) -> str | None:
    """Finds a matching column in the DataFrame ignoring case and surrounding whitespace."""
    cols_lower = {c.strip().lower(): c for c in df.columns}
    for name in possible_names:
        clean_name = name.strip().lower()
        if clean_name in cols_lower:
            return cols_lower[clean_name]
    return None


def clean_str(val: any, default: str = "") -> str:
    """Cleans string values handling NaN and null representations."""
    if pd.isna(val) or val is None:
        return default
    val_str = str(val).strip()
    return val_str if val_str and val_str.lower() != 'nan' else default


def clean_int(val: any, default: int = 0) -> int:
    """Safely casts numeric/float/null values to integer."""
    if pd.isna(val) or val is None:
        return default
    try:
        return int(round(float(val)))
    except (ValueError, TypeError):
        return default


def clean_float(val: any, default: float = 0.0) -> float:
    """Safely casts numeric values to float."""
    if pd.isna(val) or val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def format_nationality(nation_raw: str) -> str:
    """Cleans country code representation (e.g. 'us USA' -> 'USA', 'ma MAR' -> 'MAR')."""
    if not nation_raw:
        return "Unknown"
    parts = nation_raw.split()
    return parts[-1] if len(parts) > 1 else nation_raw


def format_competition(comp_raw: str) -> str:
    """Cleans national prefix from competition names (e.g. 'eng Premier League' -> 'the Premier League')."""
    if not comp_raw:
        return "official competition"
    clean = re.sub(r'^[a-z]{2,3}\s+', '', comp_raw).strip()
    if clean.lower().startswith('the '):
        return clean
    if clean in ['Premier League', 'Bundesliga']:
        return f"the {clean}"
    return clean


def generate_text_profile(row: pd.Series, cols: dict) -> str:
    """
    Generates a rich, descriptive natural language narrative profile in English,
    tailored for semantic vector embeddings and AI scouting with Amazon Bedrock.
    """
    name = clean_str(row.get(cols.get('Player')), default="Player")
    age = clean_int(row.get(cols.get('Age')), default=0)
    pos_code = clean_str(row.get(cols.get('Pos')), default="Unknown position")
    position_en = POS_MAP.get(pos_code, pos_code)
    team = clean_str(row.get(cols.get('Squad')), default="their club")
    league = format_competition(clean_str(row.get(cols.get('Comp')), default=""))
    nationality = format_nationality(clean_str(row.get(cols.get('Nation')), default=""))
    
    matches = clean_int(row.get(cols.get('MP')), default=0)
    starts = clean_int(row.get(cols.get('Starts')), default=0)
    minutes = clean_int(row.get(cols.get('Min')), default=0)
    
    age_txt = f"{age}-year-old" if age > 0 else "player of unspecified age"
    nat_txt = f"from {nationality}" if nationality != "Unknown" else "with unconfirmed nationality"
    
    # Indefinite article agreement (a vs an)
    article = "an" if (str(age).startswith('8') or (age >= 11 and age <= 18)) else "a"
    intro = f"{name} is {article} {age_txt} {position_en.lower()} {nat_txt} playing for {team} in {league}."
    
    matches_txt = "1 appearance" if matches == 1 else f"{matches} appearances"
    starts_txt = "1 start" if starts == 1 else f"{starts} starts"
    min_txt = "1 minute" if minutes == 1 else f"{minutes} minutes"
    playing_time_txt = f"This season, he has recorded {matches_txt} ({starts_txt}), totaling {min_txt} on the pitch."
    
    # Differentiate narrative between Goalkeepers and Outfield Players
    if 'GK' in pos_code:
        saves = clean_int(row.get(cols.get('Saves')), default=0)
        save_pct = clean_float(row.get(cols.get('Save%')), default=0.0)
        goals_against = clean_int(row.get(cols.get('GA')), default=0)
        clean_sheets = clean_int(row.get(cols.get('CS')), default=0)
        
        saves_txt = "1 save" if saves == 1 else f"{saves} saves"
        ga_txt = "1 goal conceded" if goals_against == 1 else f"{goals_against} goals conceded"
        cs_txt = "1 clean sheet" if clean_sheets == 1 else f"{clean_sheets} clean sheets"
        
        stats_txt = (
            f"As a goalkeeper, he has registered {saves_txt} with a {save_pct:.1f}% save rate, "
            f"{ga_txt}, and kept {cs_txt}."
        )
    else:
        goals = clean_int(row.get(cols.get('Gls')), default=0)
        assists = clean_int(row.get(cols.get('Ast')), default=0)
        shots = clean_int(row.get(cols.get('Sh')), default=0)
        sot_pct = clean_float(row.get(cols.get('SoT%')), default=0.0)
        tackles = clean_int(row.get(cols.get('TklW')), default=0)
        interceptions = clean_int(row.get(cols.get('Int')), default=0)
        yellows = clean_int(row.get(cols.get('CrdY')), default=0)
        
        goals_txt = "1 goal" if goals == 1 else f"{goals} goals"
        assists_txt = "1 assist" if assists == 1 else f"{assists} assists"
        shots_txt = "1 total shot" if shots == 1 else f"{shots} total shots"
        tackles_txt = "1 tackle won" if tackles == 1 else f"{tackles} tackles won"
        interc_txt = "1 interception" if interceptions == 1 else f"{interceptions} interceptions"
        yellows_txt = "1 yellow card" if yellows == 1 else f"{yellows} yellow cards"
        
        stats_txt = (
            f"In attack and creation, he has tallied {goals_txt} and {assists_txt}, "
            f"attempting {shots_txt} ({sot_pct:.1f}% on target). "
            f"Defensively, he has delivered {tackles_txt}, {interc_txt}, and collected {yellows_txt}."
        )

    return f"{intro} {playing_time_txt} {stats_txt}"


def process_players(min_matches_filter: int | None = None) -> int:
    """
    Main ETL processing function for Scout AI data ingestion.
    """
    print("=" * 70)
    print("[Scout AI] Starting player data processing pipeline...")
    print("=" * 70)
    
    # 1. Resolve file paths
    csv_path, json_path = resolve_paths()
    print(f"[+] Input CSV:     {csv_path}")
    print(f"[+] Output JSON:   {json_path}")
    
    if not csv_path.exists():
        print(f"[ERROR] CSV file not found at: '{csv_path}'")
        sys.exit(1)
        
    # 2. Detect separator and encoding
    delimiter, encoding = detect_separator_and_encoding(csv_path)
    print(f"[+] Format detected: Delimiter='{delimiter}', Encoding='{encoding}'")
    
    try:
        df = pd.read_csv(csv_path, sep=delimiter, encoding=encoding, engine='python')
    except Exception as e:
        print(f"[!] Primary read with engine='python' failed: {e}. Falling back...")
        df = pd.read_csv(csv_path, sep=delimiter, encoding='latin-1')
        
    total_original = len(df)
    print(f"[+] Records loaded from original CSV: {total_original} rows x {len(df.columns)} columns.")

    # 3. Resilient column mapping
    cols = {
        'id': find_column(df, ['Rk', 'ID', 'Id', 'Rank', 'player_id']),
        'Player': find_column(df, ['Player', 'Jugador', 'Nombre', 'Name']),
        'Age': find_column(df, ['Age', 'Edad']),
        'Nation': find_column(df, ['Nation', 'Nacionalidad', 'Country', 'Pais']),
        'Pos': find_column(df, ['Pos', 'Position', 'Posicion']),
        'Squad': find_column(df, ['Squad', 'Equipo', 'Team', 'Club']),
        'Comp': find_column(df, ['Comp', 'Competicion', 'Liga', 'League']),
        'MP': find_column(df, ['MP', 'Matches Played', 'Matches_Played', 'PJ', 'Partidos']),
        'Starts': find_column(df, ['Starts', 'Titularidades', 'Titular']),
        'Min': find_column(df, ['Min', 'Minutos', 'Minutes']),
        'Gls': find_column(df, ['Gls', 'Goles', 'Goals']),
        'Ast': find_column(df, ['Ast', 'Asistencias', 'Assists']),
        'Sh': find_column(df, ['Sh', 'Tiros', 'Shots']),
        'SoT%': find_column(df, ['SoT%', 'SoT_pct', 'Punteria']),
        'TklW': find_column(df, ['TklW', 'Tackles', 'Entradas']),
        'Int': find_column(df, ['Int', 'Intercepciones', 'Interceptions']),
        'CrdY': find_column(df, ['CrdY', 'Tarjetas_Amarillas', 'Yellow_Cards']),
        'Saves': find_column(df, ['Saves', 'Paradas']),
        'Save%': find_column(df, ['Save%', 'Save_pct']),
        'GA': find_column(df, ['GA', 'Goles_Encajados']),
        'CS': find_column(df, ['CS', 'Porterias_Cero'])
    }
    
    col_mp = cols.get('MP')
    if not col_mp or col_mp not in df.columns:
        print("[ERROR] Could not identify a matches played column ('MP' or equivalent).")
        sys.exit(1)
        
    print(f"[+] Matches played column identified: '{col_mp}'")
    
    # Ensure numeric type
    df[col_mp] = pd.to_numeric(df[col_mp], errors='coerce').fillna(0).astype(int)
    
    max_matches_csv = int(df[col_mp].max())
    min_matches_csv = int(df[col_mp].min())
    print(f"[+] Match appearances range in dataset: Min={min_matches_csv}, Max={max_matches_csv}")

    # 4. Filter logic (Data Engineer insight)
    TARGET_MIN_MATCHES = 10
    
    if min_matches_filter is not None:
        threshold_to_use = min_matches_filter
        print(f"[+] Applying user-specified threshold: >= {threshold_to_use} matches.")
    elif max_matches_csv < TARGET_MIN_MATCHES:
        # DATA ENGINEER INSIGHT:
        # Early-season dataset (max MP = 6 across all records).
        # A rigid >= 10 filter would yield 0 records.
        threshold_to_use = min(2, max_matches_csv)
        print(f"[!] [DATA ENGINEER NOTICE]: Maximum '{col_mp}' in this CSV is {max_matches_csv} (< {TARGET_MIN_MATCHES}).")
        print(f"    Strictly filtering by >= {TARGET_MIN_MATCHES} would discard 100% of players (0 records).")
        print(f"    -> Intelligently adapting threshold to >= {threshold_to_use} matches to retain active players.")
    else:
        threshold_to_use = TARGET_MIN_MATCHES
        print(f"[+] Filtering players with at least {threshold_to_use} matches played...")

    df_filtered = df[df[col_mp] >= threshold_to_use].copy()
    print(f"[+] Records after filter (>= {threshold_to_use} matches): {len(df_filtered)} players retained.")
    
    # 5. Generate English text_profile
    print("[+] Generating 'text_profile' narrative column in English...")
    df_filtered['text_profile'] = df_filtered.apply(lambda row: generate_text_profile(row, cols), axis=1)
    
    # 6. Prepare export DataFrame
    col_id = cols.get('id')
    if col_id and col_id in df_filtered.columns:
        df_filtered['id'] = df_filtered[col_id].astype(str)
    else:
        df_filtered['id'] = (df_filtered.index + 1).astype(str)
        
    col_player = cols.get('Player', 'Player')
    col_pos = cols.get('Pos', 'Pos')
    col_squad = cols.get('Squad', 'Squad')
    col_comp = cols.get('Comp', 'Comp')
    col_age = cols.get('Age', 'Age')
    
    export_columns = ['id']
    if col_player in df_filtered.columns:
        df_filtered['Player'] = df_filtered[col_player].fillna('Unknown')
        export_columns.append('Player')
    if col_pos in df_filtered.columns:
        df_filtered['Pos'] = df_filtered[col_pos].fillna('')
        export_columns.append('Pos')
    if col_squad in df_filtered.columns:
        df_filtered['Squad'] = df_filtered[col_squad].fillna('')
        export_columns.append('Squad')
    if col_comp in df_filtered.columns:
        df_filtered['Comp'] = df_filtered[col_comp].fillna('')
        export_columns.append('Comp')
    if col_age in df_filtered.columns:
        df_filtered['Age'] = pd.to_numeric(df_filtered[col_age], errors='coerce').fillna(0).astype(int)
        export_columns.append('Age')
    if col_mp in df_filtered.columns:
        df_filtered['MP'] = df_filtered[col_mp]
        export_columns.append('MP')
        
    export_columns.append('text_profile')
    result_df = df_filtered[export_columns]

    # 7. Export to JSON
    print(f"[+] Exporting profiles to '{json_path}'...")
    json_path.parent.mkdir(parents=True, exist_ok=True)
    result_df.to_json(json_path, orient='records', force_ascii=False, indent=2)
    
    print("-" * 70)
    print(f"[SUCCESS] Processed and exported {len(result_df)} players successfully.")
    print(f"[+] Output JSON file: {json_path}")
    print("=" * 70)
    
    if not result_df.empty:
        sample = result_df.iloc[0]
        print(f"\n[Sample Generated Profile - {sample.get('Player')}]:")
        print(f"{sample.get('text_profile')}\n")

    return len(result_df)


# Backward-compatible alias
procesar_jugadores = process_players


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scout AI Player Data Ingestion Pipeline")
    parser.add_argument(
        "--min-matches",
        type=int,
        default=None,
        help="Minimum matches played filter (automatically adapts if CSV maximum < 10)"
    )
    args = parser.parse_args()
    
    process_players(min_matches_filter=args.min_matches)