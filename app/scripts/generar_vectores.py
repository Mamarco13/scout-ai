"""
Vector Embeddings Generator for Scout AI (Amazon Bedrock)
==========================================================
This script ingests '../data/perfiles_procesados.json' and generates dense vector
embeddings for each player's natural language 'text_profile' using
'amazon.titan-embed-text-v2:0' via Amazon Bedrock Runtime in 'us-east-1'.
The enriched records are saved to '../data/perfiles_con_vectores.json'.
"""

import os
import sys
import json
import time
import argparse
from pathlib import Path
import boto3
from botocore.exceptions import ClientError, BotoCoreError

# Ensure UTF-8 output encoding across Windows consoles
if sys.stdout and hasattr(sys.stdout, 'reconfigure'):
    try:
        sys.stdout.reconfigure(encoding='utf-8', errors='replace')
    except Exception:
        pass


def resolve_paths() -> tuple[Path, Path, Path]:
    """
    Dynamically resolves paths for input, output, and safety checkpoint files,
    allowing execution from any working directory (project root, app/, or scripts/).
    """
    script_dir = Path(__file__).resolve().parent
    
    input_candidates = [
        script_dir.parent / "data" / "perfiles_procesados.json",
        Path("../data/perfiles_procesados.json"),
        Path("app/data/perfiles_procesados.json"),
        Path("data/perfiles_procesados.json"),
    ]
    
    input_path = None
    for p in input_candidates:
        if p.exists():
            input_path = p.resolve()
            break
            
    if input_path is None:
        input_path = (script_dir.parent / "data" / "perfiles_procesados.json").resolve()

    output_path = (input_path.parent / "perfiles_con_vectores.json").resolve()
    temp_path = (input_path.parent / "perfiles_con_vectores_temp.json").resolve()
    
    return input_path, output_path, temp_path


def save_json(data: list[dict], path: Path, description: str = ""):
    """Safely dumps a list of player dictionaries to a JSON file."""
    try:
        path.parent.mkdir(parents=True, exist_ok=True)
        with open(path, "w", encoding="utf-8") as f:
            json.dump(data, f, ensure_ascii=False, indent=2)
        if description:
            print(f"[+] {description} saved successfully ({len(data)} players) to: {path.name}")
    except Exception as e:
        print(f"[ERROR] Failed to save JSON file '{path}': {e}")


def get_embedding(
    client,
    text: str,
    model_id: str = "amazon.titan-embed-text-v2:0",
    max_retries: int = 3
) -> list[float]:
    """
    Calls Amazon Bedrock Runtime to retrieve the vector embedding for the input text.
    Implements exponential backoff to handle temporary AWS API throttling.
    """
    body = json.dumps({
        "inputText": text,
        "dimensions": 1024,
        "normalize": True
    })

    for attempt in range(max_retries):
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
                raise ValueError("Bedrock response missing valid 'embedding' field.")
                
        except ClientError as e:
            error_code = e.response.get("Error", {}).get("Code", "")
            # Handle rate-limit throttling from AWS Bedrock
            if error_code in ["ThrottlingException", "RequestLimitExceeded", "TooManyRequestsException"]:
                wait_time = (attempt + 1) * 2.0
                print(f"    [!] Throttling encountered ({error_code}). Backing off for {wait_time:.1f}s...")
                time.sleep(wait_time)
            else:
                raise e
        except Exception as e:
            if attempt < max_retries - 1:
                time.sleep(1.5)
            else:
                raise e

    raise RuntimeError(f"Failed to obtain embedding after {max_retries} attempts.")


def generate_vectors(
    region_name: str = "us-east-1",
    model_id: str = "amazon.titan-embed-text-v2:0",
    delay_seconds: float = 0.15,
    limit: int | None = None,
    save_every: int = 50
):
    """
    Main execution pipeline for generating and indexing player embeddings with Bedrock.
    """
    print("=" * 70)
    print("🧠 [Scout AI] Starting Vector Embedding Pipeline (Amazon Bedrock)")
    print("=" * 70)
    print(f"[+] AWS Region:     {region_name}")
    print(f"[+] Bedrock Model:  {model_id}")
    print(f"[+] Safety Delay:   {delay_seconds}s per request")
    
    # 1. Resolve file paths
    input_path, output_path, temp_path = resolve_paths()
    print(f"[+] Source input:   {input_path}")
    print(f"[+] Target output:  {output_path}")
    print(f"[+] Checkpoint file:{temp_path}")

    if not input_path.exists():
        print(f"\n[ERROR] Input file not found: '{input_path}'.")
        print("Please run first: python process_players.py")
        sys.exit(1)

    # 2. Load preprocessed player profiles
    try:
        with open(input_path, "r", encoding="utf-8") as f:
            profiles = json.load(f)
    except Exception as e:
        print(f"[ERROR] Failed to read '{input_path}': {e}")
        sys.exit(1)

    total_players = len(profiles)
    print(f"[+] Profiles loaded: {total_players} players found.")

    if limit and limit < total_players:
        profiles = profiles[:limit]
        total_players = len(profiles)
        print(f"[!] Test limit enabled: Processing only the first {limit} players.")

    # 3. Resume from previous checkpoints if available
    vectorized_players = []
    already_processed_ids = set()

    recovery_file = temp_path if temp_path.exists() else (output_path if output_path.exists() else None)
    if recovery_file and recovery_file.exists():
        try:
            with open(recovery_file, "r", encoding="utf-8") as f:
                previous_records = json.load(f)
                for p in previous_records:
                    if "id" in p and "vector" in p and p["vector"]:
                        already_processed_ids.add(str(p["id"]))
                        vectorized_players.append(p)
            if already_processed_ids:
                print(f"[+] Resumed {len(already_processed_ids)} previously vectorized players from '{recovery_file.name}'.")
        except Exception:
            pass

    # 4. Initialize Amazon Bedrock Runtime Client
    try:
        client = boto3.client("bedrock-runtime", region_name=region_name)
    except Exception as e:
        print(f"[ERROR] Failed to initialize Bedrock client via boto3: {e}")
        sys.exit(1)

    # 5. Iterative embedding generation
    print("-" * 70)
    print(f"🚀 Generating embeddings for {total_players} players...")
    print("-" * 70)

    start_time = time.time()
    consecutive_errors = 0

    try:
        for idx, player in enumerate(profiles, start=1):
            player_id = str(player.get("id", idx))
            player_name = player.get("Player", f"ID {player_id}")
            text_profile = player.get("text_profile", "").strip()

            # Skip if already vectorized
            if player_id in already_processed_ids:
                continue

            if not text_profile:
                print(f"[!] Player {player_name} (id: {player_id}) has empty 'text_profile'. Skipping.")
                continue

            try:
                # Call Amazon Bedrock Titan Text Embeddings v2
                vector = get_embedding(client, text_profile, model_id=model_id)

                updated_record = dict(player)
                updated_record["vector"] = vector
                vectorized_players.append(updated_record)
                already_processed_ids.add(player_id)
                consecutive_errors = 0

            except Exception as e:
                consecutive_errors += 1
                print(f"\n[ERROR] Failed to vectorize player {idx}/{total_players} ({player_name}): {e}")
                print("💾 Saving safety checkpoint...")
                save_json(vectorized_players, temp_path, "Safety checkpoint")

                if consecutive_errors >= 3:
                    print(f"\n[ABORTING] Reached {consecutive_errors} consecutive AWS Bedrock errors.")
                    print(f"Progress ({len(vectorized_players)} players) safely saved to '{temp_path.name}'.")
                    sys.exit(1)
                else:
                    print("Continuing with next player...")
                    continue

            # Periodic progress reporting
            if idx % save_every == 0 or idx == total_players:
                pct = (idx / total_players) * 100
                elapsed = time.time() - start_time
                speed = idx / elapsed if elapsed > 0 else 0
                remaining = total_players - idx
                eta_minutes = (remaining / speed) / 60 if speed > 0 else 0

                print(
                    f"[Progress] {idx}/{total_players} ({pct:.1f}%) | "
                    f"Speed: {speed:.1f} players/s | ETA: {eta_minutes:.1f} min"
                )

                # Periodic checkpoint save
                save_json(vectorized_players, temp_path, "Periodic checkpoint")

            # Anti-throttling safety pause
            time.sleep(delay_seconds)

    except KeyboardInterrupt:
        print("\n\n[!] Process interrupted by user (KeyboardInterrupt).")
        print("💾 Saving current progress to checkpoint file...")
        save_json(vectorized_players, temp_path, "Interrupted state checkpoint")
        print(f"[+] Safely preserved {len(vectorized_players)} vectorized players.")
        print(f"[+] Re-run this script to resume exactly where you left off!")
        sys.exit(0)

    # 6. Save final output
    print("=" * 70)
    print(f"💾 Saving final vector dataset to: '{output_path}'...")
    save_json(vectorized_players, output_path, "Final vectorized dataset")

    # Clean up temp file on successful completion
    if temp_path.exists() and len(vectorized_players) == total_players:
        try:
            temp_path.unlink()
            print("[+] Temporary checkpoint file removed.")
        except Exception:
            pass

    total_time = time.time() - start_time
    print("-" * 70)
    print(f"🎉 [SUCCESS] Pipeline completed in {total_time/60:.2f} minutes.")
    print(f"[+] Total players vectorized: {len(vectorized_players)}/{total_players}")
    print(f"[+] Vector dimensions:       {len(vectorized_players[0]['vector']) if vectorized_players else 0}")
    print(f"[+] Output ready at:         {output_path}")
    print("=" * 70)


# Backward-compatible alias
generar_vectores = generate_vectors


if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Scout AI Vector Embeddings Generator with Amazon Bedrock")
    parser.add_argument(
        "--limit",
        type=int,
        default=None,
        help="Optional limit on players to process (e.g. --limit 5 for fast testing)"
    )
    parser.add_argument(
        "--delay",
        type=float,
        default=0.15,
        help="Delay in seconds between calls to avoid throttling (default: 0.15s)"
    )
    parser.add_argument(
        "--batch-save",
        type=int,
        default=50,
        help="Interval for logging progress and saving checkpoints (default: 50)"
    )
    parser.add_argument(
        "--model-id",
        type=str,
        default="amazon.titan-embed-text-v2:0",
        help="Bedrock embedding model ID (default: amazon.titan-embed-text-v2:0)"
    )
    parser.add_argument(
        "--region",
        type=str,
        default="us-east-1",
        help="AWS Region (default: us-east-1)"
    )
    args = parser.parse_args()

    generate_vectors(
        region_name=args.region,
        model_id=args.model_id,
        delay_seconds=args.delay,
        limit=args.limit,
        save_every=args.batch_save
    )
