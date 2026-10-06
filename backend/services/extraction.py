import json
import os
import re
from typing import Dict, Any

FIELD_NAMES = [
    "vendor_name",
    "invoice_number",
    "invoice_date",
    "due_date",
    "subtotal",
    "tax",
    "total_amount",
    "currency",
    "po_number"
]

def _heuristic_extract(text: str) -> Dict[str, Any]:
    result = {name: {"value": None, "confidence": 0.0} for name in FIELD_NAMES}

    patterns = {
        "invoice_number": r"(?:invoice\s*(?:no|number|#)?|inv[-\s]?)[:#\s-]*([A-Z0-9][A-Z0-9._/-]{2,})",
        "invoice_date": r"(?:invoice\s*date|date)[:\s-]*([A-Za-z]{3,9}\s+\d{1,2},?\s+\d{4}|\d{1,4}[-/]\d{1,2}[-/]\d{1,4})",
        "po_number": r"(?:po\s*(?:no|number|#)?)[:#\s-]*([A-Z0-9._/-]+)",
        "total_amount": r"(?:grand\s*total|total\s*amount|total)[:\s$]*([0-9,]+(?:\.[0-9]{2})?)",
        "tax": r"(?:tax|gst|vat)[:\s$]*([0-9,]+(?:\.[0-9]{2})?)",
        "subtotal": r"(?:subtotal|sub-total)[:\s$]*([0-9,]+(?:\.[0-9]{2})?)",
    }

    for field, pattern in patterns.items():
        match = re.search(pattern, text, flags=re.I)
        if match:
            result[field] = {"value": match.group(1).strip(), "confidence": 0.82}

    vendor = re.search(
        r"(?:vendor|supplier|from)[:\s-]*([A-Za-z][A-Za-z0-9 &.,'-]{2,})",
        text,
        flags=re.I
    )
    if vendor:
        result["vendor_name"] = {
            "value": vendor.group(1).strip().split("\n")[0][:120],
            "confidence": 0.78
        }

    currency = "$" if "$" in text else ("₹" if "₹" in text else ("EUR" if "EUR" in text.upper() else None))
    if currency:
        result["currency"] = {
            "value": "USD" if currency == "$" else ("INR" if currency == "₹" else "EUR"),
            "confidence": 0.95
        }

    return result

def extract_fields(text: str) -> Dict[str, Any]:
    """
    Uses Groq when GROQ_API_KEY is configured.
    Falls back to deterministic regex extraction so the prototype
    still works without an LLM key.
    """
    api_key = os.getenv("GROQ_API_KEY")
    model = os.getenv("GROQ_MODEL", "llama-3.1-8b-instant")

    if not api_key:
        return _heuristic_extract(text)

    try:
        from groq import Groq
        client = Groq(api_key=api_key)

        prompt = f"""
Extract invoice/document fields from the text below.

Return ONLY valid JSON in this exact shape:
{{
  "document_type": "invoice",
  "fields": {{
    "vendor_name": {{"value": null, "confidence": 0}},
    "invoice_number": {{"value": null, "confidence": 0}},
    "invoice_date": {{"value": null, "confidence": 0}},
    "due_date": {{"value": null, "confidence": 0}},
    "subtotal": {{"value": null, "confidence": 0}},
    "tax": {{"value": null, "confidence": 0}},
    "total_amount": {{"value": null, "confidence": 0}},
    "currency": {{"value": null, "confidence": 0}},
    "po_number": {{"value": null, "confidence": 0}}
  }}
}}

Confidence must be between 0 and 1.

DOCUMENT TEXT:
{text[:12000]}
"""

        response = client.chat.completions.create(
            model=model,
            messages=[
                {"role": "system", "content": "You extract structured data and output JSON only."},
                {"role": "user", "content": prompt},
            ],
            temperature=0
        )

        content = response.choices[0].message.content.strip()
        content = re.sub(r"^```json\s*|\s*```$", "", content)
        data = json.loads(content)

        fields = data.get("fields", {})
        for name in FIELD_NAMES:
            fields.setdefault(name, {"value": None, "confidence": 0.0})

        return {
            "document_type": data.get("document_type", "invoice"),
            "fields": fields
        }

    except Exception:
        return {
            "document_type": "invoice",
            "fields": _heuristic_extract(text)
        }
