from sqlalchemy import Column, Integer, String, DateTime, ForeignKey, Boolean, Text, Enum
from sqlalchemy.orm import relationship
from datetime import datetime
import enum
from backend_fastapi.database import Base

class UserRole(str, enum.Enum):
    ADMIN = "admin"
    JUDGE = "judge"
    LAWYER = "lawyer"
    CLERK = "clerk"

class CaseStatus(str, enum.Enum):
    OPEN = "open"
    CLOSED = "closed"
    ADJOURNED = "adjourned"
    PENDING = "pending"

class User(Base):
    __tablename__ = "users"
    id = Column(Integer, primary_key=True, index=True)
    username = Column(String, unique=True, index=True)
    email = Column(String, unique=True, index=True)
    password_hash = Column(String)
    role = Column(Enum(UserRole), default=UserRole.CLERK)
    is_active = Column(Boolean, default=True)

class Case(Base):
    __tablename__ = "cases"
    id = Column(Integer, primary_key=True, index=True)
    case_number = Column(String, unique=True, index=True)
    title = Column(String, index=True)
    description = Column(Text)
    status = Column(Enum(CaseStatus), default=CaseStatus.OPEN)
    filing_date = Column(DateTime, default=datetime.utcnow)
    hearings = relationship("Hearing", back_populates="case")
    adjournments = relationship("Adjournment", back_populates="case")

class Lawyer(Base):
    __tablename__ = "lawyers"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    specialization = Column(String)
    bar_number = Column(String, unique=True)
    user = relationship("User")

class Judge(Base):
    __tablename__ = "judges"
    id = Column(Integer, primary_key=True, index=True)
    user_id = Column(Integer, ForeignKey("users.id"))
    specialization = Column(String)
    user = relationship("User")

class Hearing(Base):
    __tablename__ = "hearings"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    judge_id = Column(Integer, ForeignKey("judges.id"))
    lawyer_id = Column(Integer, ForeignKey("lawyers.id"))
    date = Column(DateTime)
    courtroom = Column(String)
    notes = Column(Text)
    case = relationship("Case", back_populates="hearings")
    judge = relationship("Judge")
    lawyer = relationship("Lawyer")

class Law(Base):
    __tablename__ = "laws"
    id = Column(Integer, primary_key=True, index=True)
    title = Column(String, index=True)
    section = Column(String)
    description = Column(Text)
    keywords = Column(String) # Comma separated keywords for basic search

class Adjournment(Base):
    __tablename__ = "adjournments"
    id = Column(Integer, primary_key=True, index=True)
    case_id = Column(Integer, ForeignKey("cases.id"))
    reason = Column(Text)
    requested_by = Column(Integer, ForeignKey("users.id"))
    status = Column(String, default="pending") # pending, approved, rejected
    case = relationship("Case", back_populates="adjournments")

class Availability(Base):
    __tablename__ = "availability"
    id = Column(Integer, primary_key=True, index=True)
    entity_id = Column(Integer, ForeignKey("users.id")) # Can be Judge or Lawyer user_id
    date = Column(DateTime)
    is_available = Column(Boolean, default=True)

