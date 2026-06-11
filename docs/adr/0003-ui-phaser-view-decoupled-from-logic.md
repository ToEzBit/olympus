# 0003 — UI rendering: Phaser เป็น "view" ที่ decouple จาก logic

**Status:** accepted

## บริบท

Office UI คือ feature เรือธง และ Boss อยากได้ความสนุกแบบเกม — Agent **เดินเล่นได้ตอนว่าง** (Phaser) ไม่ใช่นั่งโต๊ะนิ่งๆ แต่ "game engine + การ sync ภาพกับ logic" คือจุดที่โปรเจคงานอดิเรกชอบไปตาย (sync hell, iso depth-sort, pathfinding, งานศิลป์บาน)

## การตัดสินใจ

- ใช้ **Phaser** เป็น renderer ของ office — มุมมอง **top-down** (v1 ยังไม่ทำ isometric)
- **กฎเหล็ก: Phaser เป็นแค่ "view" ที่สะท้อนสถานะ Agent — logic อยู่บน event bus และห้ามรอ/ถูกบล็อกด้วย animation**
  - Agent **เดินเล่นตอนว่าง** = ambient flavor ที่ decouple จาก logic 100% (ไม่แตะ bus)
  - Delegation เกิดบน bus *ทันที*; "เดินไปคุย" เป็น eye-candy ที่เล่าเรื่อง ไม่ใช่สาเหตุ — **ห้ามให้ B รับงานต่อเมื่อ sprite ของ A เดินไปถึง**
- renderer ยังเป็น "ชั้นเสียบทับ bus" (map event → ภาพ) → สลับ/อัปได้โดยไม่แตะ logic
- ต่อ Next.js: Phaser mount ใน div, WebSocket event → "agent state store" เล็กๆ → Phaser อ่านทุกเฟรมแล้วเล่นอนิเมชันให้ตรงสถานะ (idle-เดินเล่น / ทำงาน / คุย / ติด rate limit)

## ทำไม / ทางที่ตัดทิ้ง

- **sync ภาพกับ logic จริง (เดินไปถึงก่อนงานถึงจะเกิด) — ตัดทิ้ง:** เป็น sync hell ที่เพี้ยนง่ายเมื่อ event รัวๆ และ "การนำเสนอ" ไม่ควรไปคุม "ความจริง"
- **isometric + pathfinding หนัก + เดินไปคุยแบบ sync — เลื่อนไปทีหลัง:** กินเวลา/งานศิลป์มากโดยไม่เพิ่มความสามารถ; v1 ใช้ top-down + เดินเล่น + เดินไปจุดแบบ waypoint/steering ง่ายๆ ที่ ~สิบกว่าตัวก็พอ
- **DOM/CSS หรือ PixiJS — ไม่เลือก:** Boss อยากได้ความสนุกแบบเกม (Phaser) ซึ่งสำหรับโปรเจค passion ความสนุก = แรงผลักให้ทำจนจบ (ถือเป็นเหตุผลที่ legit)

## ผลที่ตามมา

Phaser ฝังใน React/Next ต้อง glue เอง (mount imperative + bridge ผ่าน state store) — รับไว้แลกกับความสนุก เพราะ logic แยกจากภาพ การทำงาน/Routine ยังถูกต้องแม้ animation จะ "ตามมาทีหลัง" หรือถูกข้าม
