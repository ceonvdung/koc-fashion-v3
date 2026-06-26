/* ─── Entities ─── */
export interface User {
  id?: string;
  name?: string;
  email: string;
  username?: string;
  role: "super_admin" | "user";
  membershipLevel: 1 | 2;
  affiliateCode: string | null;
  status?: "active" | "locked";
  createdAt?: string;
}

export interface Generation {
  id: string;
  userId: string;
  prompt?: string;
  scene: string | null;
  camera: string | null;
  ratio: string;
  quantity: number;
  characterCount: 1 | 2;
  images: string[];
  status: "pending" | "processing" | "completed" | "failed";
  metadata: Record<string, any> | null;
  createdAt: string;
}

export interface ActivityLog {
  id: string;
  userId: string;
  action: string;
  details: string | null;
  ipAddress: string | null;
  timestamp: string;
  userName?: string;
  userEmail?: string;
}

export interface DashboardStats {
  totalUsers: number;
  activeUsers: number;
  totalGenerations: number;
  completedGenerations: number;
  level1Users: number;
  level2Users: number;
}

/* ─── Generation Types ─── */
export interface ImageFile {
  data: string;
  name: string;
  type: string;
  preview: string;
}

export interface GenerateRequest {
  characterCount: 1 | 2;
  faceRef1?: ImageFile;
  outfitRef1?: ImageFile;
  productRef1?: ImageFile;
  faceRef2?: ImageFile;
  outfitRef2?: ImageFile;
  productRef2?: ImageFile;
  sceneRef?: ImageFile;
  sceneLevel1?: string;
  sceneLevel2?: string;
  sceneLevel3?: string;
  productAction1_1?: string;
  productAction1_2?: string;
  productAction2_1?: string;
  productAction2_2?: string;
  interaction_1?: string;
  interaction_2?: string;
  camera: string;
  ratio: string;
  quantity: number;
}

export interface GenerationProgress {
  progress: string;
  totalBatches: number;
  completedBatches: number;
  totalImages: number;
  generatedImages: number;
  error?: string;
}

/* ─── Scene Constants — values MUST match backend scanner.ts exactly ─── */
export const SCENE_LEVEL_1_OPTIONS = [
  { value: "Indoor Commercial", label: "Nội thất thương mại" },
  { value: "Outdoor Lifestyle", label: "Ngoại cảnh" },
  { value: "Luxury Fashion", label: "Thời trang cao cấp" },
  { value: "Beauty Studio", label: "Beauty Studio" },
  { value: "CEO Branding", label: "CEO Branding" },
  { value: "E-commerce Product", label: "Sản phẩm thương mại" },
  { value: "Resort Lifestyle", label: "Resort / Du lịch" },
  { value: "Street Fashion", label: "Đường phố" },
] as const;

export const SCENE_LEVEL_2_MAP: Record<string, string[]> = {
  "Indoor Commercial": [
    "Studio chụp ảnh",
    "Văn phòng CEO",
    "Cửa hàng thời trang cao cấp",
    "Sảnh tòa nhà văn phòng hạng A",
  ],
  "Outdoor Lifestyle": [
    "Đường phố thời trang",
    "Ban công ánh sáng tự nhiên",
    "Rooftop thành phố hiện đại",
    "Khu phố Châu Âu cổ điển",
  ],
  "Luxury Fashion": [
    "Phòng khách luxury",
    "Phòng ngủ hiện đại",
    "Sảnh khách sạn 5 sao",
    "Penthouse sang trọng",
    "Showroom ô tô cao cấp",
  ],
  "Beauty Studio": [
    "Studio chụp ảnh",
    "Salon tóc cao cấp",
    "Phòng ngủ hiện đại",
  ],
  "CEO Branding": [
    "Văn phòng CEO",
    "Sảnh tòa nhà văn phòng hạng A",
    "Phòng khách luxury",
  ],
  "E-commerce Product": [
    "Studio chụp ảnh",
    "Cửa hàng thời trang cao cấp",
    "Bàn làm việc tối giản",
  ],
  "Resort Lifestyle": [
    "Hồ bơi resort 5 sao",
    "Bãi biển luxury",
    "Penthouse sang trọng",
    "Ban công ánh sáng tự nhiên",
  ],
  "Street Fashion": [
    "Đường phố thời trang",
    "Khu phố Châu Âu cổ điển",
    "Rooftop thành phố hiện đại",
  ],
};

/* ─── Product Action Presets — values MUST match backend scanner.ts ─── */
export const PRODUCT_ACTION_PRESETS = [
  { value: "Cầm sản phẩm", label: "Cầm sản phẩm" },
  { value: "Đeo sản phẩm", label: "Đeo sản phẩm" },
  { value: "Sử dụng sản phẩm", label: "Sử dụng sản phẩm" },
  { value: "Giới thiệu sản phẩm", label: "Giới thiệu sản phẩm" },
  { value: "Đưa sản phẩm gần camera", label: "Đưa sản phẩm gần camera" },
  { value: "Tạo dáng cùng sản phẩm", label: "Tạo dáng cùng sản phẩm" },
  { value: "Đang mở / dùng thử sản phẩm", label: "Đang mở / dùng thử sản phẩm" },
] as const;

/* ─── Interaction Presets — values MUST match backend scanner.ts ─── */
export const INTERACTION_PRESETS = [
  { value: "Cùng nhìn camera", label: "Cùng nhìn camera" },
  { value: "Đang trò chuyện", label: "Đang trò chuyện" },
  { value: "Cùng review sản phẩm", label: "Cùng review sản phẩm" },
  { value: "Đang đi bộ cùng nhau", label: "Đang đi bộ cùng nhau" },
  { value: "Một người giới thiệu sản phẩm cho người kia", label: "Một người giới thiệu sản phẩm cho người kia" },
  { value: "Đang trao sản phẩm cho nhau", label: "Đang trao sản phẩm cho nhau" },
  { value: "Đang tư vấn sản phẩm", label: "Đang tư vấn sản phẩm" },
  { value: "Tạo dáng lookbook đôi", label: "Tạo dáng lookbook đôi" },
  { value: "CEO và trợ lý", label: "CEO và trợ lý" },
  { value: "Couple fashion", label: "Couple fashion" },
] as const;

/* ─── Camera Angles — free-text, send value as-is ─── */
export const CAMERA_ANGLES = [
  { value: "Cận cảnh", label: "Cận cảnh" },
  { value: "Trung cảnh", label: "Trung cảnh" },
  { value: "Toàn thân", label: "Toàn thân" },
  { value: "Cực cận", label: "Cực cận" },
  { value: "Chân dung", label: "Chân dung" },
  { value: "Ba phần tư", label: "Ba phần tư" },
  { value: "Ngang tầm mắt", label: "Ngang tầm mắt" },
  { value: "Góc cao", label: "Góc cao" },
  { value: "Góc thấp", label: "Góc thấp" },
  { value: "Nghiêng", label: "Nghiêng" },
  { value: "Phong cách sống", label: "Phong cách sống" },
  { value: "Thời trang", label: "Thời trang" },
  { value: "Trình diễn", label: "Trình diễn" },
  { value: "Sản phẩm", label: "Sản phẩm" },
  { value: "Hero", label: "Hero" },
  { value: "Dáng đi", label: "Dáng đi" },
] as const;

/* ─── Aspect Ratios ─── */
export const RATIOS = [
  { value: "1:1", label: "1:1" },
  { value: "9:16", label: "9:16" },
  { value: "4:5", label: "4:5" },
  { value: "16:9", label: "16:9" },
  { value: "3:4", label: "3:4" },
] as const;

export const QUANTITIES = [2, 4, 6, 10] as const;

/* ─── Free-text Examples ─── */
export const PRODUCT_INTERACTION_EXAMPLES = [
  "Tay cầm sản phẩm, đưa về phía trước",
  "Đang xách túi trên vai",
  "Tay chỉ vào sản phẩm",
  "Đang đeo sản phẩm",
  "Cầm sản phẩm trên tay, nhìn vào máy ảnh",
  "Tay vuốt nhẹ sản phẩm",
  "Đang mở nắp sản phẩm",
  "Cầm sản phẩm sát mặt, nhìn vào ống kính",
  "Đang xịt nước hoa lên cổ",
  "Tạo dáng khoe sản phẩm",
];

export const ACTION_EXAMPLES = [
  "Cầm sản phẩm trong lòng bàn tay",
  "Đặt sản phẩm lên bệ",
  "Khoe sản phẩm dưới ánh sáng",
  "Xoay sản phẩm nhiều góc",
  "Kết hợp sản phẩm với phụ kiện",
];

export const INTERACTION_EXAMPLES = [
  "Cả hai cùng nhìn vào sản phẩm",
  "Một người nói, một người lắng nghe",
  "Cùng cười với nhau",
  "Tay trong tay đi dạo",
  "Người này khoác vai người kia",
];
