"""
Tier 1 Metrics: Transcription Quality

Measures ASR baseline quality:
- Word Error Rate (WER)
- Character Error Rate (CER)
- Code-switch detection accuracy
- Language pair identification
"""

from typing import Dict, List, Any
import jiwer


def compute_wer(hypothesis: str, reference: str) -> float:
    """
    Compute Word Error Rate between hypothesis and reference transcripts.
    
    Args:
        hypothesis: System-generated transcript
        reference: Ground truth transcript
    
    Returns:
        WER as percentage (0-100)
    """
    try:
        wer = jiwer.wer(reference, hypothesis)
        return wer * 100  # Convert to percentage
    except Exception as e:
        print(f"Warning: WER computation failed: {e}")
        return 100.0  # Maximum error


def compute_cer(hypothesis: str, reference: str) -> float:
    """
    Compute Character Error Rate between hypothesis and reference transcripts.
    
    Args:
        hypothesis: System-generated transcript
        reference: Ground truth transcript
    
    Returns:
        CER as percentage (0-100)
    """
    try:
        cer = jiwer.cer(reference, hypothesis)
        return cer * 100  # Convert to percentage
    except Exception as e:
        print(f"Warning: CER computation failed: {e}")
        return 100.0  # Maximum error


def evaluate_code_switches(
    predicted_switches: List[Dict[str, Any]],
    reference_switches: List[Dict[str, Any]]
) -> Dict[str, float]:
    """
    Evaluate code-switch detection accuracy.
    
    Measures:
    - Detection accuracy (did we find the switches?)
    - Boundary accuracy (are the spans correct?)
    - Language identification (did we label them correctly?)
    
    Args:
        predicted_switches: List of predicted code-switch spans
        reference_switches: List of ground truth code-switch spans
    
    Returns:
        Dictionary with detection, boundary, and language accuracy
    """
    if not reference_switches:
        # No code-switches in reference
        if not predicted_switches:
            return {"detection": 100.0, "boundary": 100.0, "language": 100.0}
        else:
            # False positives
            return {"detection": 0.0, "boundary": 0.0, "language": 0.0}
    
    if not predicted_switches:
        # Missed all switches
        return {"detection": 0.0, "boundary": 0.0, "language": 0.0}
    
    # Detection accuracy: simple count comparison
    detection_accuracy = min(
        len(predicted_switches) / len(reference_switches),
        1.0
    ) * 100
    
    # Boundary accuracy: IoU-based matching
    matched_spans = 0
    correct_languages = 0
    
    for ref_switch in reference_switches:
        ref_start = ref_switch.get("start", 0)
        ref_end = ref_switch.get("end", 0)
        ref_lang = ref_switch.get("language", "")
        
        best_iou = 0
        best_match = None
        
        for pred_switch in predicted_switches:
            pred_start = pred_switch.get("start", 0)
            pred_end = pred_switch.get("end", 0)
            
            # Compute IoU (Intersection over Union)
            intersection = max(0, min(ref_end, pred_end) - max(ref_start, pred_start))
            union = max(ref_end, pred_end) - min(ref_start, pred_start)
            iou = intersection / union if union > 0 else 0
            
            if iou > best_iou:
                best_iou = iou
                best_match = pred_switch
        
        # Consider matched if IoU > 0.5
        if best_iou > 0.5:
            matched_spans += 1
            
            # Check language accuracy
            if best_match and best_match.get("language") == ref_lang:
                correct_languages += 1
    
    boundary_accuracy = (matched_spans / len(reference_switches)) * 100
    language_accuracy = (correct_languages / len(reference_switches)) * 100 if matched_spans > 0 else 0.0
    
    return {
        "detection": detection_accuracy,
        "boundary": boundary_accuracy,
        "language": language_accuracy
    }


def compute_code_switch_density(switches: List[Dict[str, Any]], duration_seconds: float) -> float:
    """
    Compute code-switch density (switches per minute).
    
    Args:
        switches: List of code-switch spans
        duration_seconds: Audio duration in seconds
    
    Returns:
        Switches per minute
    """
    if duration_seconds <= 0:
        return 0.0
    
    duration_minutes = duration_seconds / 60.0
    return len(switches) / duration_minutes


def evaluate_transcription(
    hypothesis: str,
    reference: str,
    predicted_switches: List[Dict[str, Any]],
    reference_switches: List[Dict[str, Any]],
    duration_seconds: float = 0.0
) -> Dict[str, Any]:
    """
    Comprehensive Tier 1 evaluation.
    
    Args:
        hypothesis: System-generated transcript
        reference: Ground truth transcript
        predicted_switches: Predicted code-switch spans
        reference_switches: Ground truth code-switch spans
        duration_seconds: Audio duration
    
    Returns:
        Dictionary with all Tier 1 metrics
    """
    wer = compute_wer(hypothesis, reference)
    cer = compute_cer(hypothesis, reference)
    code_switch_metrics = evaluate_code_switches(predicted_switches, reference_switches)
    density = compute_code_switch_density(reference_switches, duration_seconds)
    
    return {
        "wer": wer,
        "cer": cer,
        "code_switch_detection": code_switch_metrics["detection"],
        "code_switch_boundary": code_switch_metrics["boundary"],
        "code_switch_language": code_switch_metrics["language"],
        "code_switch_density": density,
        "passed": wer < 15.0 and code_switch_metrics["detection"] > 90.0
    }
