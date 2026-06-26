export function getVariantText(index: number, characterCount: 1 | 2 = 1): string {
  const pool1 = [
    'Full body shot. Show complete pose from head to toe.',
    'Medium shot. Focus on upper body, face, and product.',
    'Walking or action pose. Natural movement, dynamic feel.',
    'Seated or leaning pose. Relaxed, confident composition.',
    'Three-quarter angle. Slight turn away from camera.',
    'Fashion detail shot. Close-up on product and outfit details.',
    'Dynamic pose. Hair movement, fabric flow, energy.',
    'Profile or side angle. Different perspective from previous.',
    'Direct eye contact. Strong, confident, engaging pose.',
    'Editorial pose. High fashion magazine style composition.',
  ];

  const pool2 = [
    'Full body shot. Both characters fully visible.',
    'Medium shot. Focus on upper body, faces, and products.',
    'Walking or action pose. Natural movement together.',
    'Seated arrangement. Relaxed, confident composition.',
    'Three-quarter angle. Both faces clearly visible.',
    'Interaction moment dynamic.',
    'Dynamic duo pose. Energy and movement.',
    'Editorial pose. High fashion duo composition.',
    'Side-by-side. Both characters posing confidently.',
    'Talk & show. Both chatting naturally.',
    'Back-to-back pose. Strong editorial.',
    'Walking toward camera together.',
  ];

  const pool = characterCount === 1 ? pool1 : pool2;
  return index < pool.length ? pool[index] : `Pose variation ${index + 1}.`;
}
