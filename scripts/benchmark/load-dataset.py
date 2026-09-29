"""
AfriSwitchCare Evaluation Dataset Loader

Loads AfriSwitchCare as an evaluation-only benchmark.
Do not invent train/validation splits or speaker-disjoint splits.

Dataset:
https://huggingface.co/datasets/intronhealth/AfriSwitchCare
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Any
from datasets import load_dataset
from huggingface_hub import login

HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN")
if not HF_TOKEN:
    raise ValueError("HUGGINGFACE_TOKEN not found. Configure it before evaluation.")

DATASET_NAME = "intronhealth/AfriSwitchCare"
OUTPUT_DIR = Path(__file__).parent.parent.parent / "benchmarks" / "datasets"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def load_afriswitch_care() -> Dict[str, Any]:
    """Load the published evaluation dataset without manufacturing splits."""
    print(f"Loading {DATASET_NAME}...")
    login(token=HF_TOKEN)

    dataset = load_dataset(DATASET_NAME, token=HF_TOKEN)
    split_names = list(dataset.keys())

    print("Dataset loaded.")
    print(f"Splits: {split_names}")

    if "test" not in split_names:
        raise RuntimeError(
            f"BENCHMARK_CONTRACT_ERROR: AfriSwitchCare must expose a test split; "
            f"found {split_names}. Do not invent a split."
        )

    if len(split_names) != 1:
        raise RuntimeError(
            "BENCHMARK_CONTRACT_ERROR: this evaluator expects the current "
            "evaluation-only AfriSwitchCare release to expose only its published "
            f"test split; found {split_names}."
        )

    test_split = dataset["test"]
    print(f"Test samples: {len(test_split)}")
    print(f"Columns: {test_split.column_names}")

    return dataset


def extract_critical_fields(example: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract only fields explicitly present in the dataset schema.

    Do not invent labels or derive ground truth from the reference transcript.
    A future domain-specific evaluator may add reviewed annotations as a
    separate, versioned benchmark artifact.
    """
    explicit = example.get("critical_fields")
    if isinstance(explicit, list):
        return [
            item for item in explicit
            if isinstance(item, dict)
            and "field" in item
            and "value" in item
            and "type" in item
        ]
    return []


def format_for_pal(example: Dict[str, Any], index: int) -> Dict[str, Any]:
    """Convert a test example into the PAL benchmark interchange format."""
    audio = example.get("audio")
    audio_path = (
        audio.get("path")
        if isinstance(audio, dict)
        else audio
    )

    transcript = example.get("transcript")
    if transcript is None:
        transcript = example.get("text", "")

    return {
        "id": f"afriswitch_care_test_{index}",
        "audio_path": audio_path,
        "reference_transcript": transcript,
        "language_spans": example.get("language_spans", []),
        "code_switches": example.get("code_switches", []),
        "critical_fields": extract_critical_fields(example),
        "expected_intent": example.get("intent"),
        "expected_action": example.get("action"),
        "domain": "healthcare",
        "metadata": {
            "speaker_id": example.get("speaker_id"),
            "language_pair": example.get("language_pair"),
            "duration_seconds": example.get("duration"),
            "code_switch_density": example.get("code_switch_density"),
        },
    }


def process_and_save(dataset: Dict[str, Any]) -> None:
    """Save only the published test split."""
    test_split = dataset["test"]
    formatted_samples = [
        format_for_pal(example, idx)
        for idx, example in enumerate(test_split)
    ]

    output_file = OUTPUT_DIR / "afriswitch_care_test.json"
    with open(output_file, "w", encoding="utf-8") as f:
        json.dump(formatted_samples, f, indent=2, ensure_ascii=False)

    print(f"Saved {len(formatted_samples)} evaluation samples to {output_file}")


def main() -> None:
    print("=" * 60)
    print("AfriSwitchCare Evaluation Dataset Loader for PAL")
    print("=" * 60)

    dataset = load_afriswitch_care()
    process_and_save(dataset)

    print("=" * 60)
    print("Evaluation dataset preparation complete.")
    print("=" * 60)


if __name__ == "__main__":
    main()
