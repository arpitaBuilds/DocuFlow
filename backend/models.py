from datetime import datetime
from sqlalchemy import Column, Integer, String, Float, Boolean, DateTime, ForeignKey, Text
from sqlalchemy.orm import relationship
from database import Base

class Document(Base):
    __tablename__ = "documents"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)
    document_type = Column(String(100), default="unknown")
    status = Column(String(50), default="uploaded")
    overall_confidence = Column(Float, default=0.0)
    file_hash = Column(String(64), unique=True, index=True, nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)

    fields = relationship(
        "ExtractedField",
        back_populates="document",
        cascade="all, delete-orphan"
    )
    jobs = relationship(
        "ProcessingJob",
        back_populates="document",
        cascade="all, delete-orphan"
    )

    @property
    def file_url(self):
        if self.file_path:
            import os
            fname = os.path.basename(self.file_path)
            return f"/uploads/{fname}"
        return None

class ExtractedField(Base):
    __tablename__ = "extracted_fields"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    field_name = Column(String(100), nullable=False)
    field_value = Column(Text, nullable=True)
    confidence = Column(Float, default=0.0)
    is_verified = Column(Boolean, default=False)
    review_reason = Column(Text, nullable=True)

    document = relationship("Document", back_populates="fields")

class ProcessingJob(Base):
    __tablename__ = "processing_jobs"

    id = Column(Integer, primary_key=True, index=True)
    document_id = Column(Integer, ForeignKey("documents.id"), nullable=False)
    status = Column(String(50), default="queued")
    attempts = Column(Integer, default=0)
    error_message = Column(Text, nullable=True)
    started_at = Column(DateTime, nullable=True)
    completed_at = Column(DateTime, nullable=True)

    document = relationship("Document", back_populates="jobs")
