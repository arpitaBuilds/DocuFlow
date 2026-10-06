import csv
import io
import json
from fastapi import APIRouter, Depends
from fastapi.responses import StreamingResponse, Response
from sqlalchemy.orm import Session

from database import get_db
from models import Document

router = APIRouter(prefix="/api/export", tags=["export"])

def document_rows(db: Session):
    docs = db.query(Document).order_by(Document.created_at.desc()).all()
    rows = []

    for doc in docs:
        row = {
            "id": doc.id,
            "filename": doc.filename,
            "document_type": doc.document_type,
            "status": doc.status,
            "overall_confidence": round(doc.overall_confidence, 4),
        }
        for field in doc.fields:
            row[field.field_name] = field.field_value
        rows.append(row)

    return rows

@router.get("/json")
def export_json(db: Session = Depends(get_db)):
    return Response(
        content=json.dumps(document_rows(db), indent=2),
        media_type="application/json"
    )

@router.get("/csv")
def export_csv(db: Session = Depends(get_db)):
    rows = document_rows(db)

    if not rows:
        return StreamingResponse(
            io.StringIO("id,filename,document_type,status,overall_confidence\n"),
            media_type="text/csv",
            headers={"Content-Disposition": "attachment; filename=docuflow_export.csv"}
        )

    keys = sorted({key for row in rows for key in row.keys()})
    output = io.StringIO()
    writer = csv.DictWriter(output, fieldnames=keys)
    writer.writeheader()
    writer.writerows(rows)
    output.seek(0)

    return StreamingResponse(
        output,
        media_type="text/csv",
        headers={"Content-Disposition": "attachment; filename=docuflow_export.csv"}
    )
