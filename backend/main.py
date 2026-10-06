from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import text

from fastapi.staticfiles import StaticFiles
from pathlib import Path

from database import Base, engine
import models  # noqa: F401

from routes.documents import router as documents_router
from routes.review import router as review_router
from routes.export import router as export_router

Base.metadata.create_all(bind=engine)

UPLOAD_DIR = Path("uploads")
UPLOAD_DIR.mkdir(exist_ok=True)

app = FastAPI(
    title="DocuFlow AI",
    version="1.0.0",
    description="AI document processing and human-review API"
)

app.mount("/uploads", StaticFiles(directory="uploads"), name="uploads")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(documents_router)
app.include_router(review_router)
app.include_router(export_router)

@app.get("/")
def root():
    return {
        "message": "DocuFlow AI Backend API is running successfully!",
        "docs_url": "/docs",
        "frontend_url": "http://127.0.0.1:3000"
    }

@app.get("/api/health")
def health():
    return {"status": "ok", "service": "DocuFlow AI"}

@app.get("/api/dashboard/stats")
def dashboard_stats():
    from database import SessionLocal
    from models import Document, ExtractedField

    db = SessionLocal()
    try:
        total = db.query(Document).count()
        processing = db.query(Document).filter(Document.status == "processing").count()
        review = db.query(Document).filter(Document.status == "needs_review").count()
        completed = db.query(Document).filter(Document.status == "completed").count()
        failed = db.query(Document).filter(Document.status == "failed").count()

        return {
            "total_documents": total,
            "processing": processing,
            "needs_review": review,
            "completed": completed,
            "failed": failed
        }
    finally:
        db.close()
