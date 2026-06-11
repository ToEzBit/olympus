# CLI backend flags — ใช้ subscription CLI เป็น "model backend สะอาด"

ผลของ spike #0 (ปิด verify items ของ [ADR-0002](../adr/0002-model-backend-subscription-cli.md))
ที่มา: Claude = `claude --help` ในเครื่องจริง; Gemini = doc ทางการ (geminicli.com); Codex = OpenAI docs + GitHub issue
อัปเดต: 2026-06-11

เป้าหมาย: บีบแต่ละ CLI ให้เหลือ "prompt เข้า → ข้อความออก" + ฉีด persona ของเรา + ปิด tool ในตัว + ต่อ tool เราผ่าน MCP + อ่าน token usage

---

## 🟢 Claude (`claude -p`) — สะอาดสุด ทุกอย่างเป็น flag

| ต้องการ | flag |
|---|---|
| JSON + token usage | `--output-format json` → `.usage.input_tokens` / `.output_tokens` / `.cache_creation_input_tokens` / `.cache_read_input_tokens` + `.total_cost_usd` |
| ปิด built-in tool ทั้งหมด | `--tools ""` |
| ใช้ MCP ของเราเท่านั้น | `--mcp-config '<json|file>'` + `--strict-mcp-config` |
| แทน system prompt (persona) | `--system-prompt "..."` (แทนทั้งดุ้น) · ต่อท้าย: `--append-system-prompt` |
| รัน neutral (ไม่โหลด CLAUDE.md/context) | `--bare` หรือ `--exclude-dynamic-system-prompt-sections` |
| เพดาน $ ในตัว | `--max-budget-usd <n>` |
| structured output | `--json-schema '<schema>'` |
| ไม่เซฟ session | `--no-session-persistence` |

```bash
echo "prompt" | claude -p \
  --output-format json \
  --system-prompt "คุณคืออพอลโล นักวิเคราะห์เจ้าระเบียบ..." \
  --tools "" \
  --mcp-config '{"mcpServers":{"olympus":{"command":"node","args":["./tool-server.js"]}}}' \
  --strict-mcp-config --bare \
  | jq '{result, in:.usage.input_tokens, out:.usage.output_tokens, cost:.total_cost_usd}'
```

> หมายเหตุ: `--bare` บังคับ auth เป็น `ANTHROPIC_API_KEY`/apiKeyHelper (ไม่อ่าน OAuth/keychain) — ถ้าจะใช้ subscription auth ให้ใช้ `--exclude-dynamic-system-prompt-sections` แทน `--bare`

## 🟡 Gemini (`gemini -p`) — ครบ แต่ tool/MCP คุมผ่าน settings.json

| ต้องการ | วิธี |
|---|---|
| JSON + token usage | `--output-format json` → `.response` + `.stats` (มี token metrics) |
| ปิด/จำกัด tool | `settings.json` → `tools.core: []` (allowlist ว่าง) หรือ `tools.exclude: [...]` |
| MCP ของเรา | `settings.json` → `mcpServers.<name>` (`command`/`url` + `includeTools`/`excludeTools`) |
| แทน system prompt | env `GEMINI_SYSTEM_MD=/path/persona.md` (true = `./.gemini/system.md`); ดู default เดิม: `GEMINI_WRITE_SYSTEM_MD=true` |

```bash
GEMINI_SYSTEM_MD=./persona.md gemini -p "prompt" --output-format json | jq '.stats'
# tool/MCP กำหนดใน ./.gemini/settings.json:
# { "tools": { "core": [], "exclude": ["run_shell_command"] },
#   "mcpServers": { "olympus": { "command": "node", "args": ["./tool-server.js"] } } }
```

## 🔴 Codex (`codex exec`) — ใช้ได้ แต่มี "หนาม"

| ต้องการ | วิธี |
|---|---|
| JSON + usage | `--json` → JSONL event stream (usage อยู่ใน event `turn.completed`) |
| กันเขียนไฟล์/ผลข้างเคียง | `--sandbox read-only` (ไม่มี `--tools ""` แบบ Claude — ใช้ sandbox กันแทน) |
| MCP ของเรา | `~/.codex/config.toml` → `[mcp_servers]` หรือ `codex mcp add` |
| แทน system prompt | **ไม่มี flag สะอาด** → ผ่าน `AGENTS.md` / config `base_instructions` |

```bash
codex exec --sandbox read-only --json "prompt"
```

⚠️ **หนาม 2 อันที่ต้องรู้:**
1. **Bug openai/codex#15451:** `--json`/structured output ถูกดรอปเงียบๆ เมื่อเปิด tool/MCP — ซึ่งเราอยากใช้ทั้งคู่พร้อมกัน อาจชนกัน (ต้องหาทางเลี่ยง/ติดตาม)
2. **token overhead หนัก** (~4,397 tok แค่ตอบ "hello") + persona ไม่สะอาด

---

## Verdict + ลำดับการต่อ backend

| | system prompt | ปิด tool | MCP-only | usage (JSON) | ความสะอาด |
|---|:---:|:---:|:---:|:---:|:---:|
| **Claude** | ✅ flag | ✅ `--tools ""` | ✅ flag | ✅ | 🟢 สูงสุด |
| **Gemini** | ✅ env | ✅ settings | ✅ settings | ✅ | 🟡 ดี |
| **Codex** | ⚠️ AGENTS.md | ⚠️ sandbox | ✅ config | ⚠️ ชน MCP | 🔴 มีหนาม |

**ลำดับ:** Claude (ตัวแรก/อ้างอิง — สะอาดสุด + มี `--max-budget-usd`) → Gemini (เซ็ต settings.json) → Codex (ท้ายสุด เพราะ bug `--json`+MCP)

## เกร็ดที่กระทบ design

- **baseline token overhead ต่อ call สูง** ทุกตัว (CLI โหลด system prompt/context ของตัวเอง) → กิน rate limit เร็ว มีผลต่อ Routine/concurrency
- `--max-budget-usd` ของ Claude = เพดาน Budget ระดับ call ฟรีๆ สำหรับ backend นี้
