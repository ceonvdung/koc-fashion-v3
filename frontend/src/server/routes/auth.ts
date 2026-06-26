import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { findUserByUsernameOrEmail, findUserById, updateUser, logActivity, isLocalDev, createLocalToken, findUserByAffiliateCode, verifyLocalToken } from '../db';
import { authenticate, rateLimitLogin } from '../middleware/auth';
import bcrypt from 'bcryptjs';

const router = new Hono<{
  Variables: { userId: string; userRole: string; userMembershipLevel: number };
}>();

const loginSchema = z.object({
  login: z.string().min(1, 'Email hoặc Username không được để trống'),
  password: z.string().min(1, 'Mật khẩu không được để trống'),
  ref: z.string().optional(),
});

export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

async function seedAdmin(): Promise<void> {
  // Admin seeding is handled by local-db for local dev
  // For production, create admin user manually or via admin panel

}

router.post('/login', rateLimitLogin(), zValidator('json', loginSchema), async (c) => {
  const { login: loginVal, password, ref } = c.req.valid('json');

  const user = await findUserByUsernameOrEmail(loginVal);
  if (!user) {
    return c.json({ message: 'Sai thông tin đăng nhập' }, 401);
  }

  if (user.status === 'locked') {
    return c.json({ message: 'Tài khoản đã bị khóa' }, 403);
  }

  const passwordMatch = await verifyPassword(password, user.passwordHash);
  if (!passwordMatch) {
    return c.json({ message: 'Sai thông tin đăng nhập' }, 401);
  }

  if (ref && !user.referredBy) {
    const referrer = await findUserByAffiliateCode(ref);
    if (referrer) {
      await updateUser(user.id, { referredBy: referrer.id }).catch((err) => {
        console.warn('Failed to update referrer for user:', err);
      });
    }
  }

  const token = await createLocalToken(user);

  const isProduction = process.env.NODE_ENV === 'production';
  const cookieParts = [
    `koc_token=${token}`,
    'HttpOnly',
    isProduction ? 'Secure' : '',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=604800'
  ].filter(Boolean);
  c.header('Set-Cookie', cookieParts.join('; '));

  await logActivity(user.id, 'login');

  return c.json({
    user: {
      id: user.id,
      name: user.name,
      email: user.email,
      username: user.username,
      role: user.role,
      membershipLevel: user.membershipLevel,
      affiliateCode: user.affiliateCode,
    },
  });
});

router.get('/me', authenticate, async (c) => {
  const userId = c.get('userId');
  const user = await findUserById(userId);

  if (!user) {
    return c.json({ message: 'User not found' }, 404);
  }

  return c.json({
    id: user.id,
    name: user.name,
    email: user.email,
    username: user.username,
    role: user.role,
    status: user.status,
    membershipLevel: user.membershipLevel,
    affiliateCode: user.affiliateCode,
    createdAt: user.createdAt?.toDate?.()?.toISOString() || user.createdAt,
  });
});

const changePasswordSchema = z.object({
  currentPassword: z.string().min(1),
  newPassword: z.string().min(6, 'Mật khẩu mới phải có ít nhất 6 ký tự'),
});

router.post('/change-password', authenticate, zValidator('json', changePasswordSchema), async (c) => {
  const { currentPassword, newPassword } = c.req.valid('json');
  const userId = c.get('userId');

  const user = await findUserById(userId);
  if (!user) {
    return c.json({ message: 'User not found' }, 404);
  }

  const match = await verifyPassword(currentPassword, user.passwordHash);
  if (!match) {
    return c.json({ message: 'Mật khẩu hiện tại không đúng' }, 400);
  }

  await updateUser(userId, { passwordHash: await hashPassword(newPassword) });
  await logActivity(userId, 'change_password');

  return c.json({ message: 'Đổi mật khẩu thành công' });
});

router.post('/seed', async (c) => {
  try {
    await seedAdmin();
    return c.json({ message: 'Database seeded successfully' });
  } catch (err: any) {
    console.error('Seed error:', err);
    return c.json({ message: 'Seed failed', error: err.message }, 500);
  }
});

router.post('/logout', async (c) => {
  const isProduction = process.env.NODE_ENV === 'production';
  const cookieParts = [
    'koc_token=',
    'HttpOnly',
    isProduction ? 'Secure' : '',
    'SameSite=Lax',
    'Path=/',
    'Max-Age=0'
  ].filter(Boolean);
  c.header('Set-Cookie', cookieParts.join('; '));
  return c.json({ message: 'Logged out successfully' });
});

export default router;
export { seedAdmin };
