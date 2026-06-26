export const SCENE_LEVEL_1_OPTIONS = [
  'Indoor Commercial',
  'Outdoor Lifestyle',
  'Luxury Fashion',
  'Beauty Studio',
  'CEO Branding',
  'E-commerce Product',
  'Resort Lifestyle',
  'Street Fashion',
];

export const SCENE_LEVEL_2_MAP: Record<string, string[]> = {
  'Indoor Commercial': ['Studio chụp ảnh', 'Văn phòng CEO', 'Cửa hàng thời trang cao cấp', 'Sảnh tòa nhà văn phòng hạng A'],
  'Outdoor Lifestyle': ['Đường phố thời trang', 'Ban công ánh sáng tự nhiên', 'Rooftop thành phố hiện đại', 'Khu phố Châu Âu cổ điển'],
  'Luxury Fashion': ['Phòng khách luxury', 'Phòng ngủ hiện đại', 'Sảnh khách sạn 5 sao', 'Penthouse sang trọng', 'Showroom ô tô cao cấp'],
  'Beauty Studio': ['Studio chụp ảnh', 'Salon tóc cao cấp', 'Phòng ngủ hiện đại'],
  'CEO Branding': ['Văn phòng CEO', 'Sảnh tòa nhà văn phòng hạng A', 'Phòng khách luxury'],
  'E-commerce Product': ['Studio chụp ảnh', 'Cửa hàng thời trang cao cấp', 'Bàn làm việc tối giản'],
  'Resort Lifestyle': ['Hồ bơi resort 5 sao', 'Bãi biển luxury', 'Penthouse sang trọng', 'Ban công ánh sáng tự nhiên'],
  'Street Fashion': ['Đường phố thời trang', 'Khu phố Châu Âu cổ điển', 'Rooftop thành phố hiện đại'],
};

export const SCENE_DESCRIPTIONS: Record<string, string> = {
  'Phòng khách luxury': 'Phòng khách rộng rãi, sofa da cao cấp, bàn marble, đèn chùm pha lê, rèm cửa sang trọng, ánh sáng vàng ấm.',
  'Phòng ngủ hiện đại': 'Phòng ngủ tối giản với giường lớn bọc nệm trắng, cửa sổ kính lớn đón ánh sáng tự nhiên, nội thất gỗ tự nhiên.',
  'Đường phố thời trang': 'Phố đi bộ nhộn nhịp, cửa hàng thời trang hai bên đường, ánh sáng tự nhiên, không khí năng động, trẻ trung.',
  'Cửa hàng thời trang cao cấp': 'Cửa hàng thiết kế tối giản, đèn spotlight, kệ trưng bày tinh tế, sàn đá bóng loáng.',
  'Studio chụp ảnh': 'Studio chụp ảnh chuyên nghiệp với backdrop trắng/đen, đèn studio softbox, không gian sạch sẽ, tối giản.',
  'Salon tóc cao cấp': 'Salon thiết kế hiện đại, gương lớn, ghế salon da sang trọng, ánh sáng trắng chuyên nghiệp.',
  'Bàn làm việc tối giản': 'Bàn làm việc gỗ sáng màu, không gian tối giản, ánh sáng trắng, focus vào sản phẩm trên bàn.',
  'Văn phòng CEO': 'Văn phòng rộng, bàn làm việc gỗ óc chó, ghế Executive, tủ sách, cửa sổ kính view thành phố.',
  'Sảnh khách sạn 5 sao': 'Sảnh khách sạn hoành tráng, trần cao, đèn chùm lớn, ghế sofa đôi, thảm trải sàn sang trọng.',
  'Ban công ánh sáng tự nhiên': 'Ban công rộng với cây xanh, bàn cafe nhỏ, ánh sáng tự nhiên dịu nhẹ buổi sáng, không gian thoáng đãng.',
  'Rooftop thành phố hiện đại': 'Sân thượng view toàn cảnh thành phố, hồ bơi vô cực, ghế dài, ánh sáng hoàng hôn vàng cam.',
  'Khu phố Châu Âu cổ điển': 'Phố cổ châu Âu với kiến trúc đá cổ, đèn đường cổ điển, quán cafe vỉa hè, không khí lãng mạn.',
  'Hồ bơi resort 5 sao': 'Hồ bơi vô cực xanh ngọc, ghế tắm nắng trắng, dù che, cây cọ, bầu trời xanh.',
  'Bãi biển luxury': 'Bãi biển cát trắng mịn, nước biển xanh trong, ghế sunbed, dù che, resort 5 sao phía sau.',
  'Showroom ô tô cao cấp': 'Showroom xe sang, nền sáng bóng, đèn spotlight, xe trưng bày, không gian rộng, hiện đại.',
  'Penthouse sang trọng': 'Penthouse tầng cao, nội thất thiết kế, cửa kính panorama, hồ bơi riêng, view 360 độ thành phố.',
  'Sảnh tòa nhà văn phòng hạng A': 'Sảnh văn phòng hạng A, trần cao, quầy lễ tân marble, ghế chờ da, cây xanh, ánh sáng tự nhiên.',
};

export const PRODUCT_ACTION_PRESETS = [
  'Cầm sản phẩm',
  'Đeo sản phẩm',
  'Sử dụng sản phẩm',
  'Giới thiệu sản phẩm',
  'Đưa sản phẩm gần camera',
  'Tạo dáng cùng sản phẩm',
  'Đang mở / dùng thử sản phẩm',
];

export const INTERACTION_LEVEL_1_PRESETS = [
  'Cùng nhìn camera',
  'Đang trò chuyện',
  'Cùng review sản phẩm',
  'Đang đi bộ cùng nhau',
  'Một người giới thiệu sản phẩm cho người kia',
  'Đang trao sản phẩm cho nhau',
  'Đang tư vấn sản phẩm',
  'Tạo dáng lookbook đôi',
  'CEO và trợ lý',
  'Couple fashion',
];

export const PRODUCT_ACTION_BY_TYPE: Record<string, string[]> = {
  cosmetic: ['Cầm trước mặt, đang thoa', 'Đưa sát camera', 'Cầm trong lòng bàn tay'],
  perfume: ['Đang xịt', 'Cầm gần cổ', 'Cầm gần mặt, logo hướng camera'],
  handbag: ['Đeo vai', 'Cầm tay', 'Tạo dáng bước đi cùng túi'],
  watch: ['Xem giờ', 'Đưa cổ tay lên camera', 'Chạm nhẹ vào mặt đồng hồ'],
  glasses: ['Đeo kính', 'Chỉnh kính', 'Cầm kính gần mặt'],
  shoes: ['Đứng tạo dáng', 'Bước đi', 'Đặt sản phẩm cạnh chân'],
  jewelry: ['Chạm nhẹ vào trang sức', 'Close-up chi tiết', 'Tay đưa lên gần mặt'],
  skincare: ['Cầm chai/sản phẩm trước mặt', 'Đang thoa lên tay', 'Đưa sát camera'],
  fashion_item: ['Cầm trên tay', 'Tạo dáng cùng item', 'Giơ lên ngang tầm mắt'],
  unknown: ['Cầm sản phẩm tự nhiên', 'Giới thiệu sản phẩm', 'Tạo dáng cùng sản phẩm'],
};


