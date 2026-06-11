# Olympus

Olympus คือ multi-agent "ออฟฟิศ" ที่ AI agent หลายตัว (แต่ละตัวมีบุคลิก, สมอง/model, และเครื่องมือต่างกัน) ทำงานที่ได้รับมอบหมาย ส่งงานต่อกันเอง และพูดคุยกันได้ โดยส่วนหน้าเป็น UI ภาพออฟฟิศที่เห็น agent เป็น "ตัวละคร" นั่งทำงาน

## Language

**Agent**:
ผู้ปฏิบัติงานถาวร 1 ตัวในระบบ — มี Persona (บุคลิก), Brain (model/LLM 1 ตัว), Tools (เครื่องมือ), และ Memory (ความจำ) เป็นของตัวเอง
_Avoid_: bot, assistant, character (character ใช้เรียกภาพตัวละครใน UI เท่านั้น)

**Boss**:
มนุษย์ผู้ใช้งานระบบ — สั่งงานระดับบนสุด และดูภาพรวมทั้งออฟฟิศ
_Avoid_: User, Owner, Player

**Task**:
งานชิ้นเดียวจบในตัว ที่ถูก "สั่ง/มอบหมาย" — ต้นทางเป็น Boss หรือ Agent อื่นก็ได้
_Avoid_: Job, Request, Ticket

**Routine**:
งานประจำที่ทำซ้ำตามตารางเวลา (cron) ซึ่ง Agent ปลุกตัวเองขึ้นมาทำเอง โดยไม่ต้องมีใครสั่ง — มี "อำนาจ" เท่า Task คือ delegate ต่อ และแจ้ง Boss ได้
_Avoid_: Cronjob, Schedule (สงวนไว้เรียกตัวตั้งเวลา ไม่ใช่ตัวงาน), Job

**Delegation**:
การที่ Agent หนึ่งมอบ Task ให้อีก Agent หนึ่งทำต่อ
_Avoid_: Assign (สงวนไว้สำหรับ Boss → Agent), Handoff

**Tool**:
ความสามารถต่อโลกภายนอก 1 อย่าง ที่อยู่ใน registry กลาง และนำไป reuse กับ Agent หลายตัวได้ (เช่น web scraper, image-gen, stock API) — Brain เป็นคนตัดสินใจ "เรียก" Tool ไม่ใช่ทำเอง
_Avoid_: Skill, Function, Capability, Plugin

**Toolset**:
ชุด Tool ที่ Agent ตัวหนึ่งได้รับมอบ — เท่ากับ "job description / ความเชี่ยวชาญ" ของ Agent ตัวนั้น (v1: Boss มอบตอนสร้าง Agent)
_Avoid_: Permissions, Abilities

**Manager**:
"บทบาท" (ไม่ใช่ Agent ชนิดพิเศษ) ที่ Boss ตั้งให้ Agent ธรรมดา 1 ตัวเป็น "ประตูหน้า" — รับ Task ก้อนใหญ่จาก Boss มา decompose แล้ว delegate ต่อ หลังแจกงานแล้ว Agent อื่นยังคุย/delegate กันเองตรงๆ ได้ (mesh)
_Avoid_: Orchestrator, Coordinator, Lead

**Worker**:
บทบาทชั่วคราวของ Agent ที่กำลังทำ Task ที่ถูก delegate มา — Agent ตัวเดียวเป็นได้ทั้ง Worker (ของงานหนึ่ง) และเจ้าของงาน (ของอีกงาน) สลับกันตามบริบท
_Avoid_: Subordinate, Slave

**Budget**:
เพดานทรัพยากรต่อ Task/Routine ที่ชนแล้วงาน "หยุดเอง" แล้วรายงาน Boss — หน่วยหลักเป็น provider-agnostic: **จำนวน token, จำนวนครั้งที่เรียก LLM, เวลา (wall-clock), ความลึกของ delegation** ส่วน "ค่าเงิน (฿)" เป็นแค่ *มุมมองที่คำนวณต่อ* จาก token × ตารางราคาต่อ model (ใช้ได้เมื่อจ่ายแบบ pay-per-token)
_Avoid_: Quota, Limit, Cost (cost = มุมมองเงิน ไม่ใช่ตัว Budget เอง)

**Private Memory**:
ความจำส่วนตัวของ Agent 1 ตัว — งานที่เคยทำ, สิ่งที่เรียนรู้, คำสั่งที่ Boss บอกเฉพาะมัน; Agent อื่นมองไม่เห็น
_Avoid_: Scratchpad, History

**Shared Memory**:
ความจำส่วนกลางของออฟฟิศที่ทุก Agent "อ่าน" ได้ (เช่น นโยบาย, เป้าหมายโปรเจค, สิ่งที่ Boss ชอบ) — v1 "เขียน" ได้เฉพาะ Boss + Manager; ของชิ้นหนึ่งจะลง Private หรือ Shared ตัดสินได้ทั้งจาก Agent ที่รับคำสั่ง (ตามบริบท) หรือ Boss สั่งตรง
_Avoid_: Office Memory (alias), Global state, Blackboard

**Persona**:
ตัวตนของ Agent — ชื่อ, น้ำเสียง/นิสัย, กรอบบทบาทเชิงตัวละคร, และภาพตัวละคร; ถูก compile เป็น system prompt ฉีดให้ Brain ธีมเริ่มต้นเป็นเทพกรีก (Apollo, Hermes, ...) เป็น template ที่ Boss แก้/สร้างใหม่ได้ (v1: มีผลแค่ระดับ system prompt ไม่มี behavior-knob แยก)
_Avoid_: Role (= บทบาทเชิง orchestration เช่น Manager/Worker, คนละเรื่อง), Character (= ภาพใน UI เท่านั้น), Profile

**Discussion**:
วงแลกเปลี่ยนความเห็นแบบหลายรอบระหว่าง Agent 2+ ตัว เพื่อให้ได้ "ข้อสรุป" — ต่างจาก Delegation ตรงที่ symmetric (ถกกัน ไม่ใช่ส่งงาน) แต่ **อยู่ใต้ Task เสมอ และต้องคลอดข้อสรุป** (ไม่มีแชตลอยๆ); จบเมื่อ Convener เคาะ หรือชน turn-cap (v1 ใช้ 2 ตัวก่อน โครงรองรับ N)
_Avoid_: Chat, Debate, Meeting (meeting = Discussion แบบกลุ่ม)

**Convener**:
Agent ที่ "เปิดวง" Discussion — ตั้งหัวข้อ, เชิญผู้ร่วม, ตัดสินว่าพอเมื่อไหร่, และเป็นเจ้าของ "ข้อสรุป" ที่ได้ (เป็นบทบาทคนละชุดกับ Manager/Worker)
_Avoid_: Moderator, Host, Chair

## Example dialogue

**Boss:** "ช่วยหาหุ้นเทคน่าสนใจ แล้วทำ infographic ให้หน่อย"
**Dev:** อันนี้คือ Task ที่ Boss สั่งเข้าหัวหน้าทีม แล้วหัวหน้า delegate เป็นสอง Task ย่อย — ดึงข้อมูลให้ stock agent, ทำรูปให้ image agent ใช่ไหม?
**Boss:** ใช่ แล้วทุกเช้า stock agent ก็สรุปหุ้นเองด้วยนะ
**Dev:** นั่นไม่ใช่ Task แล้ว — เป็น Routine เพราะ agent ปลุกตัวเองตามเวลา และมันยัง delegate ให้ image agent ทำกราฟต่อได้เองด้วย
