"""
Script de Procesamiento de Jugadores para Scout AI (AWS Hackathon)
===================================================================
Este script lee el archivo de estadísticas de jugadores, limpia los datos,
filtra por partidos jugados, genera perfiles textuales en lenguaje natural (español)
optimizados para embeddings / AWS Bedrock / OpenSearch, y los exporta en formato JSON.
"""

import os
import sys
import re
import csv
import json
import argparse
from pathlib import Path
import pandas as pd

# Asegurar compatibilidad de salida UTF-8 en consolas Windows
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass


# Mapeo de posiciones a términos en español
POS_MAP = {
    'GK': 'Portero',
    'DF': 'Defensa',
    'MF': 'Centrocampista',
    'FW': 'Delantero',
    'DF,MF': 'Defensa / Centrocampista',
    'MF,DF': 'Centrocampista / Defensa',
    'MF,FW': 'Centrocampista / Delantero',
    'FW,MF': 'Delantero / Centrocampista',
    'DF,FW': 'Defensa / Delantero',
    'FW,DF': 'Delantero / Defensa',
}


def resolver_rutas() -> tuple[Path, Path]:
    """
    Resuelve las rutas de los archivos de entrada y salida de forma robusta,
    permitiendo la ejecución tanto desde la raíz del proyecto como desde scripts/.
    """
    script_dir = Path(__file__).resolve().parent
    
    # Lista de posibles ubicaciones del archivo CSV
    csv_candidatos = [
        script_dir.parent / "data" / "jugadores_stats.csv",
        Path("../data/jugadores_stats.csv"),
        Path("app/data/jugadores_stats.csv"),
        Path("data/jugadores_stats.csv"),
    ]
    
    csv_path = None
    for p in csv_candidatos:
        if p.exists():
            csv_path = p.resolve()
            break
            
    if csv_path is None:
        csv_path = (script_dir.parent / "data" / "jugadores_stats.csv").resolve()

    json_path = (csv_path.parent / "perfiles_procesados.json").resolve()
    return csv_path, json_path


def detectar_separador_y_encoding(ruta_archivo: Path) -> tuple[str, str]:
    """
    Detecta automáticamente el delimitador (coma, punto y coma, tabulador, etc.)
    y la codificación óptima para evitar errores de lectura.
    """
    delimitadores = [',', ';', '\t', '|']
    encodings = ['utf-8', 'latin-1', 'cp1252', 'utf-8-sig']
    
    for encoding in encodings:
        try:
            with open(ruta_archivo, 'r', encoding=encoding, errors='strict') as f:
                muestra = f.read(4096)
                if not muestra:
                    continue
                
                # Intentar detección con csv.Sniffer
                try:
                    sniffer = csv.Sniffer()
                    dialect = sniffer.sniff(muestra, delimiters=',;\t|')
                    return dialect.delimiter, encoding
                except Exception:
                    primera_linea = muestra.splitlines()[0] if muestra.splitlines() else ''
                    conteos = {d: primera_linea.count(d) for d in delimitadores}
                    delimitador = max(conteos, key=conteos.get)
                    if conteos[delimitador] > 0:
                        return delimitador, encoding
                    return ',', encoding
        except (UnicodeDecodeError, UnicodeError):
            continue
            
    return ',', 'latin-1'


def buscar_columna(df: pd.DataFrame, nombres_posibles: list[str]) -> str | None:
    """Busca una columna en el DataFrame ignorando mayúsculas/minúsculas y espacios."""
    cols_lower = {c.strip().lower(): c for c in df.columns}
    for nombre in nombres_posibles:
        nombre_clean = nombre.strip().lower()
        if nombre_clean in cols_lower:
            return cols_lower[nombre_clean]
    return None


def limpiar_cadena(val: any, default: str = "") -> str:
    """Limpia cadenas manejando valores nulos o NaN."""
    if pd.isna(val) or val is None:
        return default
    val_str = str(val).strip()
    return val_str if val_str and val_str.lower() != 'nan' else default


def limpiar_entero(val: any, default: int = 0) -> int:
    """Convierte de forma segura valores numéricos flotantes/nulos a enteros."""
    if pd.isna(val) or val is None:
        return default
    try:
        return int(round(float(val)))
    except (ValueError, TypeError):
        return default


def limpiar_flotante(val: any, default: float = 0.0) -> float:
    """Convierte de forma segura valores numéricos a flotantes."""
    if pd.isna(val) or val is None:
        return default
    try:
        return float(val)
    except (ValueError, TypeError):
        return default


def formatear_nacion(nation_raw: str) -> str:
    """Limpia el formato de nacionalidad (ej: 'ma MAR' -> 'MAR' o 'us USA' -> 'USA')."""
    if not nation_raw:
        return "Desconocida"
    partes = nation_raw.split()
    return partes[-1] if len(partes) > 1 else nation_raw


def formatear_competicion(comp_raw: str) -> str:
    """Limpia el prefijo de país en la competición (ej: 'eng Premier League' -> 'la Premier League')."""
    if not comp_raw:
        return "competición oficial"
    # Quitar códigos de país de 2 o 3 letras minúsculas al inicio
    limpio = re.sub(r'^[a-z]{2,3}\s+', '', comp_raw).strip()
    if limpio.lower().startswith('la '):
        return limpio
    return f"la {limpio}"


def generar_text_profile(row: pd.Series, cols: dict) -> str:
    """
    Genera un perfil narrativo en español enriquecido con las estadísticas clave
    más representativas del jugador, ideal para búsqueda semántica e indexación vectorial en AWS.
    """
    nombre = limpiar_cadena(row.get(cols.get('Player')), default="Jugador")
    edad = limpiar_entero(row.get(cols.get('Age')), default=0)
    pos_codigo = limpiar_cadena(row.get(cols.get('Pos')), default="Sin posición")
    posicion_es = POS_MAP.get(pos_codigo, pos_codigo)
    equipo = limpiar_cadena(row.get(cols.get('Squad')), default="su equipo")
    liga = formatear_competicion(limpiar_cadena(row.get(cols.get('Comp')), default=""))
    nacionalidad = formatear_nacion(limpiar_cadena(row.get(cols.get('Nation')), default=""))
    
    partidos = limpiar_entero(row.get(cols.get('MP')), default=0)
    titularidades = limpiar_entero(row.get(cols.get('Starts')), default=0)
    minutos = limpiar_entero(row.get(cols.get('Min')), default=0)
    
    # Párrafo introductorio
    edad_txt = f"de {edad} años" if edad > 0 else "de edad no informada"
    pais_txt = f"de nacionalidad {nacionalidad}" if nacionalidad != "Desconocida" else "de nacionalidad no confirmada"
    intro = f"{nombre} es un {posicion_es.lower()} {edad_txt}, {pais_txt}, que milita en el {equipo} de {liga}."
    
    partidos_txt = "1 partido" if partidos == 1 else f"{partidos} partidos"
    titulares_txt = "1 como titular" if titularidades == 1 else f"{titularidades} como titular"
    minutos_txt = "1 minuto" if minutos == 1 else f"{minutos} minutos"
    rodaje_txt = f"En la presente temporada ha disputado {partidos_txt} ({titulares_txt}), sumando un total de {minutos_txt} de juego."
    
    # Perfil diferenciado si es Portero o Jugador de campo
    if 'GK' in pos_codigo:
        paradas = limpiar_entero(row.get(cols.get('Saves')), default=0)
        efectividad_paradas = limpiar_flotante(row.get(cols.get('Save%')), default=0.0)
        goles_encajados = limpiar_entero(row.get(cols.get('GA')), default=0)
        porterias_cero = limpiar_entero(row.get(cols.get('CS')), default=0)
        
        paradas_txt = "1 parada" if paradas == 1 else f"{paradas} paradas"
        goles_txt = "1 gol en contra" if goles_encajados == 1 else f"{goles_encajados} goles en contra"
        cs_txt = "1 encuentro" if porterias_cero == 1 else f"{porterias_cero} encuentros"
        
        stats_txt = (
            f"Como guardameta, acumula {paradas_txt} con una efectividad del {efectividad_paradas:.1f}%, "
            f"ha concedido {goles_txt} y ha mantenido su portería a cero en {cs_txt}."
        )
    else:
        goles = limpiar_entero(row.get(cols.get('Gls')), default=0)
        asistencias = limpiar_entero(row.get(cols.get('Ast')), default=0)
        disparos = limpiar_entero(row.get(cols.get('Sh')), default=0)
        punteria = limpiar_flotante(row.get(cols.get('SoT%')), default=0.0)
        tackles = limpiar_entero(row.get(cols.get('TklW')), default=0)
        intercepciones = limpiar_entero(row.get(cols.get('Int')), default=0)
        amarillas = limpiar_entero(row.get(cols.get('CrdY')), default=0)
        
        goles_txt = "1 gol" if goles == 1 else f"{goles} goles"
        asist_txt = "1 asistencia" if asistencias == 1 else f"{asistencias} asistencias"
        disparos_txt = "1 disparo total" if disparos == 1 else f"{disparos} disparos totales"
        tackles_txt = "1 tackle ganado" if tackles == 1 else f"{tackles} tackles ganados"
        interc_txt = "1 intercepción de balón" if intercepciones == 1 else f"{intercepciones} intercepciones de balón"
        amarillas_txt = "1 tarjeta amarilla" if amarillas == 1 else f"{amarillas} tarjetas amarillas"
        
        stats_txt = (
            f"En su faceta ofensiva y de creación, registra {goles_txt} y {asist_txt}, "
            f"con {disparos_txt} ({punteria:.1f}% dirigidos a portería). "
            f"En labores defensivas y de contención, aporta {tackles_txt}, "
            f"{interc_txt} y ha recibido {amarillas_txt}."
        )

    return f"{intro} {rodaje_txt} {stats_txt}"


def procesar_jugadores(min_partidos_filtro: int | None = None) -> int:
    """
    Función principal de procesamiento del pipeline ETL para Scout AI.
    """
    print("=" * 70)
    print("[Scout AI] Iniciando pipeline de procesamiento de jugadores...")
    print("=" * 70)
    
    # 1. Resolver rutas de archivos
    csv_path, json_path = resolver_rutas()
    print(f"[+] Archivo de entrada:  {csv_path}")
    print(f"[+] Archivo de salida:   {json_path}")
    
    if not csv_path.exists():
        print(f"[ERROR] No se encontró el archivo CSV en la ruta: '{csv_path}'")
        sys.exit(1)
        
    # 2. Detectar separador y codificación
    delimitador, encoding = detectar_separador_y_encoding(csv_path)
    print(f"[+] Detección de formato: Separador='{delimitador}', Codificación='{encoding}'")
    
    try:
        df = pd.read_csv(csv_path, sep=delimitador, encoding=encoding, engine='python')
    except Exception as e:
        print(f"[!] Aviso: Fallo en lectura primaria con engine='python': {e}. Usando fallback...")
        df = pd.read_csv(csv_path, sep=delimitador, encoding='latin-1')
        
    total_original = len(df)
    print(f"[+] Registros leídos en CSV original: {total_original} filas x {len(df.columns)} columnas.")

    # 3. Mapear nombres de columnas existentes de forma tolerante a desajustes
    cols = {
        'id': buscar_columna(df, ['Rk', 'ID', 'Id', 'Rank', 'player_id']),
        'Player': buscar_columna(df, ['Player', 'Jugador', 'Nombre', 'Name']),
        'Age': buscar_columna(df, ['Age', 'Edad']),
        'Nation': buscar_columna(df, ['Nation', 'Nacionalidad', 'Country', 'Pais']),
        'Pos': buscar_columna(df, ['Pos', 'Position', 'Posicion']),
        'Squad': buscar_columna(df, ['Squad', 'Equipo', 'Team', 'Club']),
        'Comp': buscar_columna(df, ['Comp', 'Competicion', 'Liga', 'League']),
        'MP': buscar_columna(df, ['MP', 'Matches Played', 'Matches_Played', 'PJ', 'Partidos']),
        'Starts': buscar_columna(df, ['Starts', 'Titularidades', 'Titular']),
        'Min': buscar_columna(df, ['Min', 'Minutos', 'Minutes']),
        'Gls': buscar_columna(df, ['Gls', 'Goles', 'Goals']),
        'Ast': buscar_columna(df, ['Ast', 'Asistencias', 'Assists']),
        'Sh': buscar_columna(df, ['Sh', 'Tiros', 'Shots']),
        'SoT%': buscar_columna(df, ['SoT%', 'SoT_pct', 'Punteria']),
        'TklW': buscar_columna(df, ['TklW', 'Tackles', 'Entradas']),
        'Int': buscar_columna(df, ['Int', 'Intercepciones', 'Interceptions']),
        'CrdY': buscar_columna(df, ['CrdY', 'Tarjetas_Amarillas', 'Yellow_Cards']),
        'Saves': buscar_columna(df, ['Saves', 'Paradas']),
        'Save%': buscar_columna(df, ['Save%', 'Save_pct']),
        'GA': buscar_columna(df, ['GA', 'Goles_Encajados']),
        'CS': buscar_columna(df, ['CS', 'Porterias_Cero'])
    }
    
    col_mp = cols.get('MP')
    if not col_mp or col_mp not in df.columns:
        print("[ERROR] No se pudo encontrar una columna equivalente a 'Matches Played' o 'MP'.")
        sys.exit(1)
        
    print(f"[+] Columna de partidos jugados identificada: '{col_mp}'")
    
    # Asegurar tipo numérico en columna MP
    df[col_mp] = pd.to_numeric(df[col_mp], errors='coerce').fillna(0).astype(int)
    
    max_partidos_csv = int(df[col_mp].max())
    min_partidos_csv = int(df[col_mp].min())
    print(f"[+] Rango de partidos en el dataset: Mínimo={min_partidos_csv}, Máximo={max_partidos_csv}")

    # 4. Lógica del Filtro de Partidos Jugados (Análisis Data Engineer)
    UMBRAL_OBJETIVO = 10
    
    if min_partidos_filtro is not None:
        umbral_a_usar = min_partidos_filtro
        print(f"[+] Aplicando umbral manual especificado: >= {umbral_a_usar} partidos.")
    elif max_partidos_csv < UMBRAL_OBJETIVO:
        # DIAGNÓSTICO CLAVE:
        # En este archivo 'jugadores_stats.csv', la temporada solo cuenta con un máximo de 6 partidos.
        # Si se filtrara ciegamente por >= 10, devolvería 0 registros.
        umbral_a_usar = min(2, max_partidos_csv)
        print(f"[!] [AVISO DATA ENGINEER]: El valor máximo de '{col_mp}' en este CSV es {max_partidos_csv} (< {UMBRAL_OBJETIVO}).")
        print(f"    Filtrar estrictamente por >= {UMBRAL_OBJETIVO} descartaría al 100% de los jugadores (0 registros).")
        print(f"    -> Adaptando inteligentemente el filtro a >= {umbral_a_usar} partidos para conservar jugadores activos con minutos.")
    else:
        umbral_a_usar = UMBRAL_OBJETIVO
        print(f"[+] Filtrando jugadores con al menos {umbral_a_usar} partidos jugados...")

    df_filtrado = df[df[col_mp] >= umbral_a_usar].copy()
    print(f"[+] Registros tras filtro de partidos (>= {umbral_a_usar}): {len(df_filtrado)} jugadores conservados.")
    
    # 5. Generación de text_profile en español
    print("[+] Generando columna 'text_profile' con descripciones enriquecidas en español...")
    df_filtrado['text_profile'] = df_filtrado.apply(lambda row: generar_text_profile(row, cols), axis=1)
    
    # 6. Preparar DataFrame de exportación
    # Identificador único de jugador
    col_id = cols.get('id')
    if col_id and col_id in df_filtrado.columns:
        df_filtrado['id'] = df_filtrado[col_id].astype(str)
    else:
        df_filtrado['id'] = (df_filtrado.index + 1).astype(str)
        
    col_player = cols.get('Player', 'Player')
    col_pos = cols.get('Pos', 'Pos')
    col_squad = cols.get('Squad', 'Squad')
    col_comp = cols.get('Comp', 'Comp')
    col_age = cols.get('Age', 'Age')
    
    # Seleccionar columnas relevantes para la salida JSON
    columnas_exportar = ['id']
    if col_player in df_filtrado.columns:
        df_filtrado['Player'] = df_filtrado[col_player].fillna('Desconocido')
        columnas_exportar.append('Player')
    if col_pos in df_filtrado.columns:
        df_filtrado['Pos'] = df_filtrado[col_pos].fillna('')
        columnas_exportar.append('Pos')
    if col_squad in df_filtrado.columns:
        df_filtrado['Squad'] = df_filtrado[col_squad].fillna('')
        columnas_exportar.append('Squad')
    if col_comp in df_filtrado.columns:
        df_filtrado['Comp'] = df_filtrado[col_comp].fillna('')
        columnas_exportar.append('Comp')
    if col_age in df_filtrado.columns:
        df_filtrado['Age'] = pd.to_numeric(df_filtrado[col_age], errors='coerce').fillna(0).astype(int)
        columnas_exportar.append('Age')
    if col_mp in df_filtrado.columns:
        df_filtrado['MP'] = df_filtrado[col_mp]
        columnas_exportar.append('MP')
        
    columnas_exportar.append('text_profile')
    
    resultado_df = df_filtrado[columnas_exportar]

    # 7. Exportar a JSON
    print(f"[+] Exportando perfiles a '{json_path}'...")
    json_path.parent.mkdir(parents=True, exist_ok=True)
    resultado_df.to_json(json_path, orient='records', force_ascii=False, indent=2)
    
    print("-" * 70)
    print(f"[EXITO] Se procesaron y exportaron {len(resultado_df)} jugadores correctamente.")
    print(f"[+] Archivo generado: {json_path}")
    print("=" * 70)
    
    # Mostrar una muestra de verificación
    if not resultado_df.empty:
        muestra = resultado_df.iloc[0]
        print(f"\n[Muestra de Perfil Generado - {muestra.get('Player')}]:")
        print(f"{muestra.get('text_profile')}\n")

    return len(resultado_df)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Procesador ETL de estadísticas de jugadores para Scout AI")
    parser.add_argument(
        "--min-matches",
        type=int,
        default=None,
        help="Mínimo de partidos jugados para filtrar (por defecto adapta según datos si el máximo es < 10)"
    )
    args = parser.parse_args()
    
    procesar_jugadores(min_partidos_filtro=args.min_matches)