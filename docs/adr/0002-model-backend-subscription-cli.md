# 0002 — Model backend: subscription CLI, สลับได้รายตัว, durable queue, rate-limit = พัก+retry

**Status:** accepted (รับความเสี่ยง ToS / rate-limit ไว้เองโดยรู้ตัว)

## บริบท

ต้องการให้ Agent แต่ละตัวเลือก "สมอง" คนละ provider ได้ (Claude / GPT / Gemini) และต้องการเลี่ยงค่าใช้จ่ายต่อ token โดยใช้ subscription ที่มีอยู่แล้ว

## การตัดสินใจ

- **มี `ModelProvider` interface กลาง 1 ตัว, backend เป็น config รายตัว** (Brain เป็นของราย Agent อยู่แล้ว) — v1 implement เริ่มจาก backend ที่พร้อม เพิ่ม provider อื่นได้โดยไม่แตะ Agent
- **Backend = subscription CLI ทุกตัว** (`claude -p`, `codex exec`, Gemini CLI) auth ด้วย subscription — ไม่ใช้ API key จ่ายต่อ token
- **rate-limit ≠ Budget เกิน:** rate-limit = transient → พัก Task เป็นสถานะ `waiting_for_quota` คาไว้ใน queue แล้ว retry ตอนโควต้า reset; Budget เกิน = ตั้งใจหยุด → ไม่ retry
- **queue ต้อง durable (persist):** เพราะ rate-limit reset เป็นหลัก "ชั่วโมง" งานต้องรอดข้ามการรีสตาร์ท/เครื่องดับ — call/return + correlation-id ทำให้ **เฉพาะหน่วยที่ค้างเท่านั้นที่ retry** ส่วนที่เสร็จแล้วผลยังอยู่

## ทำไม / ทางที่ตัดทิ้ง

- **API key จ่ายต่อ token (เป็น default) — ตัดทิ้ง:** ผู้ใช้มี subscription อยู่แล้วและต้องการเลี่ยงค่า token (ข้อเสนอ hybrid "Routine → API ถูกๆ" ถูกปฏิเสธ — เลือกใช้ CLI ทุกตัว)
- **queue ใน memory ล้วน — ตัดทิ้ง:** rate-limit รอเป็นชั่วโมง งานต้องไม่หายเมื่อโปรเซสดับ

## ผลที่ตามมา / ข้อควรระวังที่บันทึกไว้

- **CLI คือ "agent" ไม่ใช่ "model backend":** มี loop / system-prompt / tool / memory ของตัวเอง → ต้องบีบให้เหลือ "prompt เข้า → ข้อความออก" (print mode, ปิด tool ในตัว, ใส่ tool ของ Olympus ผ่าน MCP)
- **Budget unit อาจลดรูป:** ถ้า headless ไม่คืน token usage แบบเครื่องอ่านได้ → Agent ที่ใช้ CLI จะนับ Budget เป็น "จำนวนครั้ง + เวลา" แทน token
- **ความเสี่ยงที่มองไม่เห็นในโค้ด (รับไว้โดยรู้ตัว):** subscription license ให้ใช้แบบ interactive ส่วนตัว — เอามาเป็น backend อัตโนมัติ 24 ชม. โดยเฉพาะ Routine เสี่ยงบัญชีโดนแบน; rate limit เป็น windowed/แชร์ → concurrency + Routine อาจค้างทั้งออฟฟิศ และจ่ายเพิ่มเพื่อปลดล็อกไม่ได้

## ผล spike #0 — verify items ปิดแล้ว ✅

ทดสอบจริงทั้ง 3 (`claude -p`, `gemini -p`, `codex exec`) + ขุด flag ครบ → flag เต็มอยู่ใน [`docs/notes/cli-backend-flags.md`](../notes/cli-backend-flags.md)

- **headless "prompt → message out": ✅** ทั้ง 3 ตอบแล้วจบ — แต่ละ CLI ห่อด้วย persona/agent ของตัวเอง (ยืนยัน "CLI = agent ไม่ใช่ model เปล่า") → ต้อง override system prompt + รัน neutral
- **token usage (JSON): ✅** Claude `--output-format json` (`.usage`), Gemini `--output-format json` (`.stats`), Codex `--json` (event `turn.completed`) → **Budget นับ token ได้ทุก backend**
- **ปิด built-in tool + MCP-only: ✅** Claude `--tools ""` + `--mcp-config`/`--strict-mcp-config`; Gemini `settings.json` `tools.core/exclude` + `mcpServers`; Codex `--sandbox read-only` + `config.toml [mcp_servers]` → **Persona/Tool model รอด**
- **override system prompt: ✅** Claude `--system-prompt`, Gemini `GEMINI_SYSTEM_MD`, Codex ⚠️ ผ่าน `AGENTS.md` (ไม่สะอาด)
- **ความสะอาด:** Claude 🟢 > Gemini 🟡 > Codex 🔴 → ลำดับต่อ backend: Claude → Gemini → Codex
- **ToS:** Boss เช็คเอง (ยังค้าง)

### ความเสี่ยง/ข้อสังเกตที่เหลือ
- **Codex bug openai/codex#15451:** `--json` ถูกดรอปเงียบเมื่อเปิด tool/MCP — เราอยากใช้ทั้งคู่ → ต้องเลี่ยง/ติดตามก่อนใช้ Codex เป็น backend
- **baseline token overhead ต่อ call สูงทุกตัว** (Codex ~4,397 tok แค่ "hello") → กิน rate limit เร็ว มีผลต่อ Routine/concurrency
- `--max-budget-usd` ของ Claude = เพดาน Budget ระดับ call ฟรีสำหรับ backend นี้
