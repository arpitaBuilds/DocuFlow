# Run DocuFlow AI

## 1. Start PostgreSQL
From the project root:
    docker compose up -d

## 2. Create backend environment
    cd backend
    python -m venv .venv
    .venv\Scripts\activate
    pip install -r requirements.txt

## 3. Configure environment
Copy `.env.example` to `.env` in the project root and set GROQ_API_KEY if you want LLM extraction.
The app also works with deterministic fallback extraction when the key is empty.

## 4. Start API
From `backend`:
    uvicorn main:app --reload

Open:
    http://127.0.0.1:8000/docs

## 5. Frontend
Open `frontend/index.html` in the browser.
For the upload page, make sure the generated page includes:
    <script src="../js/api.js"></script>
    <script src="../js/upload-handler.js"></script>

## 6. Test
GET  /api/health
POST /api/documents/upload
GET  /api/documents
GET  /api/review
PUT  /api/review/{document_id}
GET  /api/export/json
GET  /api/export/csv
GET  /api/dashboard/stats
