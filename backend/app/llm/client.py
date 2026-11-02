# =============================================================================
# Veyronica — LLM Client (Gemini & Grok Only)
# Primary: Google Gemini (Gemini 3.8 Flash, 3.6 Flash, 3.5 Flash-Lite, Gemma 4)
# Fallback: xAI Grok (grok-2-latest, grok-beta)
# Plan C Safety Net: Deterministic Template Fallback (Zero Downtime)
# =============================================================================
from __future__ import annotations

import asyncio
import logging
from typing import Any

from app.config import get_settings

logger = logging.getLogger("veyronica.llm")


class LLMClient:
    """
    LLM Client strictly configured for Google Gemini and xAI Grok.
    Supported Gemini models:
      - gemini-3.8-flash (Gemini 3.8 Flash)
      - gemini-3.6-flash (Gemini 3.6 Flash)
      - gemini-3.5-flash-lite (Gemini 3.5 Flash-Lite)
      - gemma-4 (Gemma 4)
    Supported Grok models:
      - grok-2-latest / grok-beta via xAI API
    """

    def __init__(self):
        self.settings = get_settings()

    async def generate_rationale(
        self,
        store_id: str,
        lines: list[dict[str, Any]],
        target_cover_days: int = 14,
    ) -> tuple[str, str]:
        """
        Generate rationale explaining the replenishment order.
        Returns: (rationale_text, source: 'ai_generated' | 'template')
        """
        gemini_key = self.settings.gemini_api_key or self.settings.llm_api_key
        grok_key = self.settings.grok_api_key or self.settings.llm_fallback_api_key

        # 1. Primary: Google Gemini
        if gemini_key:
            try:
                text = await self._call_gemini_for_rationale(
                    store_id=store_id,
                    lines=lines,
                    target_cover_days=target_cover_days,
                    api_key=gemini_key,
                )
                if text and len(text.strip()) > 10:
                    return text.strip(), "ai_generated"
            except Exception as e:
                logger.warning("Gemini rationale generation failed: %s", e)

        # 2. Fallback: xAI Grok
        if grok_key:
            try:
                text = await self._call_grok_for_rationale(
                    store_id=store_id,
                    lines=lines,
                    target_cover_days=target_cover_days,
                    api_key=grok_key,
                )
                if text and len(text.strip()) > 10:
                    return text.strip(), "ai_generated"
            except Exception as e:
                logger.warning("Grok fallback rationale generation failed: %s", e)

        # 3. Plan C: Deterministic Template Safety Net
        return self._template_rationale(store_id, lines, target_cover_days), "template"

    async def generate_supplier_email(
        self,
        supplier_name: str,
        store_id: str,
        lines: list[dict[str, Any]],
        total_value: float,
    ) -> tuple[str, str]:
        """
        Generate supplier notification email body.
        Returns: (email_body, source: 'ai_generated' | 'template')
        """
        gemini_key = self.settings.gemini_api_key or self.settings.llm_api_key
        grok_key = self.settings.grok_api_key or self.settings.llm_fallback_api_key

        # 1. Primary: Google Gemini
        if gemini_key:
            try:
                text = await self._call_gemini_for_email(
                    supplier_name=supplier_name,
                    store_id=store_id,
                    lines=lines,
                    total_value=total_value,
                    api_key=gemini_key,
                )
                if text and len(text.strip()) > 10:
                    return text.strip(), "ai_generated"
            except Exception as e:
                logger.warning("Gemini email generation failed: %s", e)

        # 2. Fallback: xAI Grok
        if grok_key:
            try:
                text = await self._call_grok_for_email(
                    supplier_name=supplier_name,
                    store_id=store_id,
                    lines=lines,
                    total_value=total_value,
                    api_key=grok_key,
                )
                if text and len(text.strip()) > 10:
                    return text.strip(), "ai_generated"
            except Exception as e:
                logger.warning("Grok fallback email generation failed: %s", e)

        # 3. Plan C: Deterministic Template Safety Net
        return self._template_email(supplier_name, store_id, lines, total_value), "template"

    def _resolve_gemini_model(self) -> str:
        """Resolve to valid Gemini model name."""
        m = (self.settings.gemini_model or self.settings.llm_model).lower()
        if "3.8" in m:
            return "gemini-3.8-flash"
        if "3.6" in m:
            return "gemini-3.6-flash"
        if "3.5" in m or "lite" in m:
            return "gemini-3.5-flash-lite"
        if "gemma" in m or "4" in m:
            return "gemma-4"
        return "gemini-3.8-flash"

    async def _call_gemini_for_rationale(
        self,
        store_id: str,
        lines: list[dict[str, Any]],
        target_cover_days: int,
        api_key: str,
    ) -> str:
        """Execute rationale generation using Google Gemini API."""
        prompt = (
            f"You are the replenishment explanation agent for V-Mart retail store {store_id}. "
            f"Explain clearly and concisely (2-3 sentences) why reordering {len(lines)} line(s) to restore "
            f"{target_cover_days} days of cover is required. Key line: {lines[0]}."
        )
        model_name = self._resolve_gemini_model()

        def _sync_call():
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            return response.text or ""

        return await asyncio.to_thread(_sync_call)

    async def _call_gemini_for_email(
        self,
        supplier_name: str,
        store_id: str,
        lines: list[dict[str, Any]],
        total_value: float,
        api_key: str,
    ) -> str:
        """Execute supplier email drafting using Google Gemini API."""
        prompt = (
            f"Draft a formal purchase order notification email to {supplier_name} for V-Mart store {store_id}. "
            f"Total order value: ₹{total_value:,.2f}. Items: {lines}."
        )
        model_name = self._resolve_gemini_model()

        def _sync_call():
            import google.generativeai as genai
            genai.configure(api_key=api_key)
            model = genai.GenerativeModel(model_name)
            response = model.generate_content(prompt)
            return response.text or ""

        return await asyncio.to_thread(_sync_call)

    async def _call_grok_for_rationale(
        self,
        store_id: str,
        lines: list[dict[str, Any]],
        target_cover_days: int,
        api_key: str,
    ) -> str:
        """Execute rationale generation using xAI Grok API."""
        from openai import AsyncOpenAI

        prompt = (
            f"You are the replenishment explanation agent for V-Mart retail store {store_id}. "
            f"Explain clearly and concisely (2-3 sentences) why reordering {len(lines)} line(s) to restore "
            f"{target_cover_days} days of cover is required. Key line: {lines[0]}."
        )
        client = AsyncOpenAI(
            api_key=api_key,
            base_url=self.settings.grok_base_url,
        )
        resp = await client.chat.completions.create(
            model=self.settings.grok_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=200,
            timeout=self.settings.llm_timeout_seconds,
        )
        return resp.choices[0].message.content or ""

    async def _call_grok_for_email(
        self,
        supplier_name: str,
        store_id: str,
        lines: list[dict[str, Any]],
        total_value: float,
        api_key: str,
    ) -> str:
        """Execute supplier email drafting using xAI Grok API."""
        from openai import AsyncOpenAI

        prompt = (
            f"Draft a formal purchase order notification email to {supplier_name} for V-Mart store {store_id}. "
            f"Total order value: ₹{total_value:,.2f}. Items: {lines}."
        )
        client = AsyncOpenAI(
            api_key=api_key,
            base_url=self.settings.grok_base_url,
        )
        resp = await client.chat.completions.create(
            model=self.settings.grok_model,
            messages=[{"role": "user", "content": prompt}],
            max_tokens=300,
            timeout=self.settings.llm_timeout_seconds,
        )
        return resp.choices[0].message.content or ""

    def _template_rationale(
        self,
        store_id: str,
        lines: list[dict[str, Any]],
        target_cover_days: int,
    ) -> str:
        """Deterministic rationale matching hero format."""
        if not lines:
            return f"Replenishment order for store {store_id}."

        first = lines[0]
        sku = first.get("sku", "SKU")
        sku_name = first.get("sku_name", "items")
        cover = first.get("days_of_cover", 4.0)
        velocity = first.get("sales_velocity_7d", 0.0)
        qty = first.get("qty", 0)

        rationale = (
            f"Store {store_id} has {cover:.1f} days of cover for {sku} ({sku_name}) "
            f"at a 7-day sales velocity of {velocity:.1f} units/day. Reordering {qty} units "
            f"restores {target_cover_days}-day cover."
        )

        if len(lines) > 1:
            other_count = len(lines) - 1
            other_skus = ", ".join(l.get("sku", "") for l in lines[1:])
            rationale += f" Additionally replenishes {other_count} related line(s) ({other_skus}) to prevent localized stockout."

        return rationale

    def _template_email(
        self,
        supplier_name: str,
        store_id: str,
        lines: list[dict[str, Any]],
        total_value: float,
    ) -> str:
        """Deterministic supplier email body."""
        line_items_summary = "\n".join(
            f"  - {l.get('sku')} ({l.get('sku_name')}): {l.get('qty')} units @ ₹{float(l.get('unit_cost', 0)):,.2f}"
            for l in lines
        )
        total_qty = sum(int(l.get("qty", 0)) for l in lines)

        return (
            f"Dear {supplier_name} Team,\n\n"
            f"Please accept this purchase order for V-Mart Store {store_id}.\n\n"
            f"Order Summary:\n"
            f"- Total Quantity: {total_qty} units across {len(lines)} line(s)\n"
            f"- Total Value: ₹{total_value:,.2f}\n\n"
            f"Line Items:\n{line_items_summary}\n\n"
            f"Please confirm receipt and acknowledge expected dispatch date as per agreed lead times.\n\n"
            f"Warm regards,\nV-Mart Governed Replenishment Desk (Veyronica)"
        )
