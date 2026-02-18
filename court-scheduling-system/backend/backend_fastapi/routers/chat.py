from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from backend_fastapi import models, schemas, auth
from backend_fastapi.database import get_db
from backend_fastapi.services import ai_service

router = APIRouter(tags=["chat"])

@router.post("/query")
def chat_query(query: schemas.ChatQuery, db: Session = Depends(get_db), current_user: models.User = Depends(auth.get_current_active_user)):
    context = ""
    
    # 1. Get Case Context
    if query.case_context_id:
        case = db.query(models.Case).filter(models.Case.id == query.case_context_id).first()
        if case:
            context += f"Case: {case.title} ({case.case_number})\nDescription: {case.description}\nStatus: {case.status}\n\n"
    
    # 2. Search Laws (simple keyword search on query)
    # Extract keywords (simple split)
    keywords = query.query.split()
    relevant_laws = []
    for word in keywords:
        if len(word) > 4: # basic filter
            matches = db.query(models.Law).filter(models.Law.description.ilike(f"%{word}%")).limit(2).all()
            relevant_laws.extend(matches)
    
    # Deduplicate laws
    seen_laws = set()
    unique_laws = []
    for law in relevant_laws:
        if law.id not in seen_laws:
            unique_laws.append(law)
            seen_laws.add(law.id)
            
    if unique_laws:
        context += "Relevant Laws:\n"
        for law in unique_laws:
            context += f"- {law.title} ({law.section}): {law.description[:200]}...\n"
            
    # 3. Generate Response
    response = ai_service.generate_response(query.query, context)
    return {"response": response, "context_used": context[:200] + "..." if len(context) > 200 else context}
