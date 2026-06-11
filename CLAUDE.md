# CLAUDE.md

คำแนะนำนี้สำหรับ **Claude Code ที่กำลังพัฒนา repo นี้เท่านั้น** — ไม่เกี่ยวกับ
Persona/system-prompt ของ Agent ในระบบ Olympus เอง (Apollo ฯลฯ) ซึ่งตาม
ADR-0002 ต้องรัน CLI backend แบบ neutral (`--bare` /
`--exclude-dynamic-system-prompt-sections`) และ**ไม่โหลด CLAUDE.md นี้**

## ภาษา

ตอบ Boss เป็น**ภาษาไทยสลับศัพท์เทคนิคอังกฤษ** ตามสไตล์ที่ใช้ใน `CONTEXT.md`
และ `docs/adr/*` (เช่น Agent, Task, Delegation, Budget ใช้ทับศัพท์ ไม่ต้องแปล)

## Quick reference

- [`CONTEXT.md`](./CONTEXT.md) — glossary คำศัพท์โดเมน (Agent, Boss, Task,
  Routine, Delegation, Budget, ...) อ่านก่อนถ้าจะใช้คำพวกนี้
- [`docs/adr/`](./docs/adr/) — architecture decisions (orchestration topology,
  model backend, UI rendering) พร้อมเหตุผล/ทางที่ตัดทิ้ง
- [`docs/contracts/`](./docs/contracts/) — locked interfaces, HITL-reviewed
  (event schema, ws protocol, monorepo structure, task store) — ดู
  [0003](./docs/contracts/0003-monorepo-structure.md) สำหรับ layout เต็ม
- [`docs/notes/`](./docs/notes/) — ผล spike (เช่น CLI backend flags)
- Slice/roadmap ปัจจุบัน (S1, S2, ...) — ดู GitHub issues ของ
  [ToEzBit/olympus](https://github.com/ToEzBit/olympus) ไม่มีระบุไว้ใน docs

## Commands

```bash
pnpm install
pnpm --filter @olympus/shared build   # ต้องรันใหม่ทุกครั้งหลังแก้ packages/shared/src/*
pnpm dev:engine                       # @olympus/engine — HTTP :3001 / WS :3002
pnpm dev:web                          # @olympus/web — Next.js dev server
pnpm test                             # vitest ทุก package
pnpm typecheck                        # tsc --noEmit ทุก package
pnpm build                            # build ทุก package
```

ตั้งค่า env: copy `apps/engine/.env.example` → `apps/engine/.env` และ
`apps/web/.env.example` → `apps/web/.env`

**Gotcha:** `@olympus/web` (Turbopack) กับ `@olympus/engine` resolve
`@olympus/shared` ผ่าน `dist/` ไม่ใช่ `src/` — แก้ `packages/shared/src/*`
แล้วไม่ build ใหม่ = engine/web ยังเห็นโค้ดเก่า

## Guardrails

- **HITL gate:** ห้ามแก้ `packages/shared/src/*` หรือเพิ่ม/แก้
  `docs/contracts/*.md` โดยไม่หยุดถาม Boss ก่อน — กระทบทั้ง
  `@olympus/engine` และ `@olympus/web` พร้อมกัน (Contract 0003)
- **เจอ decision ที่ hard-to-reverse / มี trade-off จริงระหว่างทำ slice ใหม่:**
  เสนอ ADR ใหม่ใน `docs/adr/` ตามฟอร์แมตของ 0001-0003 (และ contract ใหม่ใน
  `docs/contracts/` ถ้า decision นั้นแตะ `packages/shared`)
