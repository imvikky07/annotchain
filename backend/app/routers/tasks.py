import uuid
import json

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from web3 import Web3

from app.database import get_db
from app.models import Task, DataItem
from app.schemas import TaskCreate, TaskOut, DataItemCreate, DataItemOut
from app.auth import get_current_user, require_admin
from app.models import User
from app.services.blockchain import BlockchainService

router     = APIRouter(prefix="/tasks", tags=["tasks"])
blockchain = BlockchainService()


@router.post("/", response_model=TaskOut, status_code=201)
def create_task(
    payload: TaskCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    reward_wei = Web3.to_wei(payload.reward_per_annotation_eth, "ether")

    task = Task(
        id=uuid.uuid4(),
        title=payload.title,
        description=payload.description,
        reward_per_annotation_wei=str(reward_wei),
    )
    db.add(task)
    db.commit()
    db.refresh(task)

    # Register on-chain (non-blocking in production; wrap in try/except)
    try:
        blockchain.create_task(str(task.id), reward_wei)
    except Exception as e:
        # Log but don't fail — admin can retry via /fund endpoint
        print(f"[warn] on-chain task creation failed: {e}")

    return task


@router.get("/", response_model=list[TaskOut])
def list_tasks(
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    return db.query(Task).filter(Task.status == "active").all()


@router.get("/{task_id}", response_model=TaskOut)
def get_task(
    task_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")
    return task


@router.post("/{task_id}/items", response_model=DataItemOut, status_code=201)
def add_item(
    task_id: str,
    payload: DataItemCreate,
    db: Session = Depends(get_db),
    _: User = Depends(require_admin),
):
    task = db.query(Task).filter(Task.id == task_id).first()
    if not task:
        raise HTTPException(404, "Task not found")

    item = DataItem(
        id=uuid.uuid4(),
        task_id=task_id,
        content=payload.content,
        item_type=payload.item_type,
        labels=json.dumps(payload.labels),
        expert_label=payload.expert_label,
    )
    db.add(item)
    db.commit()
    db.refresh(item)
    return {**item.__dict__, "labels": payload.labels}


@router.get("/{task_id}/items", response_model=list[DataItemOut])
def get_items(
    task_id: str,
    db: Session = Depends(get_db),
    _: User = Depends(get_current_user),
):
    items = db.query(DataItem).filter(DataItem.task_id == task_id).all()
    return [{**i.__dict__, "labels": json.loads(i.labels)} for i in items]


@router.post("/{task_id}/fund")
def fund_task(
    task_id: str,
    amount_eth: float,
    _: User = Depends(require_admin),
):
    amount_wei = Web3.to_wei(amount_eth, "ether")
    tx_hash    = blockchain.deposit_funds(task_id, amount_wei)
    return {"tx_hash": tx_hash, "amount_eth": amount_eth, "task_id": task_id}


@router.get("/{task_id}/balance")
def task_balance(_: User = Depends(require_admin)):
    return blockchain.get_contract_balance()
