from sqlalchemy.orm import Session
from datetime import datetime, timedelta
from backend_fastapi import models

def find_available_slot(db: Session, case_id: int, priority: int):
    # Mock implementation for finding a slot
    # In a real system, this would query availability tables for judges and lawyers assigned to the case type
    # Here we just pick a future date
    
    # 1. Get case details (maybe to find specific judge requirements)
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if not case:
        return None
    
    # 2. Find a judge and lawyer (simplified: just picking first available)
    judge = db.query(models.Judge).first()
    lawyer = db.query(models.Lawyer).first()
    
    if not judge or not lawyer:
        return None

    # 3. Find a slot
    # Logic: check next 30 days
    start_date = datetime.utcnow() + timedelta(days=1)
    
    # Simple logic: Assign a slot based on priority
    # Priority 1 (High) -> ASAP (within 3 days)
    # Priority 2 (Medium) -> Within 7 days
    # Priority 3 (Low) -> Within 30 days
    
    days_to_add = priority * 2 # Mock logic
    proposed_date = start_date + timedelta(days=days_to_add)
    
    # Check if slot is taken (basic check)
    existing_hearing = db.query(models.Hearing).filter(
        models.Hearing.judge_id == judge.id,
        models.Hearing.date == proposed_date
    ).first()
    
    if existing_hearing:
        # Conflict: try next day
        proposed_date = proposed_date + timedelta(days=1)
        
    return {
        "judge_id": judge.id,
        "lawyer_id": lawyer.id,
        "date": proposed_date,
        "courtroom": "Room 101"
    }

def confirm_schedule(db: Session, case_id: int, judge_id: int, lawyer_id: int, date: datetime, courtroom: str):
    hearing = models.Hearing(
        case_id=case_id,
        judge_id=judge_id,
        lawyer_id=lawyer_id,
        date=date,
        courtroom=courtroom
    )
    db.add(hearing)
    db.commit()
    db.refresh(hearing)
    return hearing
