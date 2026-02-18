from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend_fastapi import models, schemas, auth
from backend_fastapi.database import get_db
from backend_fastapi.services import scheduling_service

router = APIRouter(tags=["schedule"])

@router.post("/generate", response_model=schemas.Hearing)
def generate_schedule(schedule_request: schemas.ScheduleRequest, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    slot = scheduling_service.find_available_slot(db, schedule_request.case_id, schedule_request.priority)
    
    if not slot:
        raise HTTPException(status_code=400, detail="No available slots found for the given criteria.")
        
    hearing = scheduling_service.confirm_schedule(
        db, 
        case_id=schedule_request.case_id,
        judge_id=slot["judge_id"],
        lawyer_id=slot["lawyer_id"],
        date=slot["date"],
        courtroom=slot["courtroom"]
    )
    return hearing
