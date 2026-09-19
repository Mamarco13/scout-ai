"""
Generador de Embeddings Vectoriales para Scout AI (Amazon Bedrock)
==================================================================
Este script toma el archivo '../data/perfiles_procesados.json' y genera
representaciones vectoriales (embeddings) para cada jugador usando
el modelo 'amazon.titan-embed-text-v2:0' de Amazon Bedrock en 'us-east-1'.
El resultado final se exporta en '../data/perfiles_con_vectores.json'.
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
import boto3
from botocore.exceptions import ClientError, BotoCoreError

# Asegurar compatibilidad de salida UTF-8 en terminales de Windows
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass


def resolver_rutas() -> tuple[Path, Path, Path]:
    """
    Resuelve las rutas de entrada, salida y respaldo temporal de forma dinámica,
    permitiendo la ejecución desde la raíz del proyecto o desde app/scripts/.
    """
    script_dir = Path(__file__).resolve().parent
    
    candidatos_input = [
        script_dir.parent / "data" / "perfiles_procesados.json",
        Path("../data/perfiles_procesados.json"),
        Path("app/data/perfiles_procesados.json"),
        Path("data/perfiles_procesados.json"),
    ]
    
    input_path = None
    for p in candidatos_input:
        if p.exists():
            input_path = p.resolve()
            break
            
    if input_path is None:
        input_path = (script_dir.parent / "data" / "perfiles_procesados.json").resolve()

    output_path = (input_path.parent / "perfiles_con_vectores.json").resolve()
    temp_path = (input_path.parent / "perfiles_con_vectores_temp.json").resolve()
    
    return input_path, output_path, temp_path


def guardar_json(data: list[dict], path: Path, descripcion: str = ""):
    """Guarda una lista de diccionarios en JSON de forma segura."""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        if descripcion:
            print(f"[+] {descripcion} guardado con éxito ({len(data)} jugadores) en: {path.name}")
    except Exception as e:
        print(f"[ERROR] No se pudo guardar el archivo '{path}': {e}")


def obtener_embedding(
    client,
    texto: str,
    model_id: str = "amazon.titan-embed-text-v2:0",
    max_retries: int = 3
) -> list[float]:
    """
    Invoca Amazon Bedrock Runtime para obtener el vector de embedding.
    Implementa reintentos exponenciales en caso de throttling temporal de AWS.
    """
    # Payload optimizado para Titan Embeddings Text v2 (1024 dimensiones, normalizado)
    body = json.dumps({
        "inputText": texto,
        "dimensions": 1024,
        "normalize": True
    })

    for intento in range(max_retries):
        try:
            response = client.invoke_model(
                modelId=model_id,
                contentType="application/json",
                accept="application/json",
                body=body
            )
            response_body = json.loads(response["body"].read())
            embedding = response_body.get("embedding")
            if embedding and isinstance(embedding, list):
                return embedding
            else:
                raise ValueError("La respuesta de Bedrock no contiene una clave 'embedding' válida.")
                
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            # Manejo de Throttling (límite de peticiones por segundo en AWS)
            if error_code in ["ThrottlingException", "RequestLimitExceeded", "TooManyRequestsException"]:
                wait_time = (intento + 1) * 2.0
                print(f"    [!] Throttling detectado ({error_code}). Pausando {wait_time:.1f}s antes de reintentar...")
                time.sleep(wait_time)
            else:
                raise e
        except Exception as e:
            if intento < max_retries - 1:
                time.sleep(1.5)
            else:
                raise e

    raise RuntimeError(f"Fallo al obtener embedding tras {max_retries} intentos.")


def generar_vectores(
    region_name: str = "us-east-1",
    model_id: str = "amazon.titan-embed-text-v2:0",
    delay_segundos: float = 0.15,
    limite: int | None = None,
    guardar_cada: int = 50
):
    """
    Flujo principal de generación de vectores para la base de datos de Scout AI.
    """
    print("=" * 70)
    print("🧠 [Scout AI] Iniciando generación de vectores con Amazon Bedrock")
    print("=" * 70)
    print(f"[+] Región de AWS:     {region_name}")
    print(f"[+] Modelo de Bedrock: {model_id}")
    print(f"[+] Pausa preventiva:  {delay_segundos}s por petición")
    
    # 1. Resolver rutas de archivos
    input_path, output_path, temp_path = resolver_rutas()
    print(f"[+] Archivo origen:    {input_path}")
    print(f"[+] Archivo destino:   {output_path}")
    print(f"[+] Archivo temporal:  {temp_path}")

    if not input_path.exists():
        print(f"\n[ERROR] No existe el archivo de entrada '{input_path}'.")
        print("Por favor ejecuta primero: python process_players.py")
        sys.exit(1)

    # 2. Cargar perfiles procesados
    try:
        with open(input_path, "r", encoding="utf-8") as f:
            perfiles = json.load(f)
    except Exception as e:
        print(f"[ERROR] Error al leer '{input_path}': {e}")
        sys.exit(1)

    total_jugadores = len(perfiles)
    print(f"[+] Perfiles cargados: {total_jugadores} jugadores encontrados.")

    if limite and limite < total_jugadores:
        perfiles = perfiles[:limite]
        total_jugadores = len(perfiles)
        print(f"[!] Límite de prueba activo: Se procesarán únicamente los primeros {limite} jugadores.")

    # 3. Soporte para reanudar progreso si ya existe trabajo previo (Checkpoints)
    jugadores_con_vectores = []
    ids_ya_procesados = set()

    # Si existe un archivo temporal o de salida previo, recuperar los ya calculados para ahorrar costos y tiempo
    archivo_recuperacion = temp_path if temp_path.exists() else (output_path if output_path.exists() else None)
    if archivo_recuperacion and archivo_recuperacion.exists():
        try:
            with open(archivo_recuperacion, "r", encoding="utf-8") as f:
                previos = json.load(f)
                for p in previos:
                    if "id" in p and "vector" in p and p["vector"]:
                        ids_ya_procesados.add(str(p["id"]))
                        jugadores_con_vectores.append(p)
            if ids_ya_procesados:
                print(f"[+] Recuperados {len(ids_ya_procesados)} jugadores previamente procesados de '{archivo_recuperacion.name}'.")
        except Exception:
            pass

    # 4. Inicializar cliente de Amazon Bedrock Runtime
    try:
        client = boto3.client("bedrock-runtime", region_name=region_name)
    except Exception as e:
        print(f"[ERROR] No se pudo inicializar el cliente de boto3 para Bedrock: {e}")
        sys.exit(1)

    # 5. Iteración y generación de embeddings
    print("-" * 70)
    print(f"🚀 Procesando embeddings para {total_jugadores} jugadores...")
    print("-" * 70)

    inicio_tiempo = time.time()
    errores_consecutivos = 0

    for idx, jugador in enumerate(perfiles, start=1):
        jugador_id = str(jugador.get("id", idx))
        nombre = jugador.get("Player", f"ID {jugador_id}")
        texto = jugador.get("text_profile", "").strip()

        # Si ya fue vectorizado en una ejecución previa, reutilizar
        if jugador_id in ids_ya_procesados:
            continue

        if not texto:
            print(f"[!] Jugador {nombre} (id: {jugador_id}) no tiene 'text_profile'. Se omite.")
            continue

        try:
            # Llamada al modelo de embeddings en Amazon Bedrock
            vector = obtener_embedding(client, texto, model_id=model_id)

            # Crear copia del registro incorporando el vector
            jugador_actualizado = dict(jugador)
            jugador_actualizado["vector"] = vector
            jugadores_con_vectores.append(jugador_actualizado)
            ids_ya_procesados.add(jugador_id)
            errores_consecutivos = 0

        except Exception as e:
            errores_consecutivos += 1
            print(f"\n[ERROR] Fallo al vectorizar jugador {idx}/{total_jugadores} ({nombre}): {e}")
            print("💾 Guardando punto de control de seguridad (checkpoint temporal)...")
            guardar_json(jugadores_con_vectores, temp_path, "Punto de control de seguridad")

            # Si se producen varios errores consecutivos (ej: credenciales inválidas o sin permisos de Bedrock)
            if errores_consecutivos >= 3:
                print(f"\n[ABORTANDO] Se alcanzaron {errores_consecutivos} errores consecutivos con AWS Bedrock.")
                print(f"Los jugadores procesados hasta ahora ({len(jugadores_con_vectores)}) están seguros en '{temp_path.name}'.")
                sys.exit(1)
            else:
                print("Continuando con el siguiente jugador...")
                continue

        # Mensaje de progreso periódico (cada 50 o 100 jugadores)
        if idx % guardar_cada == 0 or idx == total_jugadores:
            porcentaje = (idx / total_jugadores) * 100
            tiempo_transcurrido = time.time() - inicio_tiempo
            velocidad = idx / tiempo_transcurrido if tiempo_transcurrido > 0 else 0
            restantes = total_jugadores - idx
            tiempo_estimado = (restantes / velocidad) if velocidad > 0 else 0

            print(
                f"[Progreso] {idx}/{total_jugadores} ({porcentaje:.1f}%) | "
                f"Velocidad: {velocidad:.1f} jug/s | Est. restante: {tiempo_estimado/60:.1f} min"
            )

            # Guardar respaldo temporal periódicamente
            guardar_json(jugadores_con_vectores, temp_path, "Checkpoint periódico")

        # Pausa para evitar Throttling en la API de Amazon Bedrock
        time.sleep(delay_segundos)

    # 6. Guardar archivo final
    print("=" * 70)
    print(f"💾 Guardando resultado final en: '{output_path}'...")
    guardar_json(jugadores_con_vectores, output_path, "Archivo final con vectores")

    # Limpiar archivo temporal si todo finalizó con éxito
    if temp_path.exists() and len(jugadores_con_vectores) == total_jugadores:
        try:
            temp_path.unlink()
            print("[+] Archivo temporal de respaldo limpiado con éxito.")
        except Exception:
            pass

    tiempo_total = time.time() - inicio_tiempo
    print("-" * 70)
    print(f"🎉 [EXITO] Proceso finalizado en {tiempo_total/60:.2f} minutos.")
    print(f"[+] Total de jugadores vectorizados: {len(jugadores_con_vectores)}/{total_jugadores}")
    print(f"[+] Dimensión del vector generado:  {len(jugadores_con_vectores[0]['vector']) if jugadores_con_vectores else 0}")
    print(f"[+] Archivo final listo en:         {output_path}")
    print("=" * 70)


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Generador de Embeddings para Scout AI con Amazon Bedrock")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Límite opcional de jugadores a procesar (ej: --limit 5 para pruebas rápidas)"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.15,
        help="Pausa en segundos entre llamadas para evitar Throttling (por defecto 0.15s)"
    )
    parser.add_argument(
        "--batch-save",
        type=int,
        default=50,
        help="Frecuencia con la que se imprime el progreso y se guarda el checkpoint (por defecto 50)"
    )
    parser.add_argument(
        "--model-id",
        type=str,
        default="amazon.titan-embed-text-v2:0",
        help="ID del modelo de embeddings en Bedrock (por defecto amazon.titan-embed-text-v2:0)"
    )
    parser.add_argument(
        "--region",
        type=str,
        default="us-east-1",
        help="Región de AWS (por defecto us-east-1)"
    )
    args = parser.parse_args()

    generar_vectores(
        region_name=args.region,
        model_id=args.model_id,
        delay_segundos=args.delay,
        limite=args.limit,
        guardar_cada=args.batch_save
    )
