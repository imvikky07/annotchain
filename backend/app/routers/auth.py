import uuid

from fastapi import APIRouter, Depends, HTTPException, status
from fastapi.security import OAuth2PasswordRequestForm
from sqlalchemy.orm import Session

from app.database import get_db
from app.models import User
from app.auth import verify_password, hash_password, create_access_token, get_current_user
from app.schemas import UserCreate, UserOut, Token

router = APIRouter(prefix="/auth", tags=["auth"])


@router.post("/register", response_model=UserOut, status_code=201)
def register(payload: UserCreate, db: Session = Depends(get_db)):
    if db.query(User).filter(User.email == payload.email).first():
        raise HTTPException(400, "Email already registered")
    if db.query(User).filter(User.username == payload.username).first():
        raise HTTPException(400, "Username already taken")

    user = User(
        id=uuid.uuid4(),
        username=payload.username,
        email=payload.email,
        hashed_password=hash_password(payload.password),
        role=payload.role,
        wallet_address=payload.wallet_address,
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    return user


@router.post("/token", response_model=Token)
def login(
    form_data: OAuth2PasswordRequestForm = Depends(),
    db: Session = Depends(get_db),
):
    user = db.query(User).filter(User.username == form_data.username).first()
    if not user or not verify_password(form_data.password, user.hashed_password):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect username or password",
        )
    token = create_access_token({"sub": str(user.id), "role": user.role})
    return {"access_token": token, "token_type": "bearer"}


@router.get("/me", response_model=UserOut)
def me(current_user: User = Depends(get_current_user)):
    return current_user


# ── Profile update endpoints ───────────────────────────────────────────

from pydantic import BaseModel as _BM
from typing import Optional as _Opt

class WalletUpdate(_BM):
    wallet_address: _Opt[str] = None

class PasswordUpdate(_BM):
    current_password: str
    new_password: str

@router.patch("/wallet", response_model=UserOut)
def update_wallet(
    payload: WalletUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if payload.wallet_address and not payload.wallet_address.startswith("0x"):
        raise HTTPException(400, "Invalid wallet address")
    current_user.wallet_address = payload.wallet_address
    db.commit()
    db.refresh(current_user)
    return current_user


@router.patch("/password")
def change_password(
    payload: PasswordUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user),
):
    if not verify_password(payload.current_password, current_user.hashed_password):
        raise HTTPException(400, "Current password is incorrect")
    if len(payload.new_password) < 8:
        raise HTTPException(400, "New password must be at least 8 characters")
    current_user.hashed_password = hash_password(payload.new_password)
    db.commit()
    return {"message": "Password updated successfully"}
