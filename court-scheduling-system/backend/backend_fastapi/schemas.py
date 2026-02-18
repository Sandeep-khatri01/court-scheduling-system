from pydantic import BaseModel
from typing import Optional, List
from datetime import datetime
from backend_fastapi.models import UserRole, CaseStatus

class UserBase(BaseModel):
    username: str
    email: str
    role: UserRole = UserRole.CLERK

class UserCreate(UserBase):
    password: str

class User(UserBase):
    id: int
    is_active: bool
    class Config:
        from_attributes = True

class Token(BaseModel):
    access_token: str
    token_type: str

class TokenData(BaseModel):
    username: Optional[str] = None
    role: Optional[UserRole] = None

class CaseBase(BaseModel):
    title: str
    description: str
    case_number: str

class CaseCreate(CaseBase):
    pass

class CaseUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    status: Optional[CaseStatus] = None

class Case(CaseBase):
    id: int
    status: CaseStatus
    filing_date: datetime
    class Config:
        from_attributes = True

class HearingBase(BaseModel):
    case_id: int
    judge_id: int
    lawyer_id: int
    date: datetime
    courtroom: str
    notes: Optional[str] = None

class HearingCreate(HearingBase):
    pass

class Hearing(HearingBase):
    id: int
    class Config:
        from_attributes = True

class LawBase(BaseModel):
    title: str
    section: str
    description: str
    keywords: str

class LawCreate(LawBase):
    pass

class Law(LawBase):
    id: int
    class Config:
        from_attributes = True

class ChatQuery(BaseModel):
    query: str
    case_context_id: Optional[int] = None

class ScheduleRequest(BaseModel):
    case_id: int
    priority: int = 1 # 1-High, 2-Medium, 3-Low
    deadline: Optional[datetime] = None
