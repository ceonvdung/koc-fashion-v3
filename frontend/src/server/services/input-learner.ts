export type InputType = 'face_1' | 'face_2' | 'outfit_1' | 'outfit_2' | 'product_1' | 'product_2' | 'scene' | 'face' | 'outfit' | 'product';

export interface UserFeedback {
  quickTags: string[];
  freeText: string;
}

export interface LearnedInput {
  type: InputType;
  base64: string;
  analysis: string;
  verified: boolean;
  userFeedback: UserFeedback | null;
  retryCount: number;
}

const LEARNING_RULES = {
  face: {
    description: 'Khuôn mặt cần giữ 99% cấu trúc',
    learnFields: [
      'Tỷ lệ dài/rộng khuôn mặt — từ chân tóc đến cằm / từ gò má trái sang phải',
      'Đường viền hàm: góc cạnh / bo tròn / vuông, độ sắc nét',
      'Xương gò má: cao/thấp, rõ/mờ, khoảng cách mắt → gò má',
      'Khoảng cách 2 mắt (% chiều rộng khuôn mặt)',
      'Hình dáng mắt: hạnh nhân/tròn/xếch. Đuôi mắt xuôi/ngược',
      'Mí mắt: mí đơn/mí kép, độ rộng nếp mí. Khoảng cách mí → lông mày',
      'Lông mày: dày/mảnh, vòm cao/thấp/thẳng, đuôi dài/ngắn',
      'Mũi: chiều dài & độ cao sống mũi, đầu mũi tròn/nhọn/lớn',
      'Cánh mũi: rộng/hẹp, khoảng cách giữa 2 cánh',
      'Môi trên: dày/trung bình/mỏng, đường cupid rõ/mờ',
      'Môi dưới: dày hơn/bằng môi trên, độ đầy đặn',
      'Khóe miệng: hướng lên/thẳng/xuống. Chiều rộng miệng',
      'Cằm: nhọn/tròn/vuông, hướng ra trước/lùi sau',
      'Tone da (warm/cool/neutral) + độ sáng + kết cấu (mịn/sần/nếp nhăn)',
      'Đặc điểm riêng: nốt ruồi, tàn nhang, sẹo, râu, rãnh cười',
      'Tóc: kiểu, màu, đường chân tóc, tóc mái hay không',
    ],
    outputRule: 'Output PHẢI là CHÍNH XÁC người trong ảnh. Không thay đổi tỷ lệ khuôn mặt, không làm trẻ/già hơn, không xóa đặc điểm riêng. Giữ nguyên kiểu tóc, màu tóc.',
  },
  outfit: {
    description: 'Trang phục cần tái tạo chính xác',
    learnFields: [
      'Loại: mô tả đủ để tái tạo (vd: blazer 2 hàng khuy, quần tây ống đứng...)',
      'Màu sắc: màu chính + phụ + tỷ lệ % mỗi màu',
      'Họa tiết: loại (trơn/sọc/ca rô/hoa), kích thước pattern, màu nền-họa tiết',
      'Chất liệu: loại vải + độ bóng (mờ/satin/bóng) + độ dày + độ rủ',
      'Form dáng: ôm/vừa/rộng. Độ dài tay, thân, ống',
      'Cấu trúc: cổ (tròn/V/thuyền/bẻ), tay (dài/ngắn/lỡ), gấu, đai, xếp ly',
      'Đường may: nổi/chìm, stitch tương phản, kích thước mũi may',
      'Nút/khóa/dây kéo/nơ: vị trí, màu, chất liệu, kích thước',
      'Logo/thêu: vị trí, kích thước, màu sắc',
      'Cách vải rủ: nếp gấp tại khuỷu tay/hông/đầu gối',
    ],
    outputRule: 'Output mặc ĐÚNG bộ trang phục này. Không thay đổi bất kỳ yếu tố nào.',
  },
  product: {
    description: 'Sản phẩm phải hiện diện chính xác nếu có input',
    learnFields: [
      'Loại: túi/giày/đồng hồ/kính/vòng cổ...',
      'Kích thước tuyệt đối (cm) hoặc tương đối so với tay/người',
      'Hình khối 3D: dài x rộng x cao, dáng chữ nhật/tròn/oval/trapezoid',
      'Màu sắc từng bộ phận (thân/quai/đế/viền)',
      'Chất liệu & độ bóng (mờ 10% / satin 50% / bóng 90%)',
      'Logo: vị trí (trước/sau/trong), font, màu, kích thước',
      'Đường viền/chỉ khâu: màu, kiểu, nổi/chìm',
      'Khớp nối: quai-thân, đế-thân, nắp-thân — hình dáng, màu sắc kim loại',
      'Cách cầm/đeo: tay cầm quai trên vai / tay xách / đeo chéo',
    ],
    outputRule: 'Có product → output PHẢI có. Tỷ lệ so với cơ thể GIỐNG input. Không có product → KHÔNG thêm.',
  },
  scene: {
    description: 'Bối cảnh tạo không gian phù hợp',
    learnFields: [
      'Loại không gian: studio / nội thất / ngoài trời / urban / thiên nhiên',
      'Hướng ánh sáng chính: trái/phải/trên/sau/bao quanh',
      'Tỷ lệ ánh sáng chính:phụ:fill (vd: 70:20:10)',
      'Nhiệt độ màu: ấm 3000K / trung tính 5000K / lạnh 6500K',
      'Độ tương phản: cao (hard light) / trung bình / thấp (soft light)',
      'Màu sắc chủ đạo background + tỷ lệ diện tích',
      'Bề mặt nền: phẳng text / tường gạch / vải nhung / cỏ / xi măng',
      'Độ sâu trường ảnh: background mờ nhiều/trung bình/rõ',
      'Bố cục: trung tâm / lệch trái/phải — quy tắc 1/3 / đối xứng',
    ],
    outputRule: 'Giữ nguyên background, ánh sáng, bố cục. Không mix/add element. Không có scene → neutral studio, background trơn, đèn softbox đều 2 bên.',
  },
  camera: {
    description: 'Góc máy ảnh quyết định bố cục khung hình',
    learnFields: [
      'Loại shot: cực cận / cận cảnh / trung cảnh / toàn thân / rộng',
      'Tỷ lệ người trong khung: ___% chiều cao',
      'Góc ngang: mặt đối diện / 45° (3/4) / 90° (profile)',
      'Góc dọc: ngang mắt / cao hơn __° / thấp hơn __°',
      'Khoảng cách: gần 1-2m / trung bình 2-4m / xa 4m+',
      'Hiệu ứng ống kính: góc rộng / chuẩn / tele',
      'Lấy nét: mắt / toàn bộ mặt / toàn bộ cơ thể',
    ],
    outputRule: 'TUÂN THỦ loại shot, góc, khoảng cách, tỷ lệ người trong khung. Nếu camera="Cận cảnh" → output cắt từ ngực lên, không full body.',
  },
};

const ramStore = new Map<string, Map<InputType, LearnedInput>>();
const notesStore = new Map<string, string[]>();

function ensureUserStore(userId: string): Map<InputType, LearnedInput> {
  if (!ramStore.has(userId)) {
    ramStore.set(userId, new Map());
  }
  return ramStore.get(userId)!;
}

function ensureNotesStore(userId: string): string[] {
  if (!notesStore.has(userId)) {
    notesStore.set(userId, []);
  }
  return notesStore.get(userId)!;
}

export function clearUserStore(userId: string): void {
  ramStore.delete(userId);
  notesStore.delete(userId);

}

export function rootType(type: InputType): keyof typeof LEARNING_RULES {
  const root = type.replace(/_\d+$/, '');
  if (root in LEARNING_RULES) return root as keyof typeof LEARNING_RULES;
  return 'face';
}

export function learnInput(userId: string, type: InputType, base64: string, analysis?: string): LearnedInput {
  const store = ensureUserStore(userId);
  if (!analysis) {
    const rules = LEARNING_RULES[rootType(type)];
    analysis = `[${type}] ${rules.description}. Output rule: ${rules.outputRule}`;
  }

  const learned: LearnedInput = {
    type,
    base64,
    analysis,
    verified: true,
    userFeedback: null,
    retryCount: 0,
  };

  store.set(type, learned);

  return learned;
}

export function learnCamera(userId: string, camera: string): void {
  const notes = ensureNotesStore(userId);
  const note = `[CAMERA] ${camera}. ${LEARNING_RULES.camera.outputRule}`;
  const idx = notes.findIndex(n => n.startsWith('[CAMERA]'));
  if (idx >= 0) notes.splice(idx, 1);
  notes.push(note);
}

export function deleteWithFeedback(
  userId: string,
  type: InputType,
  feedback: UserFeedback
): void {
  const store = ensureUserStore(userId);
  const input = store.get(type);
  if (input) {
    const note = createLearningNote(type, feedback);
    const notesStore = ensureNotesStore(userId);
    notesStore.push(note);
  }
  store.delete(type);

}

export function hasFace(userId: string, characterCount: 1 | 2 = 1): boolean {
  const store = ensureUserStore(userId);
  if (characterCount === 2) {
    return store.has('face_1') && store.get('face_1')!.verified
        && store.has('face_2') && store.get('face_2')!.verified;
  }
  return store.has('face_1') && store.get('face_1')!.verified;
}

function createLearningNote(type: InputType, feedback: UserFeedback): string {
  const tags = feedback.quickTags.length > 0
    ? `[${feedback.quickTags.join('][')}]`
    : '';
  const text = feedback.freeText ? ` - ${feedback.freeText}` : '';
  return `${type} ${tags}${text}`.trim();
}


