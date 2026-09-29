"""Validate the current AfriSwitchCare dataset contract.

This script intentionally performs only contract validation. It does not
create a train/test split and does not infer unsupported fields.
"""

from datasets import load_dataset

DATASET = "intronhealth/AfriSwitchCare"

def main() -> None:
    ds = load_dataset(DATASET)
    keys = list(ds.keys())

    if keys != ["test"]:
        raise AssertionError(
            f"AfriSwitchCare contract changed or is not evaluation-only: splits={keys}"
        )

    test = ds["test"]
    required = {
        "audio",
        "language",
        "diagnosis",
        "transcription",
        "transcription_tagged",
        "num_turns",
        "cmi",
        "num_switch_points",
        "duration",
    }

    missing = sorted(required - set(test.column_names))
    if missing:
        raise AssertionError(f"Missing documented dataset fields: {missing}")

    if len(test) != 108:
        raise AssertionError(
            f"Unexpected test size: {len(test)}; expected the current dataset-card size of 108"
        )

    languages = set(test["language"])
    expected_language_count = 9
    if len(languages) != expected_language_count:
        raise AssertionError(
            f"Unexpected language-config count: {len(languages)}; expected {expected_language_count}"
        )

    print("AfriSwitchCare contract OK")
    print(f"split=test samples={len(test)} languages={sorted(languages)}")
    print("No train/test split is assumed or created.")

if __name__ == "__main__":
    main()
