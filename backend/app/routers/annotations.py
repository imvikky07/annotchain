import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Annotation, DataItem, Task, User
from app.schemas import AnnotationCreate, AnnotationOut
from app.auth import get_current_user
from app.services.blockchain import BlockchainService

router     = APIRouter(prefix="/annotations", tags=["annotations"])
blockchain = BlockchainService()

DUMMY_ADDRESS = "0x0000000000000000000000000000000000000000"


@router.post("/", response_model=AnnotationOut, status_code=201)
def submit_annotation(
    payload: AnnotationCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    # 1. Validate item exists
    item = db.query(DataItem).filter(DataItem.id == payload.item_id).first()
    if not item:
        raise HTTPException(404, "Item not found")

    # 2. Prevent duplicate
    existing = db.query(Annotation).filter(
        Annotation.user_id == current_user.id,
        Annotation.item_id == payload.item_id,
    ).first()
    if existing:
        raise HTTPException(400, "You have already annotated this item")

    # 3. Validate label is in the allowed set
    import json
    allowed = json.loads(item.labels)
    if payload.label not in allowed:
        raise HTTPException(400, f"Label '{payload.label}' not valid for this item. Allowed: {allowed}")

    # 4. Submit on-chain
    task = db.query(Task).filter(Task.id == item.task_id).first()
    tx_hash, annotation_id_onchain = None, None
    try:
        tx_hash, annotation_id_onchain = blockchain.submit_annotation(
            task_id=str(task.id),
            item_id=str(item.id),
            label=payload.label,
        )
    except Exception as e:
        print(f"[warn] on-chain submit failed: {e}")

    # 5. Store off-chain
    ann = Annotation(
        id=uuid.uuid4(),
        user_id=current_user.id,
        task_id=item.task_id,
        item_id=payload.item_id,
        label=payload.label,
        tx_hash=tx_hash,
        annotation_id_onchain=annotation_id_onchain,
    )
    db.add(ann)
    db.commit()
    db.refresh(ann)
    return ann


@router.get("/mine", response_model=list[AnnotationOut])
def my_annotations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    return (
        db.query(Annotation)
        .filter(Annotation.user_id == current_user.id)
        .order_by(Annotation.created_at.desc())
        .all()
    )


@router.get("/task/{task_id}", response_model=list[AnnotationOut])
def task_annotations(
    task_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Annotation).filter(Annotation.task_id == task_id).all()
