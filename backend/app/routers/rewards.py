import uuid

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import Annotation, User, Reward, Task
from app.schemas import AnnotationOut
from app.auth import get_current_user, require_admin
from app.services.blockchain import BlockchainService

router     = APIRouter(prefix="/rewards", tags=["rewards"])
blockchain = BlockchainService()


@router.post("/pay/{annotation_id}")
def pay_reward(
    annotation_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    ann = db.query(Annotation).filter(Annotation.id == annotation_id).first()
    if not ann:
        raise HTTPException(404, "Annotation not found")
    if ann.rewarded:
        raise HTTPException(400, "This annotation has already been rewarded")
    if not ann.annotation_id_onchain:
        raise HTTPException(400, "No on-chain record for this annotation — cannot pay reward")

    user = db.query(User).filter(User.id == ann.user_id).first()
    if not user or not user.wallet_address:
        raise HTTPException(400, "Annotator has no wallet address registered")

    task       = db.query(Task).filter(Task.id == ann.task_id).first()
    amount_wei = task.reward_per_annotation_wei if task else "0"

    tx_hash = blockchain.pay_reward(
        annotator_address=user.wallet_address,
        annotation_id_hex=ann.annotation_id_onchain,
    )

    ann.rewarded = True
    reward = Reward(
        id=uuid.uuid4(),
        user_id=user.id,
        annotation_id=ann.id,
        amount_wei=amount_wei,
        tx_hash=tx_hash,
    )
    db.add(reward)
    db.commit()

    return {
        "tx_hash":       tx_hash,
        "annotation_id": annotation_id,
        "amount_wei":    amount_wei,
        "annotator":     user.username,
        "wallet":        user.wallet_address,
    }


@router.post("/pay-task/{task_id}")
def pay_all_task_rewards(
    task_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    """Pay rewards for all un-rewarded annotations in a task."""
    annotations = (
        db.query(Annotation)
        .filter(Annotation.task_id == task_id, Annotation.rewarded == False)
        .all()
    )
    results = []
    for ann in annotations:
        if not ann.annotation_id_onchain:
            results.append({"annotation_id": str(ann.id), "status": "skipped — no on-chain id"})
            continue
        user = db.query(User).filter(User.id == ann.user_id).first()
        if not user or not user.wallet_address:
            results.append({"annotation_id": str(ann.id), "status": "skipped — no wallet"})
            continue
        try:
            task       = db.query(Task).filter(Task.id == ann.task_id).first()
            amount_wei = task.reward_per_annotation_wei if task else "0"
            tx_hash    = blockchain.pay_reward(user.wallet_address, ann.annotation_id_onchain)
            ann.rewarded = True
            db.add(Reward(
                id=uuid.uuid4(),
                user_id=user.id,
                annotation_id=ann.id,
                amount_wei=amount_wei,
                tx_hash=tx_hash,
            ))
            db.commit()
            results.append({"annotation_id": str(ann.id), "status": "paid", "tx_hash": tx_hash})
        except Exception as e:
            results.append({"annotation_id": str(ann.id), "status": f"error: {e}"})

    return {"task_id": task_id, "results": results}


@router.get("/history")
def reward_history(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    rewards = (
        db.query(Reward)
        .filter(Reward.user_id == current_user.id)
        .order_by(Reward.paid_at.desc())
        .all()
    )
    return [
        {
            "id":            str(r.id),
            "annotation_id": str(r.annotation_id),
            "amount_wei":    r.amount_wei,
            "tx_hash":       r.tx_hash,
            "paid_at":       r.paid_at.isoformat(),
        }
        for r in rewards
    ]
