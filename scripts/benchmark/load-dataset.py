"""
AfriSwitchCare Dataset Loader

Loads the AfriSwitchCare healthcare dataset for PAL benchmark evaluation.
Validates speaker-disjoint splits and formats samples for PAL pipeline.

Dataset: https://huggingface.co/datasets/intronhealth/AfriSwitchCare
"""

import os
import json
from pathlib import Path
from typing import Dict, List, Any
from datasets import load_dataset
from huggingface_hub import login

# Environment setup
HF_TOKEN = os.getenv("HUGGINGFACE_TOKEN")
if not HF_TOKEN:
    raise ValueError("HUGGINGFACE_TOKEN not found in environment. Set in .env.local")

# Authenticate with Hugging Face
login(token=HF_TOKEN)

# Dataset configuration
DATASET_NAME = "intronhealth/AfriSwitchCare"
OUTPUT_DIR = Path(__file__).parent.parent.parent / "benchmarks" / "datasets"
OUTPUT_DIR.mkdir(parents=True, exist_ok=True)


def load_afriswitch_care() -> Dict[str, Any]:
    """
    Load AfriSwitchCare dataset from Hugging Face.
    
    Returns:
        Dictionary containing train, validation, and test splits
    """
    print(f"Loading {DATASET_NAME}...")
    
    try:
        dataset = load_dataset(DATASET_NAME, use_auth_token=HF_TOKEN)
        print(f"✓ Dataset loaded successfully")
        print(f"  Splits: {list(dataset.keys())}")
        
        for split_name, split_data in dataset.items():
            print(f"  {split_name}: {len(split_data)} samples")
            if len(split_data) > 0:
                print(f"    Columns: {split_data.column_names}")
        
        return dataset
    
    except Exception as e:
        print(f"✗ Failed to load dataset: {e}")
        raise


def validate_speaker_disjoint(dataset: Dict[str, Any]) -> bool:
    """
    Validate that train/test splits have no overlapping speakers.
    This prevents memorization and ensures fair evaluation.
    
    Args:
        dataset: Dataset dictionary with splits
    
    Returns:
        True if speaker-disjoint, False otherwise
    """
    print("\nValidating speaker-disjoint splits...")
    
    # Check if dataset has speaker_id field
    available_splits = list(dataset.keys())
    
    if 'train' not in available_splits or 'test' not in available_splits:
        print(f"  ⚠ Dataset does not have train/test splits: {available_splits}")
        return True  # Can't validate, assume OK
    
    train_split = dataset['train']
    test_split = dataset['test']
    
    # Check if speaker_id column exists
    if 'speaker_id' not in train_split.column_names:
        print(f"  ⚠ No 'speaker_id' column found. Available columns: {train_split.column_names}")
        return True  # Can't validate, assume OK
    
    train_speakers = set(train_split['speaker_id'])
    test_speakers = set(test_split['speaker_id'])
    
    overlap = train_speakers.intersection(test_speakers)
    
    if overlap:
        print(f"  ✗ Speaker leakage detected! {len(overlap)} speakers in both train and test:")
        print(f"    {list(overlap)[:5]}...")  # Show first 5
        return False
    else:
        print(f"  ✓ Speaker-disjoint validated")
        print(f"    Train speakers: {len(train_speakers)}")
        print(f"    Test speakers: {len(test_speakers)}")
        return True


def extract_critical_fields(example: Dict[str, Any]) -> List[Dict[str, Any]]:
    """
    Extract critical business fields from a dataset sample.
    
    For healthcare domain:
    - Patient names
    - Medication names and dosages
    - Dates and times
    - Symptoms
    - Diagnoses
    - Negations (critical for medical context)
    
    Args:
        example: Dataset sample
    
    Returns:
        List of critical field dictionaries
    """
    # This will be domain-specific based on actual dataset schema
    # For now, return empty list - will be filled when we inspect dataset
    return []


def format_for_pal(example: Dict[str, Any], index: int) -> Dict[str, Any]:
    """
    Convert dataset sample to PAL evaluation format.
    
    Args:
        example: Raw dataset sample
        index: Sample index
    
    Returns:
        Formatted sample for PAL pipeline evaluation
    """
    return {
        "id": f"afriswitch_care_{index}",
        "audio_path": example.get("audio", {}).get("path") if isinstance(example.get("audio"), dict) else example.get("audio"),
        "reference_transcript": example.get("transcript", example.get("text", "")),
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
        }
    }


def process_and_save(dataset: Dict[str, Any]) -> None:
    """
    Process dataset and save to disk for benchmark evaluation.
    
    Args:
        dataset: Loaded dataset dictionary
    """
    print("\nProcessing dataset for PAL evaluation...")
    
    for split_name, split_data in dataset.items():
        print(f"\n  Processing {split_name} split...")
        
        formatted_samples = []
        for idx, example in enumerate(split_data):
            formatted_sample = format_for_pal(example, idx)
            formatted_samples.append(formatted_sample)
        
        # Save to JSON
        output_file = OUTPUT_DIR / f"afriswitch_care_{split_name}.json"
        with open(output_file, 'w', encoding='utf-8') as f:
            json.dump(formatted_samples, f, indent=2, ensure_ascii=False)
        
        print(f"    ✓ Saved {len(formatted_samples)} samples to {output_file}")


def main():
    """Main execution flow"""
    print("="*60)
    print("AfriSwitchCare Dataset Loader for PAL Benchmark")
    print("="*60)
    
    # Load dataset
    dataset = load_afriswitch_care()
    
    # Validate speaker-disjoint splits
    validate_speaker_disjoint(dataset)
    
    # Process and save
    process_and_save(dataset)
    
    print("\n" + "="*60)
    print("✓ Dataset preparation complete")
    print(f"  Output directory: {OUTPUT_DIR}")
    print("="*60)


if __name__ == "__main__":
    main()
