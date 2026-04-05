"""
Fleiss' Kappa implementation for inter-annotator agreement.
Also provides annotator reliability scoring vs expert ground truth.
"""

import numpy as np
from typing import List, Dict


def compute_fleiss_kappa(
    annotations: List[Dict],   # [{"item_id": str, "label": str, "annotator_id": str}]
    labels: List[str],
) -> float:
    """
    Compute Fleiss' Kappa for inter-annotator agreement.

    Interpretation:
        < 0.00  = less than chance agreement
        0.01–0.20 = slight
        0.21–0.40 = fair
        0.41–0.60 = moderate
        0.61–0.80 = substantial
        0.81–1.00 = almost perfect

    Args:
        annotations: list of dicts with keys item_id, label, annotator_id
        labels: exhaustive list of all possible category labels

    Returns:
        kappa (float, rounded to 4 dp)
    """
    if not annotations or not labels:
        return 0.0

    item_ids   = sorted(set(a["item_id"] for a in annotations))
    label_idx  = {l: i for i, l in enumerate(labels)}
    item_idx   = {item: i for i, item in enumerate(item_ids)}

    n_items  = len(item_ids)
    n_labels = len(labels)

    # M[i][j] = number of annotators who assigned label j to item i
    M = np.zeros((n_items, n_labels), dtype=float)
    for ann in annotations:
        i = item_idx.get(str(ann["item_id"]))
        j = label_idx.get(str(ann["label"]))
        if i is not None and j is not None:
            M[i][j] += 1

    # n_j = annotations per item
    n_j = M.sum(axis=1)

    # Filter items with fewer than 2 annotators
    valid = n_j >= 2
    M   = M[valid]
    n_j = n_j[valid]

    if len(M) == 0:
        return 0.0

    # Per-item observed agreement
    P_i = (np.sum(M ** 2, axis=1) - n_j) / (n_j * (n_j - 1))
    P_bar = float(P_i.mean())

    # Expected agreement (chance)
    total_assignments = M.sum()
    if total_assignments == 0:
        return 0.0
    p_k     = M.sum(axis=0) / total_assignments
    P_e_bar = float(np.sum(p_k ** 2))

    if P_e_bar >= 1.0:
        return 1.0

    kappa = (P_bar - P_e_bar) / (1.0 - P_e_bar)
    return float(round(kappa, 4))


def interpret_kappa(kappa: float) -> str:
    if kappa < 0:
        return "less than chance"
    if kappa < 0.20:
        return "slight"
    if kappa < 0.40:
        return "fair"
    if kappa < 0.60:
        return "moderate"
    if kappa < 0.80:
        return "substantial"
    return "almost perfect"


def compute_annotator_reliability(
    annotations: List[Dict],
    expert_annotations: Dict[str, str],  # {item_id: expert_label}
) -> Dict[str, float]:
    """
    Per-annotator reliability: fraction of labels matching expert ground truth.

    Args:
        annotations: same list as compute_fleiss_kappa
        expert_annotations: {item_id: expert_label}

    Returns:
        {annotator_id: reliability_score (0.0–1.0)}
    """
    annotator_scores: Dict[str, List[float]] = {}

    for ann in annotations:
        uid    = str(ann["annotator_id"])
        expert = expert_annotations.get(str(ann["item_id"]))
        if expert is None:
            continue
        match = 1.0 if str(ann["label"]) == str(expert) else 0.0
        annotator_scores.setdefault(uid, []).append(match)

    return {
        uid: round(float(np.mean(scores)), 4)
        for uid, scores in annotator_scores.items()
        if scores
    }
