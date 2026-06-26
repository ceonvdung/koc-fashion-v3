# DESIGN AUDIT — KOC Fashion AI Studio

## Pre-Refactor UI Issues (Light Theme)

### 1. Theme & Color
- **Light theme** (#F8FAFC background) — không phù hợp "Luxury AI SaaS" positioning
- **Purple palette** (#7C3AED primary) — thiếu depth và premium feel
- **White cards** trên nền xám nhạt — tạo cảm giác generic
- **No glass effect** — sidebar và topbar phẳng, thiếu modern touch

### 2. Layout & Spacing
- **Sidebar width** 240px — hẹp, nav items cramped (`py-2.5`)
- **No ownership system** — không phân biệt NV1 vs NV2 về mặt visual
- **Scene + Camera chung 1 card** — quá tải thông tin, thiếu hierarchy
- **Interaction section nhét giữa NV1 và NV2** — gây rối bố cục

### 3. Component Design
- **Tab switcher** — button group basic (`bg-[#F3F4F6]`), không có slide transition
- **Image upload** — dashed border box nhỏ, không có label dưới ảnh
- **No asset card** — upload box không hiển thị tên file
- **Generate button** — không sticky, phải scroll lên sau khi điền form

### 4. Progress & Results
- **Progress bar** — spinner + percentage, thiếu step-by-step visual
- **Loading skeleton** — pulsing gradient + spinner, không có circular ring
- **Card background** — white cards trên nền xám, thiếu depth

### 5. Missing Premium Elements
- **No glass morphism** — sidebar, topbar đều phẳng
- **No staggered animations** — kết quả hiện ra đồng loạt
- **Section labels** — thiếu visual hierarchy (section headers yếu)

---

## Key Improvements Needed

| Area | Priority | Current State | Target State |
|---|---|---|---|
| Theme | P0 | Light (#F8FAFC) | Dark (#050816) |
| Cards | P0 | White (#FFFFFF) | Dark (#0B1220) |
| Sidebar | P0 | Flat white | Dark glass |
| Topbar | P0 | Flat 64px | Glass 72px |
| Navigation | P0 | Tight spacing | Spacious + glow |
| Tab Switcher | P0 | Basic buttons | Segmented Control |
| Asset Upload | P0 | Dashed box | Solid Asset Card |
| Character Ownership | P0 | None | NV1 purple / NV2 blue |
| Section Organization | P0 | Mixed | Dedicated cards |
| Progress | P0 | Spinner + pct | 4-step stepper |
| Loading Slot | P0 | Pulse skeleton | Circular ring |
| Generate Button | P0 | Static | Sticky + hover scale |
| Mobile Grid | P1 | 4 cols | 2 cols mobile |
| Animations | P1 | CSS only | Subtle framer-motion |
