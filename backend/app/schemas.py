import uuid
from datetime import datetime
from typing import Optional, List

from pydantic import BaseModel, EmailStr


# ── Auth ──────────────────────────────────────────────────────────────────────

class UserCreate(BaseModel):
    username: str
    email: EmailStr
    password: str
    role: str = "annotator"
    wallet_address: Optional[str] = None


class UserOut(BaseModel):
    id: uuid.UUID
    username: str
    email: str
    role: str
    wallet_address: Optional[str]
    created_at: datetime

    class Config:
        from_attributes = True


class Token(BaseModel):
    access_token: str
    token_type: str


# ── Tasks ─────────────────────────────────────────────────────────────────────

class TaskCreate(BaseModel):
    title: str
    description: str = ""
    reward_per_annotation_eth: float


class TaskOut(BaseModel):
    id: uuid.UUID
    title: str
    description: str
    reward_per_annotation_wei: str
    status: str
    created_at: datetime

    class Config:
        from_attributes = True


# ── Data Items ────────────────────────────────────────────────────────────────

class DataItemCreate(BaseModel):
    content: str
    item_type: str = "text"
    labels: List[str]
    expert_label: Optional[str] = None


class DataItemOut(BaseModel):
    id: uuid.UUID
    content: str
    item_type: str
    labels: List[str]

    class Config:
        from_attributes = True


# ── Annotations ───────────────────────────────────────────────────────────────

class AnnotationCreate(BaseModel):
    item_id: uuid.UUID
    label: str


class AnnotationOut(BaseModel):
    id: uuid.UUID
    item_id: uuid.UUID
    task_id: uuid.UUID
    label: str
    tx_hash: Optional[str]
    annotation_id_onchain: Optional[str]
    rewarded: bool
    created_at: datetime

    class Config:
        from_attributes = True


# ── Analytics ─────────────────────────────────────────────────────────────────

class KappaResult(BaseModel):
    task_id: str
    fleiss_kappa: float
    interpretation: str
    n_annotations: int
    n_annotators: int
    annotator_reliability: dict
