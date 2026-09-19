"""
Alias for generar_vectores.py (English entrypoint)
"""
from generar_vectores import *

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
