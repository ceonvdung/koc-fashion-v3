import { Hono } from 'hono';
import { z } from 'zod';
import { zValidator } from '@hono/zod-validator';
import { authenticate, requireAdmin } from '../middleware/auth';
import {
  listUsers, findUserById, createUser, updateUser, deleteUser,
  getActivityLogs, logActivity, getDashboardStats, isLocalDev,
  getGenerations, deleteGeneration, findGenerationById, updateGeneration,
  getSettings, upsertSetting,
} from '../db';
import { hashPassword } from './auth';

const router = new Hono<{
  Variables: { userId: string; userRole: string; userMembershipLevel: number };
}>();

router.use('*', authenticate, requireAdmin);

router.get('/dashboard', async (c) => {
  const stats = await getDashboardStats();
  return c.json(stats);
});

router.get('/users', async (c) => {
  const users = await listUsers();
  return c.json(users);
});

const createUserSchema = z.object({
  name: z.string().min(1, 'Họ tên không được để trống'),
  email: z.string().email('Email không hợp lệ'),
  username: z.string().min(3, 'Username phải có ít nhất 3 ký tự'),
  password: z.string().min(6, 'Mật khẩu phải có ít nhất 6 ký tự'),
  role: z.enum(['user', 'super_admin']).default('user'),
  membershipLevel: z.number().int().min(1).max(2).default(1),
});

router.post('/users', zValidator('json', createUserSchema), async (c) => {
  const data = c.req.valid('json');
  const passwordHash = await hashPassword(data.password);
  const affiliateCode = `KOC${Date.now().toString(36).toUpperCase()}`;

  const user = await createUser({
    name: data.name,
    email: data.email,
    username: data.username,
    passwordHash,
    role: data.role,
    membershipLevel: data.membershipLevel,
    affiliateCode,
  });

  await logActivity(c.get('userId'), 'create_user', `Created user: ${data.username}`);

  return c.json({
    id: user.id,
    name: data.name,
    email: data.email,
    username: data.username,
    role: data.role,
    membershipLevel: data.membershipLevel,
    affiliateCode,
  }, 201);
});

const updateUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  username: z.string().min(3).optional(),
  password: z.string().min(6).optional(),
  status: z.enum(['active', 'locked']).optional(),
  role: z.enum(['user', 'super_admin']).optional(),
  membershipLevel: z.number().int().min(1).max(2).optional(),
});

router.put('/users/:id', zValidator('json', updateUserSchema), async (c) => {
  const id = c.req.param('id');
  const data = c.req.valid('json');

  const existing = await findUserById(id);
  if (!existing) {
    return c.json({ message: 'User not found' }, 404);
  }

  const updates: Record<string, any> = {};
  if (data.name) updates.name = data.name;
  if (data.email) updates.email = data.email;
  if (data.username) updates.username = data.username;
  if (data.status) updates.status = data.status;
  if (data.role) updates.role = data.role;
  if (data.membershipLevel) updates.membershipLevel = data.membershipLevel;
  if (data.password) updates.passwordHash = await hashPassword(data.password);

  // Update database
  const updated = await updateUser(id, updates);

  await logActivity(c.get('userId'), 'update_user', `Updated user: ${updated?.username}`);

  return c.json(updated);
});

router.delete('/users/:id', async (c) => {
  const id = c.req.param('id');
  const existing = await findUserById(id);
  if (!existing) {
    return c.json({ message: 'User not found' }, 404);
  }
  if (existing.role === 'super_admin') {
    return c.json({ message: 'Cannot delete super admin' }, 403);
  }

  await deleteUser(id);

  await logActivity(c.get('userId'), 'delete_user', `Deleted user: ${existing.username}`);
  return c.json({ message: 'User deleted successfully' });
});

router.post('/users/:id/reset-password', async (c) => {
  const id = c.req.param('id');
  const existing = await findUserById(id);
  if (!existing) {
    return c.json({ message: 'User not found' }, 404);
  }

  const newPassword = 'Koc@' + Math.random().toString(36).slice(-6).toUpperCase();
  const passwordHash = await hashPassword(newPassword);
  await updateUser(id, { passwordHash });

  await logActivity(c.get('userId'), 'reset_password', `Reset password for user: ${existing.username}`);
  return c.json({ message: 'Password reset successfully', newPassword });
});

router.get('/logs', async (c) => {
  const limit = parseInt(c.req.query('limit') || '100');
  const logs = await getActivityLogs(limit);
  return c.json(logs);
});

router.get('/generations', async (c) => {
  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const result = await getGenerations(page, limit);
  return c.json(result);
});

router.delete('/generations/:id', async (c) => {
  try {
    const id = c.req.param('id');
    const gen = await findGenerationById(id);
    if (!gen) return c.json({ message: 'Generation not found' }, 404);
    await deleteGeneration(id);
    await logActivity(c.get('userId'), 'delete_generation', `Deleted generation #${id}`);
    return c.json({ message: 'Generation deleted successfully' });
  } catch (err) {
    console.error('Delete generation error:', err);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

router.delete('/generations/:id/images/:imageIndex', async (c) => {
  try {
    const id = c.req.param('id');
    const imageIndexStr = c.req.param('imageIndex');
    const imageIndex = parseInt(imageIndexStr, 10);

    const generation = await findGenerationById(id);
    if (!generation) return c.json({ message: 'Generation not found' }, 404);

    const images = typeof generation.images === 'string'
      ? JSON.parse(generation.images)
      : (generation.images || []) as string[];

    if (imageIndex < 0 || imageIndex >= images.length) {
      return c.json({ message: 'Invalid image index' }, 400);
    }

    images.splice(imageIndex, 1);
    await updateGeneration(id, { images });
    await logActivity(c.get('userId'), 'delete_image', `Admin deleted image #${imageIndex} from generation #${id}`);

    return c.json({ message: 'Image deleted', images });
  } catch (err) {
    console.error('Delete image error:', err);
    return c.json({ message: 'Internal server error' }, 500);
  }
});

const affiliateSettingsSchema = z.object({
  directCommissionPercent: z.number().min(0).max(100).optional(),
  indirectCommissionPercent: z.number().min(0).max(100).optional(),
});

router.get('/affiliate/settings', async (c) => {
  const direct = await getSettings('affiliate_direct_percent');
  const indirect = await getSettings('affiliate_indirect_percent');
  return c.json({
    directCommissionPercent: direct ? parseInt(direct.value) : 10,
    indirectCommissionPercent: indirect ? parseInt(indirect.value) : 2,
  });
});

router.get('/settings/quota', async (c) => {
  const level1 = await getSettings('level1_daily_quota');
  const level2 = await getSettings('level2_daily_quota');
  return c.json({
    level1DailyQuota: level1 ? parseInt(level1.value) : -1,
    level2DailyQuota: level2 ? parseInt(level2.value) : -1,
  });
});

router.put('/settings/quota', zValidator('json', z.object({
  level1DailyQuota: z.number().int().min(-1).optional(),
  level2DailyQuota: z.number().int().min(-1).optional(),
})), async (c) => {
  const data = c.req.valid('json');
  if (data.level1DailyQuota !== undefined) {
    await upsertSetting('level1_daily_quota', String(data.level1DailyQuota));
  }
  if (data.level2DailyQuota !== undefined) {
    await upsertSetting('level2_daily_quota', String(data.level2DailyQuota));
  }
  await logActivity(c.get('userId'), 'update_quota', `Updated daily quotas`);
  return c.json({ ...data, updatedAt: new Date().toISOString() });
});

router.put('/affiliate/settings', zValidator('json', affiliateSettingsSchema), async (c) => {
  const data = c.req.valid('json');
  if (data.directCommissionPercent !== undefined) {
    await upsertSetting('affiliate_direct_percent', String(data.directCommissionPercent));
  }
  if (data.indirectCommissionPercent !== undefined) {
    await upsertSetting('affiliate_indirect_percent', String(data.indirectCommissionPercent));
  }
  return c.json({ ...data, updatedAt: new Date().toISOString() });
});

export default router;
