from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from typing import List
from backend_fastapi import models, schemas, auth
from backend_fastapi.database import get_db

router = APIRouter(tags=["laws"])

@router.post("/search", response_model=List[schemas.Law])
def search_laws(query: str, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    # Simple search implementation
    # In production, use pg_trgm or full-text search
    search = f"%{query}%"
    results = db.query(models.Law).filter(
        (models.Law.title.ilike(search)) | 
        (models.Law.description.ilike(search)) |
        (models.Law.keywords.ilike(search))
    ).limit(20).all()
    return results
