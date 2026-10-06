import hashlib
from datetime import datetime
from pathlib import Path
from fastapi import APIRouter, Depends, File, HTTPException, UploadFile
from sqlalchemy.orm import Session

from database import get_db
from models import Document, ExtractedField, ProcessingJob
from schemas import DocumentResponse
from services.ocr import extract_text
from services.extraction import extract_fields
from services.validation import validate_fields

router = APIRouter(prefix="/api/documents", tags=["documents"])

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

ALLOWED = {".pdf", ".png", ".jpg", ".jpeg", ".tiff", ".tif"}

@router.post("/upload", response_model=DocumentResponse)
async def upload_document(
    file: UploadFile = File(...),
    db: Session = Depends(get_db)
):
    suffix = Path(file.filename or "").suffix.lower()

    if suffix not in ALLOWED:
        raise HTTPException(400, "Only PDF/JPG/JPEG/PNG/TIFF files are supported.")

    data = await file.read()
    file_hash = hashlib.sha256(data).hexdigest()

    existing = db.query(Document).filter(Document.file_hash == file_hash).first()
    if existing:
        setattr(existing, "is_duplicate", True)
        return existing

    safe_name = f"{file_hash}{suffix}"
    path = UPLOAD_DIR / safe_name
    path.write_bytes(data)

    doc = Document(
        filename=file.filename,
        file_path=str(path),
        document_type="unknown",
        status="processing",
        file_hash=file_hash
    )
    db.add(doc)
    db.commit()
    db.refresh(doc)

    job = ProcessingJob(
        document_id=doc.id,
        status="processing",
        attempts=1,
        started_at=datetime.utcnow()
    )
    db.add(job)
    db.commit()

    try:
        text = extract_text(str(path))
        extracted = extract_fields(text)

        fields = extracted.get("fields", extracted)
        fields, overall, needs_review = validate_fields(fields)

        doc.document_type = extracted.get("document_type", "invoice")
        doc.overall_confidence = overall
        doc.status = "needs_review" if needs_review else "completed"
        doc.processed_at = datetime.utcnow()

        for name, item in fields.items():
            value = item.get("value")
            confidence = float(item.get("confidence", 0.0) or 0.0)

            db.add(
                ExtractedField(
                    document_id=doc.id,
                    field_name=name,
                    field_value=None if value is None else str(value),
                    confidence=confidence,
                    is_verified=confidence >= 0.85,
                    review_reason=(
                        "Confidence below 85%"
                        if confidence < 0.85 else None
                    )
                )
            )

        job.status = "completed"
        job.completed_at = datetime.utcnow()

        db.commit()
        db.refresh(doc)
        return doc

    except Exception as exc:
        doc.status = "failed"
        job.status = "failed"
        job.error_message = str(exc)
        job.completed_at = datetime.utcnow()
        db.commit()
        raise HTTPException(500, f"Processing failed: {exc}")

@router.get("", response_model=list[DocumentResponse])
def list_documents(db: Session = Depends(get_db)):
    return db.query(Document).order_by(Document.created_at.desc()).all()

@router.get("/{document_id}", response_model=DocumentResponse)
def get_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")
    return doc

@router.post("/{document_id}/retry", response_model=DocumentResponse)
def retry_document(document_id: int, db: Session = Depends(get_db)):
    doc = db.query(Document).filter(Document.id == document_id).first()
    if not doc:
        raise HTTPException(404, "Document not found")

    text = extract_text(doc.file_path)
    extracted = extract_fields(text)
    fields, overall, needs_review = validate_fields(extracted.get("fields", extracted))

    doc.status = "needs_review" if needs_review else "completed"
    doc.overall_confidence = overall
    doc.processed_at = datetime.utcnow()

    db.query(ExtractedField).filter(
        ExtractedField.document_id == doc.id
    ).delete()

    for name, item in fields.items():
        confidence = float(item.get("confidence", 0.0) or 0.0)
        db.add(
            ExtractedField(
                document_id=doc.id,
                field_name=name,
                field_value=None if item.get("value") is None else str(item["value"]),
                confidence=confidence,
                is_verified=confidence >= 0.85,
                review_reason="Confidence below 85%" if confidence < 0.85 else None
            )
        )

    db.commit()
    db.refresh(doc)
    return doc
