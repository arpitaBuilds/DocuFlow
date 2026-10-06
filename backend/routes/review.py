from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session

from database import get_db
from models import Document, ExtractedField
from schemas import ReviewRequest

router = APIRouter(prefix="/api/review", tags=["review"])

@router.get("")
def review_queue(db: Session = Depends(get_db)):
    rows = (
        db.query(ExtractedField, Document)
        .join(Document, ExtractedField.document_id == Document.id)
        .filter(ExtractedField.confidence < 0.85)
        .order_by(ExtractedField.confidence.asc())
        .all()
    )

    return [
        {
            "document_id": doc.id,
            "filename": doc.filename,
            "field_id": field.id,
            "field_name": field.field_name,
            "field_value": field.field_value,
            "confidence": field.confidence,
            "review_reason": field.review_reason
        }
        for field, doc in rows
    ]

@router.put("/{document_id}")
def review_document(
    document_id: int,
    payload: ReviewRequest,
    db: Session = Depends(get_db)
):
    doc = db.query(Document).filter(Document.id == document_id).first()
    field = db.query(ExtractedField).filter(
        ExtractedField.id == payload.field_id,
        ExtractedField.document_id == document_id
    ).first()

    if not doc or not field:
        raise HTTPException(404, "Document or field not found")

    field.field_value = payload.new_value
    field.is_verified = payload.verified
    field.confidence = 1.0 if payload.verified else field.confidence
    field.review_reason = None if payload.verified else "Rejected during review"

    remaining = db.query(ExtractedField).filter(
        ExtractedField.document_id == document_id,
        ExtractedField.is_verified == False
    ).count()

    doc.status = "completed" if remaining == 0 else "needs_review"

    db.commit()

    return {
        "message": "Field reviewed successfully",
        "document_id": document_id,
        "status": doc.status
    }
