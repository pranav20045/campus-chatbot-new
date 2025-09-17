from datetime import datetime, timedelta, timezone
from typing import Optional
from fastapi import Depends, HTTPException, status
from fastapi.security import OAuth2PasswordBearer
from sqlalchemy.orm import Session
from passlib.context import CryptContext
import jwt
from .config import settings
from .database import get_db
from . import models

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="/api/auth/login")


def verify_password(plain_password: str, password_hash: str) -> bool:
	return pwd_context.verify(plain_password, password_hash)


def get_password_hash(password: str) -> str:
	return pwd_context.hash(password)


def create_access_token(data: dict, expires_minutes: int = settings.access_token_expires_minutes) -> str:
	to_encode = data.copy()
	expire = datetime.now(timezone.utc) + timedelta(minutes=expires_minutes)
	to_encode.update({"exp": expire})
	encoded_jwt = jwt.encode(to_encode, settings.secret_key, algorithm=settings.algorithm)
	return encoded_jwt


def get_current_user(db: Session = Depends(get_db), token: str = Depends(oauth2_scheme)) -> models.User:
	credentials_exception = HTTPException(
		status_code=status.HTTP_401_UNAUTHORIZED,
		detail="Could not validate credentials",
		headers={"WWW-Authenticate": "Bearer"},
	)
	try:
		payload = jwt.decode(token, settings.secret_key, algorithms=[settings.algorithm])
		user_id: Optional[int] = payload.get("sub")
		if user_id is None:
			raise credentials_exception
	except jwt.PyJWTError:
		raise credentials_exception
	user = db.query(models.User).filter(models.User.id == int(user_id)).first()
	if user is None:
		raise credentials_exception
	return user


def require_role(role: str):
	def role_checker(user: models.User = Depends(get_current_user)) -> models.User:
		if user.role != role:
			raise HTTPException(status_code=403, detail="Forbidden")
		return user
	return role_checker
