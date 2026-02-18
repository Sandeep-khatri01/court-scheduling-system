from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from typing import List
from backend_fastapi import models, schemas, auth
from backend_fastapi.database import get_db

router = APIRouter(tags=["cases"])

@router.post("/", response_model=schemas.Case)
def create_case(case: schemas.CaseCreate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    db_case = models.Case(**case.model_dump(), filing_date=datetime.utcnow(), status=models.CaseStatus.OPEN)
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case

@router.get("/", response_model=List[schemas.Case])
def read_cases(skip: int = 0, limit: int = 100, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    cases = db.query(models.Case).offset(skip).limit(limit).all()
    return cases

@router.get("/{case_id}", response_model=schemas.Case)
def read_case(case_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    return case

@router.put("/{case_id}", response_model=schemas.Case)
def update_case(case_id: int, case_update: schemas.CaseUpdate, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    db_case = db.query(models.Case).filter(models.Case.id == case_id).first()
    if db_case is None:
        raise HTTPException(status_code=404, detail="Case not found")
    
    update_data = case_update.model_dump(exclude_unset=True)
    for key, value in update_data.items():
        setattr(db_case, key, value)
    
    db.add(db_case)
    db.commit()
    db.refresh(db_case)
    return db_case
