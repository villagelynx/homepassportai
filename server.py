#!/usr/bin/env python3
"""Static files + POST /api/analyze (OpenAI or Claude vision) for HomePassportAI."""

from __future__ import annotations

import json
import mimetypes
import os
import sys
from datetime import datetime, timedelta, timezone
from http.server import BaseHTTPRequestHandler, ThreadingHTTPServer
from pathlib import Path
from typing import Any
from urllib.parse import urlparse
from urllib.error import HTTPError
from urllib.request import Request, urlopen

ROOT = Path(__file__).resolve().parent

MIME_TYPES = {
    ".html": "text/html; charset=utf-8",
    ".js": "application/javascript; charset=utf-8",
    ".css": "text/css; charset=utf-8",
    ".json": "application/json; charset=utf-8",
    ".webmanifest": "application/manifest+json; charset=utf-8",
    ".png": "image/png",
    ".jpg": "image/jpeg",
    ".svg": "image/svg+xml",
}

ANALYZE_PROMPT = """You analyze photos for a home inventory app (appliances, furniture, electronics, artwork, etc.).

Image 1: the whole item.
Image 2: close-up of the manufacturer label / rating plate (or signature detail).

Return JSON only with these keys:
- appliance_type: short type (e.g. Dishwasher, Painting, Sofa, TV)
- brand: manufacturer brand, or artist name for artwork, or empty string
- model_number: model number from the label, or title/medium for artwork, or empty string
- serial_number: serial from the label, or inscription text for artwork, or empty string
- confidence: "high", "medium", or "low"
- nickname: short friendly label combining brand/artist + type
- color_description: visible colors, finish, or material or empty string
- dimensions_description: approximate size only if reasonably inferable else empty string
- estimated_current_value: estimated current replacement value in USD with $ based on type, brand, model, age, and condition. Empty if unable to estimate confidently.
- suggested_retail_price: original MSRP or typical new retail in USD with $ when reasonably known. Empty if unknown.
- signature_regions: for paintings/artwork with visible signatures near corners only. Up to 2 boxes as percent 0-100: [{"corner":"top_left"|"top_right"|"bottom_left"|"bottom_right","x_percent","y_percent","width_percent","height_percent"}]. Empty array otherwise.

Value fields are approximate AI estimates for insurance documentation, not professional appraisals. Do not invent prices without reasonable basis.

Read the label image carefully when provided. If unreadable, use empty strings and lower confidence."""

ANALYZE_LABEL_ONLY_PROMPT = """You analyze a close-up photo of a manufacturer label, rating plate, or artwork signature for a home inventory app.

Image 1: close-up label or signature area.

Return JSON only with these keys:
- appliance_type, brand, model_number, serial_number, confidence, nickname (empty string)
- color_description, dimensions_description, estimated_current_value, suggested_retail_price (from label/item if estimable, else empty)

Read carefully. If unreadable, use empty strings and low confidence."""

ANALYZE_APPLIANCE_ONLY_PROMPT = """You analyze a photo for a home inventory app (appliances, furniture, electronics, artwork, etc.).

Image 1: the whole item.

Return JSON only with these keys:
- appliance_type: short type (e.g. Dishwasher, Painting, Sofa, TV)
- brand: manufacturer or artist if visible, else empty string
- model_number: empty unless visible on the item
- serial_number: empty unless visible on the item
- confidence: "high", "medium", or "low"
- nickname: short friendly label
- color_description: visible colors/finish/material or empty string
- dimensions_description: approximate size only if inferable else empty string
- estimated_current_value: estimated current replacement value in USD with $; empty if unknown
- suggested_retail_price: original MSRP or new retail in USD with $; empty if unknown
- signature_regions: for paintings with visible corner signatures — up to 2 percent bounding boxes as above; else []

For artwork put artist in brand, title/medium in model_number, inscription in serial_number when readable."""

ANALYZE_INSURANCE_POLICY_PROMPT = """You analyze a photo of a homeowners or renters insurance policy document, declarations page, or insurance ID card for a home documentation app.

Return JSON only with these keys (use empty string if not visible):
- insurer_name, policy_number, policy_type, named_insureds, property_address
- effective_date, expiration_date, dwelling_coverage, personal_property_coverage
- liability_coverage, deductible, annual_premium, agent_name, agent_phone
- nickname: short friendly label like "State Farm Homeowners 2026"
- confidence: "high", "medium", or "low"

Read carefully. Do not invent values. If not an insurance document, use empty strings and low confidence."""

ANALYZE_PROPERTY_TAX_PROMPT = """You analyze a photo of a property tax bill, tax assessment notice, or county tax statement for a home documentation app.

Return JSON only with these keys (use empty string if not visible):
- taxing_authority, parcel_number, property_address, tax_year, assessed_value
- tax_amount, due_dates, exemptions
- nickname: short friendly label like "King County Property Tax 2026"
- confidence: "high", "medium", or "low"

Read carefully. Do not invent values. If not a property tax document, use empty strings and low confidence."""

ANALYZE_PROPERTY_ASSESSMENT_PROMPT = """You analyze a photo of a property assessment notice, valuation statement, or assessor appraisal for a home documentation app.

Return JSON only with these keys (use empty string if not visible):
- taxing_authority, parcel_number, property_address, tax_year, assessed_value
- tax_amount (land/improvement split if shown), due_dates, exemptions
- nickname: short friendly label like "County Assessment 2026"
- confidence: "high", "medium", or "low"

Read carefully. Do not invent values."""

ANALYZE_PROPERTY_TAX_DEFERMENT_PROMPT = """You analyze a photo of a property tax deferment / deferral approval or notice for a home documentation app.

Return JSON only with these keys (use empty string if not visible):
- taxing_authority, parcel_number, property_address, tax_year, assessed_value
- tax_amount (amount deferred), due_dates, exemptions (program/status)
- nickname: short friendly label like "Senior Tax Deferment 2026"
- confidence: "high", "medium", or "low"

Read carefully. Do not invent values."""

ANALYZE_TAX_UTILITIES_PROMPT = """You analyze a photo of a utility tax statement or utilities bill for a home documentation app.

Return JSON only with these keys (use empty string if not visible):
- taxing_authority, parcel_number (or account #), property_address, tax_year
- assessed_value, tax_amount, due_dates, exemptions
- nickname: short friendly label like "Utilities Bill March 2026"
- confidence: "high", "medium", or "low"

Read carefully. Do not invent values."""

ANALYZE_PROPERTY_MAP_PROMPT = """You analyze a photo of a property parcel map, plat map, or assessor map for a home documentation app.

Return JSON only with these keys (use empty string if not visible):
- taxing_authority (source/county), parcel_number, property_address, tax_year
- assessed_value (map/page reference), tax_amount (lot size if shown), due_dates, exemptions (legal description notes)
- nickname: short friendly label like "Parcel Map Lot 12"
- confidence: "high", "medium", or "low"

Read carefully. Do not invent values."""

ANALYZE_FACEBOOK_MARKETPLACE_PROMPT = """You help a homeowner create a Facebook Marketplace listing to sell a household item they inventoried in a home app.

You receive item details (type, brand, model, color, dimensions, estimated values) and one or more photos: main item photo, optional label/serial close-up, optional purchase receipt.

Write honest, friendly Marketplace copy. Price competitively for a local used sale — typically below estimated replacement value unless the item appears nearly new. Be specific; mention brand and model when known.

Return JSON only with these keys:
- title: short Marketplace title (under 60 characters), specific not generic
- price: suggested listing price for Facebook (e.g. "$120" or "Free") — USD only, no "obo" in this field
- description: 2–4 short paragraphs for the listing description. Include brand, model, condition, color/dimensions if known, local pickup note, and honest wear. Plain text only — no hashtags. Ready to paste into Facebook.
- condition: one of "New", "Used - Like new", "Used - Good", "Used - Fair", "For parts"
- category_hint: best Facebook Marketplace category guess (e.g. "Home & Garden > Appliances")
- photo_recommendations: for each photo type provided, an entry { "photo": "appliance"|"label"|"receipt", "include": true|false, "note": "short reason" }
- selling_tips: array of 1–3 brief seller tips
- confidence: "high", "medium", or "low"

Do not invent model numbers or features not supported by the item data or photos. If a receipt photo is provided, you may note original purchase receipt is available."""

DOCUMENT_MODES = {
    "insurancePolicy",
    "propertyTax",
    "propertyAssessment",
    "propertyTaxDeferment",
    "taxUtilities",
    "propertyMap",
}

ROOM_PROMPT = """You analyze still frames from a ~60 second smartphone video of a home room for an inventory app.

The images are frames sampled across the room scan, in order.

Identify distinct inventory-worthy items you can see — appliances, furniture, electronics, fixtures worth listing (TV, sofa, fridge, washer, microwave, lamp, etc.). Skip walls, floors, ceilings, and tiny clutter.

Return JSON only:
{
  "room_guess": "Kitchen" | "Pantry" | "Dining room" | "Living room" | "Den" | "Office" | "Bedroom 1" | "Bedroom 2" | "Bedroom 3" | "Bedroom 4" | "Bedroom 5" | "Bedroom" | "Bathroom" | "Primary bathroom" | "Half bath" | "Laundry" | "Mudroom" | "Garage" | "Basement" | "Attic" | "Utility" | "Outdoor" | "Other",
  "items": [
    {
      "nickname": "short friendly name",
      "appliance_type": "item type (Refrigerator, TV, Sofa, etc.)",
      "brand": "brand if readable else empty string",
      "model_number": "model if readable else empty string",
      "serial_number": "",
      "confidence": "high" | "medium" | "low",
      "estimated_current_value": "USD with $ if estimable else empty string",
      "suggested_retail_price": "original MSRP or new retail with $ if known else empty string",
      "frame_index": 0
    }
  ]
}

Rules:
- Deduplicate the same physical item across frames.
- frame_index is the 0-based index of the best frame showing that item.
- Prefer 3–20 items; do not invent items you cannot see.
- model_number / serial_number will usually be empty from a room walk-through.
- estimated_current_value and suggested_retail_price: approximate USD values with $ when reasonably inferable; else empty."""


def load_dotenv() -> None:
    path = ROOT / ".env"
    if not path.is_file():
        return
    for line in path.read_text(encoding="utf-8").splitlines():
        line = line.strip()
        if not line or line.startswith("#"):
            continue
        key, _, value = line.partition("=")
        key = key.strip()
        value = value.strip().strip('"').strip("'")
        if key and key not in os.environ:
            os.environ[key] = value


def resolve_port() -> int:
    for arg in sys.argv[1:]:
        if arg == "--no-open":
            continue
        try:
            return int(arg)
        except ValueError:
            continue
    port_env = os.environ.get("PORT")
    if port_env:
        return int(port_env)
    return 8080


def parse_admin_emails(raw: str) -> list[str]:
    return [email.strip().lower() for email in raw.split(",") if email.strip()]


def supabase_request(
    url: str,
    *,
    api_key: str,
    method: str = "GET",
    body: dict[str, Any] | None = None,
    extra_headers: dict[str, str] | None = None,
) -> tuple[int, dict[str, str], bytes]:
    headers = {
        "apikey": api_key,
        "Authorization": f"Bearer {api_key}",
        "Content-Type": "application/json",
    }
    if extra_headers:
        headers.update(extra_headers)
    data = json.dumps(body).encode("utf-8") if body is not None else None
    req = Request(url, data=data, headers=headers, method=method)
    try:
        with urlopen(req, timeout=15) as res:
            return res.status, dict(res.headers.items()), res.read()
    except HTTPError as exc:
        return exc.code, dict(exc.headers.items()), exc.read()


def verify_supabase_user(supabase_url: str, anon_key: str, access_token: str) -> dict[str, Any] | None:
    req = Request(
        f"{supabase_url}/auth/v1/user",
        headers={
            "apikey": anon_key,
            "Authorization": f"Bearer {access_token}",
        },
        method="GET",
    )
    try:
        with urlopen(req, timeout=15) as res:
            return json.loads(res.read().decode("utf-8"))
    except HTTPError:
        return None


def list_supabase_users(supabase_url: str, service_key: str) -> list[dict[str, Any]]:
    users: list[dict[str, Any]] = []
    page = 1
    while True:
        status, _, raw = supabase_request(
            f"{supabase_url}/auth/v1/admin/users?page={page}&per_page=1000",
            api_key=service_key,
        )
        if status != 200:
            raise RuntimeError(f"Failed to list users ({status}): {raw.decode('utf-8', errors='replace')}")
        data = json.loads(raw.decode("utf-8"))
        batch = data.get("users") or []
        users.extend(batch)
        if len(batch) < 1000:
            break
        page += 1
    return users


def fetch_inventory_stats(supabase_url: str, service_key: str) -> dict[str, Any]:
    status, headers, raw = supabase_request(
        f"{supabase_url}/rest/v1/rpc/admin_inventory_stats",
        api_key=service_key,
        method="POST",
        body={},
    )
    if status == 200:
        data = json.loads(raw.decode("utf-8"))
        return {
            "totalItems": int(data.get("total_items") or 0),
            "usersWithInventory": int(data.get("users_with_inventory") or 0),
        }

    status, headers, _ = supabase_request(
        f"{supabase_url}/rest/v1/appliances?select=id",
        api_key=service_key,
        method="HEAD",
        extra_headers={"Prefer": "count=exact"},
    )
    content_range = headers.get("Content-Range") or headers.get("content-range") or ""
    total_items = int(content_range.split("/")[-1]) if "/" in content_range else 0
    return {"totalItems": total_items, "usersWithInventory": None}


def compute_user_stats(users: list[dict[str, Any]]) -> dict[str, Any]:
    now = datetime.now(timezone.utc)
    seven_days_ago = now - timedelta(days=7)
    thirty_days_ago = now - timedelta(days=30)
    signups_last_7 = 0
    signups_last_30 = 0
    by_date: dict[str, int] = {}

    for user in users:
        created_raw = user.get("created_at") or ""
        try:
            created = datetime.fromisoformat(created_raw.replace("Z", "+00:00"))
        except ValueError:
            continue
        if created >= seven_days_ago:
            signups_last_7 += 1
        if created >= thirty_days_ago:
            signups_last_30 += 1
        date_key = created_raw[:10]
        if date_key:
            by_date[date_key] = by_date.get(date_key, 0) + 1

    recent_signups = [
        {"date": date, "count": count}
        for date, count in sorted(by_date.items(), reverse=True)[:14]
    ]

    return {
        "totalUsers": len(users),
        "signupsLast7Days": signups_last_7,
        "signupsLast30Days": signups_last_30,
        "recentSignups": recent_signups,
    }


def build_admin_stats(access_token: str) -> tuple[int, dict[str, Any]]:
    supabase_url = (os.environ.get("SUPABASE_URL") or "").strip()
    anon_key = (os.environ.get("SUPABASE_ANON_KEY") or "").strip()
    service_key = (os.environ.get("SUPABASE_SERVICE_ROLE_KEY") or "").strip()
    admin_emails = parse_admin_emails(os.environ.get("ADMIN_EMAILS") or "")

    if not supabase_url or not anon_key or not service_key:
        return 503, {"error": "Admin stats are not configured on the server."}
    if not admin_emails:
        return 503, {"error": "ADMIN_EMAILS is not configured."}
    if not access_token:
        return 401, {"error": "Sign in required."}

    user = verify_supabase_user(supabase_url, anon_key, access_token)
    email = str((user or {}).get("email") or "").strip().lower()
    if not email:
        return 401, {"error": "Invalid or expired session."}
    if email not in admin_emails:
        return 403, {"error": "Admin access required."}

    users = list_supabase_users(supabase_url, service_key)
    inventory = fetch_inventory_stats(supabase_url, service_key)
    stats = compute_user_stats(users)

    return 200, {
        "ok": True,
        "generatedAt": datetime.now(timezone.utc).isoformat(),
        "adminEmail": email,
        **stats,
        "totalInventoryItems": inventory["totalItems"],
        "usersWithInventory": inventory["usersWithInventory"],
    }


def verify_openai_key(api_key: str) -> dict[str, Any]:
    if not api_key:
        return {"provided": False, "valid": None}
    try:
        req = Request(
            "https://api.openai.com/v1/models",
            headers={"Authorization": f"Bearer {api_key}"},
            method="GET",
        )
        with urlopen(req, timeout=8) as resp:
            valid = 200 <= resp.status < 300
        return {"provided": True, "valid": valid}
    except HTTPError as exc:
        if exc.code == 401:
            return {"provided": True, "valid": False, "error": "Invalid API key"}
        return {"provided": True, "valid": False, "error": f"OpenAI returned HTTP {exc.code}"}
    except Exception:
        return {"provided": True, "valid": False, "error": "Could not reach OpenAI"}


USER_API_KEY_REQUIRED = "AI API key required. Add your own key in Settings."


def resolve_ai_provider(handler: BaseHTTPRequestHandler) -> str:
    raw = (handler.headers.get("X-AI-Provider") or "openai").strip().lower()
    return "anthropic" if raw == "anthropic" else "openai"


def resolve_user_api_key(handler: BaseHTTPRequestHandler) -> tuple[str, str]:
    """Returns (api_key, provider). Never uses a shared developer key from the server env."""
    provider = resolve_ai_provider(handler)
    if provider == "anthropic":
        key = (handler.headers.get("X-Anthropic-Api-Key") or "").strip()
    else:
        key = (handler.headers.get("X-OpenAI-Api-Key") or "").strip()
    return key, provider


def user_api_key_required_message(provider: str) -> str:
    if provider == "anthropic":
        return "Claude API key required. Add your Anthropic key in Settings."
    return "OpenAI API key required. Add your own key in Settings."


def verify_anthropic_key(api_key: str) -> dict[str, Any]:
    if not api_key:
        return {"provided": False, "valid": None}
    try:
        body = json.dumps(
            {
                "model": os.environ.get("ANTHROPIC_VISION_MODEL", "claude-sonnet-4-20250514"),
                "max_tokens": 8,
                "messages": [{"role": "user", "content": "ping"}],
            }
        ).encode("utf-8")
        req = Request(
            "https://api.anthropic.com/v1/messages",
            data=body,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urlopen(req, timeout=8) as resp:
            return {"provided": True, "valid": 200 <= resp.status < 300 or True}
    except HTTPError as exc:
        if exc.code == 400:
            return {"provided": True, "valid": True}
        if exc.code in (401, 403):
            return {"provided": True, "valid": False, "error": "Invalid API key"}
        return {"provided": True, "valid": False, "error": f"Claude returned HTTP {exc.code}"}
    except Exception:
        return {"provided": True, "valid": False, "error": "Could not reach Claude"}


def parse_data_url(data_url: str) -> tuple[str, str]:
    import re

    match = re.match(r"^data:(image/[a-zA-Z0-9.+-]+);base64,(.+)$", data_url or "", re.DOTALL)
    if not match:
        raise RuntimeError("Invalid image data URL")
    return match.group(1), match.group(2)


def openai_content_to_anthropic(content: list[dict[str, Any]]) -> list[dict[str, Any]]:
    out: list[dict[str, Any]] = []
    for block in content:
        if block.get("type") == "text":
            out.append({"type": "text", "text": str(block.get("text") or "")})
        elif block.get("type") == "image_url":
            image = block.get("image_url") or {}
            url = str(image.get("url") or "") if isinstance(image, dict) else ""
            media_type, data = parse_data_url(url)
            out.append(
                {
                    "type": "image",
                    "source": {"type": "base64", "media_type": media_type, "data": data},
                }
            )
    return out


def vision_json_completion(
    provider: str,
    api_key: str,
    content: list[dict[str, Any]],
    *,
    max_tokens: int = 900,
) -> dict[str, Any]:
    if not api_key:
        raise RuntimeError(user_api_key_required_message(provider))

    if provider == "anthropic":
        anth_content = openai_content_to_anthropic(content)
        if anth_content and anth_content[0].get("type") == "text":
            anth_content[0]["text"] = f"{anth_content[0]['text']}\n\nRespond with JSON only. No markdown."
        else:
            anth_content.insert(0, {"type": "text", "text": "Respond with JSON only. No markdown."})
        body = json.dumps(
            {
                "model": os.environ.get("ANTHROPIC_VISION_MODEL", "claude-sonnet-4-20250514"),
                "max_tokens": max_tokens,
                "messages": [{"role": "user", "content": anth_content}],
            }
        ).encode("utf-8")
        req = Request(
            "https://api.anthropic.com/v1/messages",
            data=body,
            headers={
                "x-api-key": api_key,
                "anthropic-version": "2023-06-01",
                "Content-Type": "application/json",
            },
            method="POST",
        )
        with urlopen(req, timeout=90) as resp:
            payload = json.loads(resp.read().decode("utf-8"))
        parts = payload.get("content") or []
        text = "\n".join(str(p.get("text") or "") for p in parts if p.get("type") == "text").strip()
        start = text.find("{")
        end = text.rfind("}")
        if start < 0 or end <= start:
            raise RuntimeError("Claude did not return JSON")
        return json.loads(text[start : end + 1])

    from openai import OpenAI

    client = OpenAI(api_key=api_key)
    model = os.environ.get("OPENAI_VISION_MODEL", "gpt-4o-mini")
    response = client.chat.completions.create(
        model=model,
        messages=[{"role": "user", "content": content}],
        response_format={"type": "json_object"},
        max_tokens=max_tokens,
    )
    raw = response.choices[0].message.content or "{}"
    return json.loads(raw)


def analyze_with_openai(
    api_key: str,
    appliance_data_url: str | None = None,
    label_data_url: str | None = None,
    *,
    label_only: bool = False,
    provider: str = "openai",
) -> dict[str, Any]:
    if not api_key:
        raise RuntimeError(user_api_key_required_message(provider))

    if label_only:
        if not label_data_url:
            raise RuntimeError("labelPhotoDataUrl is required for label-only analysis")
        content: list[dict[str, Any]] = [
            {"type": "text", "text": ANALYZE_LABEL_ONLY_PROMPT},
            {"type": "image_url", "image_url": {"url": label_data_url}},
        ]
    else:
        if not appliance_data_url:
            raise RuntimeError("appliancePhotoDataUrl is required")
        content = [
            {
                "type": "text",
                "text": ANALYZE_PROMPT if label_data_url else ANALYZE_APPLIANCE_ONLY_PROMPT,
            },
            {"type": "image_url", "image_url": {"url": appliance_data_url}},
        ]
        if label_data_url:
            content.append({"type": "image_url", "image_url": {"url": label_data_url}})

    data = vision_json_completion(provider, api_key, content, max_tokens=750)

    signature_regions = data.get("signature_regions") or data.get("signatureRegions") or []

    return {
        "applianceType": str(data.get("appliance_type") or data.get("applianceType") or "").strip(),
        "brand": str(data.get("brand") or "").strip(),
        "modelNumber": str(data.get("model_number") or data.get("modelNumber") or "").strip(),
        "serialNumber": str(data.get("serial_number") or data.get("serialNumber") or "").strip(),
        "confidence": str(data.get("confidence") or "medium").strip().lower(),
        "nickname": str(data.get("nickname") or "").strip(),
        "colorDescription": str(
            data.get("color_description") or data.get("colorDescription") or ""
        ).strip(),
        "dimensionsDescription": str(
            data.get("dimensions_description") or data.get("dimensionsDescription") or ""
        ).strip(),
        "estimatedCurrentValue": str(
            data.get("estimated_current_value") or data.get("estimatedCurrentValue") or ""
        ).strip(),
        "suggestedRetailPrice": str(
            data.get("suggested_retail_price") or data.get("suggestedRetailPrice") or ""
        ).strip(),
        "signatureRegions": signature_regions if isinstance(signature_regions, list) else [],
    }


def map_insurance_policy_response(data: dict[str, Any]) -> dict[str, str]:
    return {
        "insurerName": str(data.get("insurer_name") or data.get("insurerName") or "").strip(),
        "policyNumber": str(data.get("policy_number") or data.get("policyNumber") or "").strip(),
        "policyType": str(data.get("policy_type") or data.get("policyType") or "").strip(),
        "namedInsureds": str(data.get("named_insureds") or data.get("namedInsureds") or "").strip(),
        "propertyAddress": str(data.get("property_address") or data.get("propertyAddress") or "").strip(),
        "effectiveDate": str(data.get("effective_date") or data.get("effectiveDate") or "").strip(),
        "expirationDate": str(data.get("expiration_date") or data.get("expirationDate") or "").strip(),
        "dwellingCoverage": str(
            data.get("dwelling_coverage") or data.get("dwellingCoverage") or ""
        ).strip(),
        "personalPropertyCoverage": str(
            data.get("personal_property_coverage") or data.get("personalPropertyCoverage") or ""
        ).strip(),
        "liabilityCoverage": str(
            data.get("liability_coverage") or data.get("liabilityCoverage") or ""
        ).strip(),
        "deductible": str(data.get("deductible") or "").strip(),
        "annualPremium": str(data.get("annual_premium") or data.get("annualPremium") or "").strip(),
        "agentName": str(data.get("agent_name") or data.get("agentName") or "").strip(),
        "agentPhone": str(data.get("agent_phone") or data.get("agentPhone") or "").strip(),
        "nickname": str(data.get("nickname") or "").strip(),
        "confidence": str(data.get("confidence") or "medium").strip().lower(),
    }


def map_property_tax_response(data: dict[str, Any]) -> dict[str, str]:
    return {
        "taxingAuthority": str(data.get("taxing_authority") or data.get("taxingAuthority") or "").strip(),
        "parcelNumber": str(data.get("parcel_number") or data.get("parcelNumber") or "").strip(),
        "propertyAddress": str(data.get("property_address") or data.get("propertyAddress") or "").strip(),
        "taxYear": str(data.get("tax_year") or data.get("taxYear") or "").strip(),
        "assessedValue": str(data.get("assessed_value") or data.get("assessedValue") or "").strip(),
        "taxAmount": str(data.get("tax_amount") or data.get("taxAmount") or "").strip(),
        "dueDates": str(data.get("due_dates") or data.get("dueDates") or "").strip(),
        "exemptions": str(data.get("exemptions") or "").strip(),
        "nickname": str(data.get("nickname") or "").strip(),
        "confidence": str(data.get("confidence") or "medium").strip().lower(),
    }


def map_facebook_marketplace_response(data: dict[str, Any]) -> dict[str, Any]:
    recs_raw = data.get("photo_recommendations") or data.get("photoRecommendations")
    recs: list[dict[str, Any]] = []
    if isinstance(recs_raw, list):
        for entry in recs_raw:
            if not isinstance(entry, dict):
                continue
            photo = str(entry.get("photo") or "").strip().lower()
            if photo not in ("appliance", "label", "receipt"):
                continue
            recs.append(
                {
                    "photo": photo,
                    "include": bool(entry.get("include")),
                    "note": str(entry.get("note") or "").strip(),
                }
            )

    tips_raw = data.get("selling_tips") or data.get("sellingTips")
    tips: list[str] = []
    if isinstance(tips_raw, list):
        tips = [str(t or "").strip() for t in tips_raw if str(t or "").strip()]

    return {
        "title": str(data.get("title") or "").strip(),
        "price": str(data.get("price") or "").strip(),
        "description": str(data.get("description") or "").strip(),
        "condition": str(data.get("condition") or "").strip(),
        "categoryHint": str(data.get("category_hint") or data.get("categoryHint") or "").strip(),
        "photoRecommendations": recs,
        "sellingTips": tips,
        "confidence": str(data.get("confidence") or "medium").strip().lower(),
    }


def document_prompt_for_mode(mode: str) -> str:
    if mode == "insurancePolicy":
        return ANALYZE_INSURANCE_POLICY_PROMPT
    if mode == "propertyAssessment":
        return ANALYZE_PROPERTY_ASSESSMENT_PROMPT
    if mode == "propertyTaxDeferment":
        return ANALYZE_PROPERTY_TAX_DEFERMENT_PROMPT
    if mode == "taxUtilities":
        return ANALYZE_TAX_UTILITIES_PROMPT
    if mode == "propertyMap":
        return ANALYZE_PROPERTY_MAP_PROMPT
    return ANALYZE_PROPERTY_TAX_PROMPT


def analyze_document_with_openai(
    api_key: str, mode: str, document_data_url: str, *, provider: str = "openai"
) -> dict[str, str]:
    if not api_key:
        raise RuntimeError(user_api_key_required_message(provider))
    if mode not in DOCUMENT_MODES:
        raise RuntimeError(f"Unsupported document mode: {mode}")

    prompt = document_prompt_for_mode(mode)
    content: list[dict[str, Any]] = [
        {"type": "text", "text": prompt},
        {"type": "image_url", "image_url": {"url": document_data_url}},
    ]
    data = vision_json_completion(provider, api_key, content, max_tokens=900)
    if mode == "insurancePolicy":
        return map_insurance_policy_response(data)
    return map_property_tax_response(data)


def analyze_marketplace_with_openai(
    api_key: str,
    item: dict[str, Any],
    appliance_data_url: str | None = None,
    label_data_url: str | None = None,
    receipt_data_url: str | None = None,
    *,
    provider: str = "openai",
) -> dict[str, Any]:
    if not api_key:
        raise RuntimeError(user_api_key_required_message(provider))
    if not appliance_data_url and not label_data_url and not receipt_data_url:
        raise RuntimeError("At least one item photo is required.")

    item_summary = f"Item details:\n{json.dumps(item, indent=2)}"
    content: list[dict[str, Any]] = [
        {"type": "text", "text": f"{ANALYZE_FACEBOOK_MARKETPLACE_PROMPT}\n\n{item_summary}"},
    ]
    if appliance_data_url:
        content.append({"type": "text", "text": "Photo: main item (appliance)"})
        content.append({"type": "image_url", "image_url": {"url": appliance_data_url}})
    if label_data_url:
        content.append({"type": "text", "text": "Photo: label / serial close-up"})
        content.append({"type": "image_url", "image_url": {"url": label_data_url}})
    if receipt_data_url:
        content.append({"type": "text", "text": "Photo: purchase receipt"})
        content.append({"type": "image_url", "image_url": {"url": receipt_data_url}})

    data = vision_json_completion(provider, api_key, content, max_tokens=1100)
    return map_facebook_marketplace_response(data)


def analyze_room_with_openai(
    api_key: str, frames: list[str], *, provider: str = "openai"
) -> dict[str, Any]:
    if not api_key:
        raise RuntimeError(user_api_key_required_message(provider))

    prompt = ROOM_PROMPT + f"\n\nThere are {len(frames)} frames (indices 0–{len(frames) - 1})."
    content: list[dict[str, Any]] = [{"type": "text", "text": prompt}]
    for url in frames:
        content.append({"type": "image_url", "image_url": {"url": url, "detail": "low"}})

    data = vision_json_completion(provider, api_key, content, max_tokens=2000)
    items_raw = data.get("items") if isinstance(data.get("items"), list) else []
    items: list[dict[str, Any]] = []
    for i, item in enumerate(items_raw[:30]):
        if not isinstance(item, dict):
            continue
        try:
            frame_index = int(item.get("frame_index", item.get("frameIndex", 0)))
        except (TypeError, ValueError):
            frame_index = min(i, len(frames) - 1)
        frame_index = max(0, min(len(frames) - 1, frame_index))
        appliance_type = str(item.get("appliance_type") or item.get("applianceType") or item.get("type") or "").strip()
        brand = str(item.get("brand") or "").strip()
        nickname = (
            str(item.get("nickname") or "").strip()
            or " ".join(p for p in (brand, appliance_type) if p).strip()
            or f"Item {i + 1}"
        )
        items.append(
            {
                "nickname": nickname,
                "applianceType": appliance_type or "Item",
                "brand": brand,
                "modelNumber": str(item.get("model_number") or item.get("modelNumber") or "").strip(),
                "serialNumber": str(item.get("serial_number") or item.get("serialNumber") or "").strip(),
                "estimatedCurrentValue": str(
                    item.get("estimated_current_value") or item.get("estimatedCurrentValue") or ""
                ).strip(),
                "suggestedRetailPrice": str(
                    item.get("suggested_retail_price") or item.get("suggestedRetailPrice") or ""
                ).strip(),
                "confidence": str(item.get("confidence") or "medium").strip().lower(),
                "frameIndex": frame_index,
            }
        )

    return {
        "roomGuess": str(data.get("room_guess") or data.get("roomGuess") or "Other").strip() or "Other",
        "items": items,
        "demoMode": False,
    }


def demo_room_items(frame_count: int) -> list[dict[str, Any]]:
    mid = min(1, max(0, frame_count - 1))
    last = max(0, frame_count - 1)
    return [
        {
            "nickname": "Living room TV",
            "applianceType": "Television",
            "brand": "",
            "modelNumber": "",
            "serialNumber": "",
            "confidence": "low",
            "frameIndex": 0,
        },
        {
            "nickname": "Sofa",
            "applianceType": "Sofa",
            "brand": "",
            "modelNumber": "",
            "serialNumber": "",
            "confidence": "low",
            "frameIndex": mid,
        },
        {
            "nickname": "Lamp",
            "applianceType": "Lamp",
            "brand": "",
            "modelNumber": "",
            "serialNumber": "",
            "confidence": "low",
            "frameIndex": last,
        },
    ]


class Handler(BaseHTTPRequestHandler):
    def log_message(self, fmt: str, *args: Any) -> None:
        sys.stderr.write("%s - %s\n" % (self.address_string(), fmt % args))

    def _safe_file(self, rel: str) -> Path | None:
        rel = rel.replace("\\", "/").lstrip("/")
        if not rel or ".." in rel.split("/"):
            return None
        target = (ROOT / rel).resolve()
        root = ROOT.resolve()
        if target != root and not str(target).startswith(f"{root}{os.sep}"):
            return None
        return target if target.is_file() else None

    def _send_file(self, rel: str) -> None:
        target = self._safe_file(rel)
        if not target:
            self.send_error(404)
            return
        ext = target.suffix.lower()
        ctype = MIME_TYPES.get(ext) or mimetypes.guess_type(str(target))[0] or "application/octet-stream"
        data = target.read_bytes()
        self.send_response(200)
        self.send_header("Content-Type", ctype)
        self.send_header("Content-Length", str(len(data)))
        if ext in (".html", ".js", ".css", ".webmanifest"):
            self.send_header("Cache-Control", "no-store, must-revalidate")
        self.end_headers()
        self.wfile.write(data)

    def end_headers(self) -> None:
        self.send_header("Access-Control-Allow-Origin", "*")
        self.send_header("Access-Control-Allow-Methods", "GET, POST, OPTIONS")
        self.send_header(
            "Access-Control-Allow-Headers",
            "Content-Type, X-OpenAI-Api-Key, X-Anthropic-Api-Key, X-AI-Provider, Authorization",
        )
        self.send_header("X-HomePassportAI", "1")
        super().end_headers()

    def do_OPTIONS(self) -> None:
        self.send_response(204)
        self.end_headers()

    def do_GET(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/health":
            provider = resolve_ai_provider(self)
            api_key, _ = resolve_user_api_key(self)
            key_status = (
                verify_anthropic_key(api_key)
                if provider == "anthropic"
                else verify_openai_key(api_key)
            )
            self._json(
                200,
                {
                    "ok": True,
                    "requiresUserKey": True,
                    "provider": provider,
                    "userKey": key_status,
                    "userKeySupported": True,
                    "analyzePath": "/api/analyze",
                    "analyzeRoomPath": "/api/analyze-room",
                    "root": str(ROOT),
                    "port": resolve_port(),
                },
            )
            return
        if path == "/api/admin/stats":
            auth_header = self.headers.get("Authorization") or ""
            access_token = auth_header[7:].strip() if auth_header.startswith("Bearer ") else ""
            try:
                code, payload = build_admin_stats(access_token)
                self._json(code, payload)
            except Exception as exc:
                print(f"Admin stats error: {exc}", file=sys.stderr)
                self._json(500, {"error": str(exc)})
            return
        if path in ("", "/"):
            self._send_file("index.html")
            return
        if path == "/index.html":
            self._send_file("index.html")
            return
        if path.startswith("/home-passport"):
            self.send_response(301)
            self.send_header("Location", "/")
            self.end_headers()
            return
        rel = path.lstrip("/")
        if self._safe_file(rel):
            self._send_file(rel)
            return
        self.send_error(404)

    def do_POST(self) -> None:
        path = urlparse(self.path).path
        if path == "/api/analyze-room":
            self._handle_analyze_room()
            return
        if path != "/api/analyze":
            self.send_error(404)
            return

        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 25_000_000:
            self._json(400, {"error": "Invalid request size"})
            return

        try:
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._json(400, {"error": "Invalid JSON"})
            return

        appliance = body.get("appliancePhotoDataUrl") or body.get("appliance_photo")
        label = body.get("labelPhotoDataUrl") or body.get("label_photo")
        receipt = body.get("receiptPhotoDataUrl") or body.get("receipt_photo")
        document = body.get("documentPhotoDataUrl") or body.get("document_photo")
        mode = str(body.get("mode") or "").strip()
        label_only = mode == "labelOnly"

        if mode == "facebookMarketplace":
            if not appliance and not label and not receipt:
                self._json(400, {"error": "At least one item photo is required"})
                return

            api_key, provider = resolve_user_api_key(self)
            if not api_key:
                self._json(401, {"error": user_api_key_required_message(provider)})
                return

            item = body.get("item") if isinstance(body.get("item"), dict) else {}
            try:
                result = analyze_marketplace_with_openai(
                    api_key,
                    item,
                    str(appliance) if appliance else None,
                    str(label) if label else None,
                    str(receipt) if receipt else None,
                    provider=provider,
                )
                self._json(200, result)
            except Exception as exc:
                print(f"Analyze marketplace error: {exc}", file=sys.stderr)
                self._json(500, {"error": str(exc)})
            return

        if mode in DOCUMENT_MODES:
            if not document:
                self._json(400, {"error": "documentPhotoDataUrl is required"})
                return

            api_key, provider = resolve_user_api_key(self)
            if not api_key:
                self._json(401, {"error": user_api_key_required_message(provider)})
                return

            try:
                result = analyze_document_with_openai(
                    api_key, mode, str(document), provider=provider
                )
                self._json(200, result)
            except Exception as exc:
                print(f"Analyze document error: {exc}", file=sys.stderr)
                self._json(500, {"error": str(exc)})
            return

        if label_only:
            if not label:
                self._json(400, {"error": "labelPhotoDataUrl is required for label-only analysis"})
                return
        elif not appliance:
            self._json(400, {"error": "appliancePhotoDataUrl is required"})
            return

        api_key, provider = resolve_user_api_key(self)
        if not api_key:
            self._json(401, {"error": user_api_key_required_message(provider)})
            return

        try:
            if label_only:
                result = analyze_with_openai(
                    api_key,
                    label_data_url=str(label),
                    label_only=True,
                    provider=provider,
                )
            else:
                result = analyze_with_openai(
                    api_key,
                    str(appliance),
                    str(label) if label else None,
                    provider=provider,
                )
            self._json(200, result)
        except Exception as exc:
            print(f"Analyze error: {exc}", file=sys.stderr)
            self._json(500, {"error": str(exc)})

    def _handle_analyze_room(self) -> None:
        length = int(self.headers.get("Content-Length") or 0)
        if length <= 0 or length > 25_000_000:
            self._json(400, {"error": "Invalid request size"})
            return

        try:
            body = json.loads(self.rfile.read(length).decode("utf-8"))
        except (json.JSONDecodeError, UnicodeDecodeError):
            self._json(400, {"error": "Invalid JSON"})
            return

        frames_raw = body.get("frames")
        if not isinstance(frames_raw, list):
            self._json(400, {"error": "frames must be an array of data URLs"})
            return
        frames = [str(f) for f in frames_raw if isinstance(f, str) and f]
        if len(frames) < 2:
            self._json(400, {"error": "Send at least 2 video frames to analyze the room"})
            return
        if len(frames) > 10:
            self._json(400, {"error": "Too many frames (max 10)"})
            return

        api_key, provider = resolve_user_api_key(self)
        if not api_key:
            self._json(401, {"error": user_api_key_required_message(provider)})
            return

        try:
            result = analyze_room_with_openai(api_key, frames, provider=provider)
            self._json(200, result)
        except Exception as exc:
            print(f"Analyze room error: {exc}", file=sys.stderr)
            self._json(500, {"error": str(exc)})

    def _json(self, code: int, payload: dict[str, Any]) -> None:
        data = json.dumps(payload).encode("utf-8")
        self.send_response(code)
        self.send_header("Content-Type", "application/json")
        self.send_header("Content-Length", str(len(data)))
        self.end_headers()
        self.wfile.write(data)


def local_ip() -> str:
    import socket

    try:
        with socket.socket(socket.AF_INET, socket.SOCK_DGRAM) as s:
            s.connect(("8.8.8.8", 80))
            return str(s.getsockname()[0])
    except OSError:
        return "YOUR_MAC_IP"


def create_http_server(port: int) -> ThreadingHTTPServer:
    import socket

    class DualStackHTTPServer(ThreadingHTTPServer):
        address_family = socket.AF_INET6

        def server_bind(self) -> None:
            try:
                self.socket.setsockopt(socket.IPPROTO_IPV6, socket.IPV6_V6ONLY, 0)
            except OSError:
                pass
            super().server_bind()

    try:
        return DualStackHTTPServer(("::", port), Handler)
    except OSError:
        return ThreadingHTTPServer(("0.0.0.0", port), Handler)


def main() -> None:
    load_dotenv()
    port = resolve_port()

    if not (ROOT / "index.html").is_file():
        print(f"ERROR: index.html not found in {ROOT}", file=sys.stderr)
        sys.exit(1)

    try:
        server = create_http_server(port)
    except OSError as exc:
        print(f"Could not start on port {port}: {exc}", file=sys.stderr)
        sys.exit(1)

    print(f"Serving from: {ROOT}")
    print(f"HomePassportAI → http://127.0.0.1:{port}  (or http://localhost:{port})")
    print(f"On your phone: http://{local_ip()}:{port}")
    print("AI analysis: BYOK only — OpenAI or Claude key in Settings")
    print("Press Ctrl+C to stop.")

    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\nStopped.")


if __name__ == "__main__":
    main()
