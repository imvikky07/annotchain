import uuid
import datetime

from sqlalchemy import (
    Column, String, Integer, Float, Boolean,
    DateTime, Text, ForeignKey,
)
from sqlalchemy.orm import relationship
from sqlalchemy.dialects.postgresql import UUID

from app.database import Base


class User(Base):
    __tablename__ = "users"

    id               = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    username         = Column(String(50), unique=True, index=True, nullable=False)
    email            = Column(String(120), unique=True, index=True, nullable=False)
    hashed_password  = Column(String, nullable=False)
    role             = Column(String(20), default="annotator")   # admin | annotator
    wallet_address   = Column(String(42), nullable=True)          # Ethereum address
    created_at       = Column(DateTime, default=datetime.datetime.utcnow)

    annotations = relationship("Annotation", back_populates="user")
    rewards     = relationship("Reward", back_populates="user")


class Task(Base):
    __tablename__ = "tasks"

    id                        = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    title                     = Column(String(200), nullable=False)
    description               = Column(Text, default="")
    reward_per_annotation_wei = Column(String, nullable=False)  # stored as string to avoid float issues
    status                    = Column(String(20), default="active")
    created_at                = Column(DateTime, default=datetime.datetime.utcnow)

    items            = relationship("DataItem", back_populates="task")
    agreement_scores = relationship("AgreementScore", back_populates="task")


class DataItem(Base):
    __tablename__ = "data_items"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id      = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    content      = Column(Text, nullable=False)    # text / image URL / etc.
    item_type    = Column(String(20), default="text")  # text | image
    labels       = Column(Text, nullable=False)    # JSON array of valid label strings
    expert_label = Column(String(100), nullable=True)  # ground-truth label from expert

    task        = relationship("Task", back_populates="items")
    annotations = relationship("Annotation", back_populates="item")


class Annotation(Base):
    __tablename__ = "annotations"

    id                    = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id               = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    task_id               = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    item_id               = Column(UUID(as_uuid=True), ForeignKey("data_items.id"), nullable=False)
    label                 = Column(String(100), nullable=False)
    tx_hash               = Column(String(66), nullable=True)   # on-chain tx hash
    annotation_id_onchain = Column(String(66), nullable=True)   # bytes32 from contract
    rewarded              = Column(Boolean, default=False)
    created_at            = Column(DateTime, default=datetime.datetime.utcnow)

    user    = relationship("User", back_populates="annotations")
    item    = relationship("DataItem", back_populates="annotations")
    rewards = relationship("Reward", back_populates="annotation")


class AgreementScore(Base):
    __tablename__ = "agreement_scores"

    id           = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    task_id      = Column(UUID(as_uuid=True), ForeignKey("tasks.id"), nullable=False)
    item_id      = Column(UUID(as_uuid=True), ForeignKey("data_items.id"), nullable=True)
    kappa        = Column(Float, nullable=False)
    n_annotators = Column(Integer, nullable=False)
    computed_at  = Column(DateTime, default=datetime.datetime.utcnow)

    task = relationship("Task", back_populates="agreement_scores")


class Reward(Base):
    __tablename__ = "rewards"

    id            = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id       = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=False)
    annotation_id = Column(UUID(as_uuid=True), ForeignKey("annotations.id"), nullable=False)
    amount_wei    = Column(String, default="0")
    tx_hash       = Column(String(66), nullable=False)
    paid_at       = Column(DateTime, default=datetime.datetime.utcnow)

    user       = relationship("User", back_populates="rewards")
    annotation = relationship("Annotation", back_populates="rewards")
