# UI CHANGELOG — Dark Theme Refactor

## Theme (`globals.css`)
- **Light → Dark**: `#F8FAFC` → `#050816` background
- **Card**: `#FFFFFF` → `#0B1220`
- **Primary**: `#7C3AED` → `#8B5CF6`
- **Border**: `#E5E7EB` → `rgba(139,92,246,0.15)`
- **Text muted**: `#6B7280` → `#94A3B8`
- **Border radius tokens**: giữ nguyên

## Layout
### Sidebar (`sidebar.tsx`)
- Width: 240px → 256px
- Background: `bg-white` → `bg-[#0B1220]/90 backdrop-blur-xl`
- Border: `border-border` → `border-white/5`
- Nav padding: `py-2.5` → `py-3`
- Active state: `bg-primary/10` → `bg-[#8B5CF6]/15`
- Nav section labels: `text-xs uppercase tracking-wider` → `text-[10px] uppercase tracking-widest text-[#4A5568]`
- **Added** user card ở footer (avatar + name + email)
- Hover state: `hover:bg-primary/5` → `hover:bg-white/5`
- Mobile overlay: `bg-black/30` → `bg-black/60`

### Topbar (`topbar.tsx`)
- Height: `h-16` → `h-[72px]`
- Background: `bg-white` → `bg-[#0B1220]/60 backdrop-blur-md`
- Border: `border-border` → `border-white/5`

### Dashboard Layout (`layout.tsx`)
- Sidebar offset: `lg:pl-60` → `lg:pl-64`

## New Components

### SegmentedControl (`segmented-control.tsx`)
- Dùng `@base-ui/react/tabs` làm base
- Container: `rounded-2xl p-1 bg-[#1E1B2E]`
- Active tab: gradient `from-[#8B5CF6] to-[#A855F7]` + white text + shadow
- Inactive tab: `text-[#94A3B8]` → white on hover
- **Dùng cho**: tab 1NV/2NV, ratio selector (9:16, 1:1, 16:9)

### AssetCard (`asset-card.tsx`)
- Solid border `rgba(139,92,246,0.2)` (không dashed)
- Face: 120x120, Outfit/Product: 94x94
- Label dưới ảnh: `text-xs text-[#94A3B8]`
- Loaded state: preview + delete button (luôn visible)
- **Dùng cho**: face/outfit/product upload trong CharacterSection

### ProgressStepper (`progress-stepper.tsx`)
- 4 bước: Phân tích dữ liệu → Đang tạo ảnh → Kiểm tra chất lượng → Hoàn tất
- Frontend mapping: `pending` → B1, `processing+images=0` → B2, `processing+images>0` → B3, `completed` → B4
- Active dot: `bg-[#8B5CF6]` + glow
- Completed dot: `bg-[#22C55E]` + checkmark
- Pending dot: `bg-[#1E1B2E]` tối

## Page Refactor (`page.tsx`)

### Tab Switcher
- **Trước**: button group `flex bg-[#F3F4F6] rounded-xl p-1`
- **Sau**: `SegmentedControl` với gradient active state

### CharacterSection
- **Trước**: `ImageUpload` with dashed borders, fixed pixel widths
- **Sau**: `AssetCard` component, face > outfit/product size hierarchy
- **Thêm**: ownership badge (NV1 purple gradient, NV2 blue-purple gradient)
- Wrapped in Card (`bg-[#0B1220] border-white/5`)

### SceneSection
- **Trước**: 50/50 flex layout, camera settings included
- **Sau**: 40/60 layout (upload left, text right), **tách camera ra component riêng**
- Mobile: stack vertical (upload first, text below)

### CameraSection (MỚI)
- Card riêng với Label "Camera"
- Góc chụp: Select (`bg-[#1E1B2E]`)
- Tỷ lệ ảnh: SegmentedControl (9:16 | 1:1 | 16:9)
- Số lượng: Select

### InteractionSection (MỚI, Tab 2)
- Card riêng full width
- Select + Input trong flex layout

### Generate Button
- **Trước**: nằm trong flow, không sticky
- **Sau**: `sticky bottom-0`, always visible khi scroll
- Thêm `hover:scale-[1.02]`
- Gradient `from-[#7C3AED] to-[#A855F7]`

### Ratio Options
- **Trước**: 5 ratios (1:1, 3:4, 4:5, 9:16, 16:9)
- **Sau**: 3 ratios (9:16, 1:1, 16:9) — loại bỏ 3:4 và 4:5
- Default ratio: `3:4` → `9:16`

## Result Panel

### ResultWorkspace
- Container: `bg-white` → `bg-[#0B1220] border-white/5`
- **ProgressBar** → **ProgressStepper** (4-step)
- **Xoá** `DnaDisplay`
- Download button: `bg-primary` → gradient `from-[#8B5CF6] to-[#A855F7]`
- **Thêm** stagger animation cho result cards (framer-motion)

### ResultCard
- Container: `bg-white` → `bg-[#0B1220] border-white/5`
- Overlay hover: `bg-black/30` → `bg-[#8B5CF6]/10`
- #badge: `bg-black/60` → `bg-[#8B5CF6]/80`
- Favorite inactive: `text-white/80` → `text-[#94A3B8]`
- **Loading skeleton**: pulse gradient → circular SVG ring + "Đang tạo..."

## Deleted Files
- `dna-display.tsx` — không còn trong reference design
- `progress-bar.tsx` — replaced by ProgressStepper

## Animations
- **Installed**: `framer-motion`
- Result cards: staggered fade-in (`delay: i * 0.05`)
- Generate button: `hover:scale-[1.02]`
- Tab switch: CSS transition (smooth background/border swap)

## Build Status
- `npm run build` ✅ Pass
- TypeScript ✅ Pass
- ESLint ✅ Pass
