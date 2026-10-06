from pathlib import Path

def extract_text(file_path: str) -> str:
    """
    First tries PDF text extraction with PyMuPDF.
    For images/scanned PDFs, optionally falls back to pytesseract
    if Tesseract is installed on the machine.
    """
    path = Path(file_path)
    suffix = path.suffix.lower()

    if suffix == ".pdf":
        try:
            import fitz
            doc = fitz.open(file_path)
            text = "\n".join(page.get_text() for page in doc).strip()
            if text:
                return text
        except Exception:
            pass

    try:
        from PIL import Image
        import pytesseract

        if suffix == ".pdf":
            import fitz
            doc = fitz.open(file_path)
            pages = []
            for page in doc:
                pix = page.get_pixmap(matrix=fitz.Matrix(2, 2))
                img = Image.frombytes("RGB", [pix.width, pix.height], pix.samples)
                pages.append(pytesseract.image_to_string(img))
            return "\n".join(pages).strip()

        image = Image.open(file_path)
        return pytesseract.image_to_string(image).strip()
    except Exception as exc:
        return f"[OCR unavailable: {exc}]"
