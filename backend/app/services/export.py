"""
Research export service — produce CSV and JSON reports
with full annotation data, on-chain references, and agreement scores.
"""

import csv
import io
import json

from sqlalchemy.orm import Session

from app.models import Annotation, AgreementScore, DataItem, User


def export_to_json(task_id: str, db: Session) -> dict:
    annotations = (
        db.query(Annotation).filter(Annotation.task_id == task_id).all()
    )
    scores = (
        db.query(AgreementScore).filter(AgreementScore.task_id == task_id).all()
    )
    items = {
        str(i.id): i
        for i in db.query(DataItem).filter(DataItem.task_id == task_id).all()
    }
    users = {str(u.id): u.username for u in db.query(User).all()}

    return {
        "task_id": task_id,
        "total_annotations": len(annotations),
        "annotations": [
            {
                "annotation_id":          str(a.id),
                "annotator":              users.get(str(a.user_id), "unknown"),
                "item_id":                str(a.item_id),
                "item_content":           items[str(a.item_id)].content if str(a.item_id) in items else "",
                "label":                  a.label,
                "expert_label":           items[str(a.item_id)].expert_label if str(a.item_id) in items else None,
                "tx_hash":                a.tx_hash,
                "annotation_id_onchain":  a.annotation_id_onchain,
                "rewarded":               a.rewarded,
                "created_at":             a.created_at.isoformat(),
            }
            for a in annotations
        ],
        "agreement_scores": [
            {
                "kappa":         s.kappa,
                "n_annotators":  s.n_annotators,
                "computed_at":   s.computed_at.isoformat(),
            }
            for s in scores
        ],
    }


def export_to_csv(task_id: str, db: Session) -> str:
    data   = export_to_json(task_id, db)
    output = io.StringIO()
    fields = [
        "annotation_id", "annotator", "item_id", "item_content",
        "label", "expert_label", "tx_hash", "annotation_id_onchain",
        "rewarded", "created_at",
    ]
    writer = csv.DictWriter(output, fieldnames=fields, extrasaction="ignore")
    writer.writeheader()
    writer.writerows(data["annotations"])
    return output.getvalue()
