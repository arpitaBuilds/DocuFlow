from datetime import datetime
from typing import Optional, Any
from pydantic import BaseModel

class FieldResponse(BaseModel):
    id: int
    field_name: str
    field_value: Optional[str]
    confidence: float
    is_verified: bool
    review_reason: Optional[str] = None

    class Config:
        from_attributes = True

class DocumentResponse(BaseModel):
    id: int
    filename: str
    file_path: Optional[str] = None
    file_url: Optional[str] = None
    document_type: str
    status: str
    overall_confidence: float
    file_hash: str
    created_at: datetime
    processed_at: Optional[datetime] = None
    is_duplicate: Optional[bool] = False
    fields: list[FieldResponse] = []

    class Config:
        from_attributes = True

class ReviewRequest(BaseModel):
    field_id: int
    new_value: str
    verified: bool = True
