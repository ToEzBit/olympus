# 0001 — Orchestration: hierarchy + mesh, orchestration ด้วย call/return บน event bus

**Status:** accepted

## บริบท

Olympus มีทาง "เกิดงาน" 2 ทาง: (1) **Boss** สั่ง และ (2) **Routine** ตามตารางเวลา (cron) ที่ Agent ปลุกตัวเอง — Routine เป็นพลเมืองชั้นหนึ่ง (delegate ต่อ + แจ้ง Boss ได้) เท่า Task ปกติ ต้องมีโครงที่รองรับทั้ง "มอบหมาย + delegate กันเอง + คุยกันเอง" โดยไม่วนลูป/เผา token ไม่จบ

## การตัดสินใจ

- **Topology = hybrid (option C):** มี **Manager** (บทบาทที่ Boss ตั้งให้ Agent ธรรมดา 1 ตัว ไม่ใช่ชนิดพิเศษ) เป็น "ประตูหน้า" รับงานก้อนใหญ่มา decompose แล้วแจก หลังจากนั้น Agent ตัวไหนก็ delegate / คุยกันเองตรงๆ ได้ (mesh)
- **Coordination = orchestration ไม่ใช่ choreography:** เจ้าของงานใช้ LLM loop ตัดสิน step ถัดไป และ **ทุก delegation ใช้ call/return — ผลวิ่งกลับหา "คนที่สั่ง" เสมอ ห้าม forward ลอยๆ ไปตัวที่สาม**
- **Transport = event bus ตั้งแต่ v1** (realtime office คือ feature เรือธง): async ไม่บล็อก ทำงานขนานได้ ใช้ correlation-id กำกับเพื่อรักษา call/return; bus ต้อง persist (เหตุผลใน ADR-0002)
- **เบรก 3 ชั้น:** (1) **Budget ต่อ Task** — token / จำนวนครั้ง / เวลา / ความลึก delegation (denominate เป็น token, ฿ เป็น derived) (2) การคุยอยู่ใต้ Task เสมอ + hard cap จำนวนรอบ + เจ้าของงานเคาะจบ (3) **Boss** มีปุ่ม pause/stop ทั้งราย Agent และทั้งออฟฟิศ

## ทำไม / ทางที่ตัดทิ้ง

- **Choreography (Agent chain กันเองหน้าเดียว) — ตัดทิ้ง:** ไม่มีใครเป็นเจ้าของผลลัพธ์, error ไม่มีใครจับ, routing ฉลาดกระจายไปทุกตัวจน "หลอน"
- **Manager ตายตัวตัวเดียว (pure hub) — ตัดทิ้ง:** เป็นคอขวด + ขัดภาพ "Agent คุยกันเอง"
- **Synchronous blocking — ตัดทิ้ง:** office ดูตาย ทำงานขนานไม่ได้

## ผลที่ตามมา

Manager เป็น LLM loop = เรียก LLM หลายรอบต่องาน (ต้องพึ่งเบรกเสมอ); Routine ที่รันเองกินโควต้าแม้ Boss ไม่ได้เฝ้า
