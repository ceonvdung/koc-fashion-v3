import { createClient } from '@supabase/supabase-js';
import { getEnv } from '../lib/env';

let _client: any = null;

export function getSupabase() {
  if (!_client) {
    const url = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
    const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
    if (!url || !key) {
      throw new Error('SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY must be set');
    }
    _client = createClient(url, key);
  }
  return _client;
}

export async function findUserByUsernameOrEmail(login: string) {
  const supabase = getSupabase();
  const { data: byEmail } = await supabase.from('users').select('*').eq('email', login).limit(1);
  if (byEmail && byEmail.length > 0) return byEmail[0];
  const { data: byUsername } = await supabase.from('users').select('*').eq('username', login).limit(1);
  if (byUsername && byUsername.length > 0) return byUsername[0];
  return null;
}

export async function findUserById(id: string) {
  const supabase = getSupabase();
  const { data } = await supabase.from('users').select('*').eq('id', id).limit(1);
  return data && data.length > 0 ? data[0] : null;
}

export async function createUser(user: any) {
  const supabase = getSupabase();
  const { data } = await supabase.from('users').insert({
    ...user,
    status: 'active',
    createdAt: new Date().toISOString(),
  }).select().single();
  return data;
}

export async function updateUser(id: string, updates: Record<string, any>) {
  const allowedFields = ['name', 'email', 'username', 'status', 'role', 'membershipLevel', 'passwordHash', 'affiliateCode', 'referredBy'];
  const cleanUpdates: Record<string, any> = {};
  for (const [key, value] of Object.entries(updates)) {
    if (value !== undefined && allowedFields.includes(key)) cleanUpdates[key] = value;
  }
  if (Object.keys(cleanUpdates).length === 0) return null;
  const supabase = getSupabase();
  const { data } = await supabase.from('users').update(cleanUpdates).eq('id', id).select().single();
  return data;
}

export async function deleteUser(id: string) {
  const supabase = getSupabase();
  await supabase.from('users').delete().eq('id', id);
  return true;
}

export async function listUsers() {
  const supabase = getSupabase();
  const { data } = await supabase.from('users').select('*').order('createdAt', { ascending: false });
  return data || [];
}

export async function logActivity(userId: string, action: string, details?: string | null, ipAddress?: string | null) {
  const supabase = getSupabase();
  await supabase.from('activity_logs').insert({
    userId, action,
    details: details || null,
    ipAddress: ipAddress || null,
    timestamp: new Date().toISOString(),
  });
}

export async function getActivityLogs(limit: number = 100) {
  const supabase = getSupabase();
  const { data } = await supabase.from('activity_logs').select('*').order('timestamp', { ascending: false }).limit(limit);
  return (data || []).map((log: any) => ({
    ...log,
    timestamp: log.timestamp,
  }));
}

export async function createGeneration(data: any) {
  const supabase = getSupabase();
  const { data: doc } =   await supabase.from('generations').insert({
    userId: data.userId,
    prompt: data.prompt,
    scene: data.scene || null,
    camera: data.camera || null,
    ratio: data.ratio,
    quantity: data.quantity,
    characterCount: data.characterCount,
    images: data.images || [],
    status: data.status,
    metadata: data.metadata || null,
    createdAt: new Date().toISOString(),
  }).select().single();
  return doc;
}

export async function updateGeneration(id: string, updates: Record<string, any>) {
  const supabase = getSupabase();
  const { data } = await supabase.from('generations').update(updates).eq('id', id).select().single();
  return data;
}

export async function getDashboardStats() {
  const supabase = getSupabase();
  const { count: totalUsers } = await supabase.from('users').select('*', { count: 'exact', head: true });
  const { count: activeUsers } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('status', 'active');
  const { count: totalGenerations } = await supabase.from('generations').select('*', { count: 'exact', head: true });
  const { count: completedGenerations } = await supabase.from('generations').select('*', { count: 'exact', head: true }).eq('status', 'completed');
  const { count: level1Users } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('membershipLevel', 1);
  const { count: level2Users } = await supabase.from('users').select('*', { count: 'exact', head: true }).eq('membershipLevel', 2);
  return {
    totalUsers: totalUsers || 0, activeUsers: activeUsers || 0,
    totalGenerations: totalGenerations || 0, completedGenerations: completedGenerations || 0,
    level1Users: level1Users || 0, level2Users: level2Users || 0,
  };
}

export async function getGenerations(page: number = 1, limit: number = 20) {
  const supabase = getSupabase();
  const from = (page - 1) * limit;
  const to = from + limit - 1;
  const { data, count } = await supabase.from('generations').select('*', { count: 'exact' }).order('createdAt', { ascending: false }).range(from, to);
  return { data: data || [], total: count || 0, page, limit };
}

export async function deleteGeneration(id: string) {
  const supabase = getSupabase();
  await supabase.from('generations').delete().eq('id', id);
  return true;
}

export async function findGenerationById(id: string) {
  const supabase = getSupabase();
  const { data } = await supabase.from('generations').select('*').eq('id', id).limit(1);
  return data && data.length > 0 ? data[0] : null;
}

export async function listGenerationsByUser(userId: string, limit: number = 50) {
  const supabase = getSupabase();
  const { data } = await supabase.from('generations').select('*').eq('userId', userId).order('createdAt', { ascending: false }).limit(limit);
  return { data: data || [], total: (data || []).length };
}

export async function addFeedback(data: any) {
  const supabase = getSupabase();
  await supabase.from('feedbacks').insert({
    ...data,
    metadata: data.metadata || null,
    score: data.score || 0,
    createdAt: new Date().toISOString(),
  });
}

export async function getUserFeedbackStats(userId: string, days: number = 7) {
  const supabase = getSupabase();
  const cutoff = new Date(Date.now() - days * 86400000).toISOString();
  const { data } = await supabase.from('feedbacks').select('*').eq('userId', userId).gte('createdAt', cutoff);
  const all = data || [];
  return {
    total: all.length,
    downloads: all.filter((f: any) => f.action === 'download').length,
    deletes: all.filter((f: any) => f.action === 'delete').length,
    deleteRate: all.length > 0 ? all.filter((f: any) => f.action === 'delete').length / all.length : 0,
  };
}

export async function saveUserPreferences(userId: string, prefs: any) {
  const supabase = getSupabase();
  await supabase.from('user_preferences').upsert({ userId, prefs, updatedAt: new Date().toISOString() });
}

export async function getUserPreferences(userId: string) {
  const supabase = getSupabase();
  const { data } = await supabase.from('user_preferences').select('*').eq('userId', userId).limit(1);
  if (data && data.length > 0) {
    return { userId: data[0].userId, ...data[0].prefs };
  }
  return null;
}

// ======== Daily Usage / Quota ========

export async function getDailyUsage(userId: string, date: string): Promise<{ count: number } | null> {
  const supabase = getSupabase();
  const { data } = await supabase.from('daily_usage').select('count').eq('userId', userId).eq('date', date).limit(1);
  return data && data.length > 0 ? data[0] : null;
}

export async function incrementDailyUsage(userId: string, date: string): Promise<void> {
  const supabase = getSupabase();
  const existing = await getDailyUsage(userId, date);
  if (existing) {
    await supabase.from('daily_usage').update({ count: existing.count + 1 }).eq('userId', userId).eq('date', date);
  } else {
    await supabase.from('daily_usage').insert({ userId, date, count: 1 });
  }
}

// ======== Affiliate ========

export async function getSettings(key: string): Promise<any> {
  const supabase = getSupabase();
  const { data } = await supabase.from('app_settings').select('*').eq('key', key).limit(1);
  return data && data.length > 0 ? data[0] : null;
}

export async function upsertSetting(key: string, value: any): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('app_settings').upsert({ key, value, updatedAt: new Date().toISOString() });
}

export async function getAffiliateStats(userId: string): Promise<{ clicks: number; conversions: number; commissions: number }> {
  const supabase = getSupabase();

  const { count: clicks } = await supabase
    .from('affiliate_clicks')
    .select('*', { count: 'exact', head: true })
    .eq('linkId', userId);

  const { data: user } = await supabase
    .from('users')
    .select('affiliateCode')
    .eq('id', userId)
    .limit(1);

  let conversions = 0;
  if (user && user.length > 0 && user[0].affiliateCode) {
    const { count } = await supabase
      .from('users')
      .select('*', { count: 'exact', head: true })
      .eq('referredBy', userId);
    conversions = count || 0;
  }

  const { data: commissions } = await supabase
    .from('affiliate_commissions')
    .select('amount')
    .eq('userId', userId);

  const totalCommissions = (commissions || []).reduce((sum: number, c: any) => sum + (parseFloat(c.amount) || 0), 0);

  return { clicks: clicks || 0, conversions, commissions: totalCommissions };
}

export async function getAffiliateCommissions(userId: string): Promise<any[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('affiliate_commissions')
    .select('*')
    .eq('userId', userId)
    .order('createdAt', { ascending: false });
  return data || [];
}

export async function findUserByAffiliateCode(code: string): Promise<any> {
  const supabase = getSupabase();
  const { data } = await supabase.from('users').select('*').eq('affiliateCode', code).limit(1);
  return data && data.length > 0 ? data[0] : null;
}

export async function recordClick(linkId: string, ip?: string, userAgent?: string): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('affiliate_clicks').insert({
    linkId,
    ip: ip || null,
    userAgent: userAgent || null,
    createdAt: new Date().toISOString(),
  });
}

export async function getFavorites(userId: string): Promise<any[]> {
  const supabase = getSupabase();
  const { data } = await supabase
    .from('feedbacks')
    .select('*')
    .eq('userId', userId)
    .eq('action', 'favorite')
    .order('createdAt', { ascending: false });
  return data || [];
}

export async function removeFavorite(userId: string, generationId: string, imageIndex: number): Promise<void> {
  const supabase = getSupabase();
  await supabase
    .from('feedbacks')
    .delete()
    .eq('userId', userId)
    .eq('generationId', generationId)
    .eq('imageIndex', imageIndex)
    .eq('action', 'favorite');
}

export async function createCommission(
  userId: string,
  sourceId: string,
  sourceName: string,
  level: number,
  amount: number
): Promise<void> {
  const supabase = getSupabase();
  await supabase.from('affiliate_commissions').insert({
    userId,
    sourceId,
    sourceName,
    level,
    amount,
    createdAt: new Date().toISOString(),
  });
}
