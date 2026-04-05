import io
import json
import uuid

from fastapi import APIRouter, Depends, HTTPException
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Annotation, AgreementScore, DataItem, Task
from app.schemas import KappaResult
from app.auth import require_admin
from app.models import User
from app.services.kappa import compute_fleiss_kappa, interpret_kappa, compute_annotator_reliability
from app.services.export import export_to_json, export_to_csv

router = APIRouter(prefix="/analytics", tags=["analytics"])


@router.post("/kappa/{task_id}", response_model=KappaResult)
def compute_task_kappa(
    task_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    annotations = db.query(Annotation).filter(Annotation.task_id == task_id).all()
    if not annotations:
        raise HTTPException(404, "No annotations found for this task")

    items = db.query(DataItem).filter(DataItem.task_id == task_id).all()
    if not items:
        raise HTTPException(404, "No data items found for this task")

    # Collect valid labels from first item (all items share the same label set)
    labels = json.loads(items[0].labels)

    ann_dicts = [
        {
            "item_id":       str(a.item_id),
            "label":         a.label,
            "annotator_id":  str(a.user_id),
        }
        for a in annotations
    ]

    kappa          = compute_fleiss_kappa(ann_dicts, labels)
    interpretation = interpret_kappa(kappa)

    # Expert ground-truth comparison
    expert_map   = {str(i.id): i.expert_label for i in items if i.expert_label}
    reliability  = compute_annotator_reliability(ann_dicts, expert_map)
    n_annotators = len(set(a.user_id for a in annotations))

    # Persist score
    score = AgreementScore(
        id=uuid.uuid4(),
        task_id=task_id,
        kappa=kappa,
        n_annotators=n_annotators,
    )
    db.add(score)
    db.commit()

    return KappaResult(
        task_id=task_id,
        fleiss_kappa=kappa,
        interpretation=interpretation,
        n_annotations=len(annotations),
        n_annotators=n_annotators,
        annotator_reliability=reliability,
    )


@router.get("/kappa/{task_id}/history")
def kappa_history(
    task_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    scores = (
        db.query(AgreementScore)
        .filter(AgreementScore.task_id == task_id)
        .order_by(AgreementScore.computed_at.desc())
        .all()
    )
    return [
        {
            "kappa":        s.kappa,
            "interpretation": interpret_kappa(s.kappa),
            "n_annotators": s.n_annotators,
            "computed_at":  s.computed_at.isoformat(),
        }
        for s in scores
    ]


@router.get("/export/{task_id}")
def export_json(
    task_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    return export_to_json(task_id, db)


@router.get("/export/{task_id}/csv")
def export_csv_file(
    task_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    csv_str = export_to_csv(task_id, db)
    return StreamingResponse(
        io.StringIO(csv_str),
        media_type="text/csv",
        headers={
            "Content-Disposition": f"attachment; filename=annotations-{task_id}.csv"
        },
    )


@router.get("/overview")
def platform_overview(
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """High-level platform statistics."""
    from app.models import User as UserModel, Reward
    return {
        "total_tasks":       db.query(Task).count(),
        "total_annotations": db.query(Annotation).count(),
        "total_annotators":  db.query(UserModel).filter(UserModel.role == "annotator").count(),
        "total_rewards_paid": db.query(Reward).count(),
        "on_chain_confirmed": db.query(Annotation).filter(Annotation.tx_hash.isnot(None)).count(),
    }
