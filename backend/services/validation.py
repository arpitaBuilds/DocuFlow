REVIEW_THRESHOLD = 0.85

def validate_fields(fields: dict) -> tuple[dict, float, bool]:
    confidences = []
    needs_review = False

    for name, item in fields.items():
        confidence = float(item.get("confidence", 0.0) or 0.0)
        confidences.append(confidence)
        if confidence < REVIEW_THRESHOLD:
            needs_review = True

    overall = sum(confidences) / len(confidences) if confidences else 0.0
    return fields, overall, needs_review
