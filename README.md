# DocuFlow AI

Hackathon project scaffold generated from the Stitch HTML provided by the user.

## Current state
- `frontend/index.html` contains the standalone Stitch landing page.
- `frontend/pages/` contains recognized Stitch-generated screens from the multi-screen dump.
- `frontend/dashboard.html` contains the dashboard when detected.
- `stitch_source_*.html.txt` preserves the original generated code.
- Backend folders are scaffolded for the FastAPI + PostgreSQL implementation.

## Next implementation
1. Connect frontend buttons/forms to FastAPI.
2. Add document upload endpoint.
3. Store documents and extracted fields in PostgreSQL.
4. Add OCR + AI extraction.
5. Add confidence threshold and human review.
6. Add CSV/JSON export.

## Important
The Stitch source uses Tailwind CDN and Google Fonts, so the generated UI can be opened directly in a browser for the initial prototype.
