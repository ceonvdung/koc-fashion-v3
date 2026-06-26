// Database factory - routes between local in-memory DB and Supabase
import { getEnv } from '../lib/env';

let localDb: any = null;

async function getLocalDb() {
  if (!localDb) {
    const { default: db, seedLocalDb } = await import('./local-db');
    localDb = db;
    await seedLocalDb();
  }
  return localDb;
}

export function isLocalDev(): boolean {
  if (getEnv('LOCAL_DEV') === 'true') return true;
  const url = getEnv('SUPABASE_URL') || getEnv('NEXT_PUBLIC_SUPABASE_URL');
  const key = getEnv('SUPABASE_SERVICE_ROLE_KEY') || getEnv('NEXT_PUBLIC_SUPABASE_ANON_KEY');
  return !url || !key;
}

export async function findUserByUsernameOrEmail(login: string) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const usersByEmail = await db.collection('users').where('email', '==', login).limit(1).get();
    if (!usersByEmail.empty) {
      const doc = usersByEmail.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    const usersByUsername = await db.collection('users').where('username', '==', login).limit(1).get();
    if (!usersByUsername.empty) {
      const doc = usersByUsername.docs[0];
      return { id: doc.id, ...doc.data() };
    }
    return null;
  }

  return (await import('./supabase')).findUserByUsernameOrEmail(login);
}

export async function findUserById(id: string) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const doc = await db.collection('users').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }
  return (await import('./supabase')).findUserById(id);
}

export async function createUser(user: any) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const { FieldValue } = await import('./local-db');
    const id = db.collection('users').add({
      ...user,
      status: 'active',
      createdAt: FieldValue.serverTimestamp(),
    });
    const doc = await db.collection('users').doc(id).get();
    return { id: doc.id, ...doc.data() };
  }
  return (await import('./supabase')).createUser(user);
}

export async function updateUser(id: string, updates: Record<string, any>) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const allowedFields = ['name', 'email', 'username', 'status', 'role', 'membershipLevel', 'passwordHash', 'affiliateCode', 'referredBy'];
    const cleanUpdates: Record<string, any> = {};
    for (const [key, value] of Object.entries(updates)) {
      if (value !== undefined && allowedFields.includes(key)) {
        cleanUpdates[key] = value;
      }
    }
    if (Object.keys(cleanUpdates).length === 0) return null;
    await db.collection('users').doc(id).update(cleanUpdates);
    const doc = await db.collection('users').doc(id).get();
    return { id: doc.id, ...doc.data() };
  }
  return (await import('./supabase')).updateUser(id, updates);
}

export async function deleteUser(id: string) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    await db.collection('users').doc(id).delete();
    return true;
  }
  return (await import('./supabase')).deleteUser(id);
}

export async function listUsers() {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const snapshot = await db.collection('users').orderBy('createdAt', 'desc').get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  }
  return (await import('./supabase')).listUsers();
}

export async function logActivity(userId: string, action: string, details?: string | null, ipAddress?: string | null) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const { FieldValue } = await import('./local-db');
    await db.collection('activity_logs').add({
      userId,
      action,
      details: details || null,
      ipAddress: ipAddress || null,
      timestamp: FieldValue.serverTimestamp(),
    });
    return;
  }
  return (await import('./supabase')).logActivity(userId, action, details, ipAddress);
}

export async function getActivityLogs(limit: number = 100) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const snapshot = await db.collection('activity_logs').orderBy('timestamp', 'desc').limit(limit).get();
    return snapshot.docs.map((doc: any) => ({ id: doc.id, ...doc.data() }));
  }
  return (await import('./supabase')).getActivityLogs(limit);
}

export async function createGeneration(data: any) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const { FieldValue } = await import('./local-db');
    const id = db.collection('generations').add({
      ...data,
      images: [],
      createdAt: FieldValue.serverTimestamp(),
    });
    const doc = await db.collection('generations').doc(id).get();
    return { id: doc.id, ...doc.data() };
  }
  return (await import('./supabase')).createGeneration(data);
}

export async function updateGeneration(id: string, updates: Record<string, any>) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    await db.collection('generations').doc(id).update(updates);
    const doc = await db.collection('generations').doc(id).get();
    return { id: doc.id, ...doc.data() };
  }
  return (await import('./supabase')).updateGeneration(id, updates);
}

export async function getDashboardStats() {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const usersSnap = await db.collection('users').get();
    const generationsSnap = await db.collection('generations').get();
    const allUsers = usersSnap.docs.map((d: any) => d.data());
    return {
      totalUsers: usersSnap.size,
      activeUsers: allUsers.filter((u: any) => u.status === 'active').length,
      totalGenerations: generationsSnap.size,
      completedGenerations: generationsSnap.docs.filter((d: any) => d.data().status === 'completed').length,
      level1Users: allUsers.filter((u: any) => u.membershipLevel === 1).length,
      level2Users: allUsers.filter((u: any) => u.membershipLevel === 2).length,
    };
  }
  return (await import('./supabase')).getDashboardStats();
}

export async function getGenerations(page: number = 1, limit: number = 20) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const snapshot = await db.collection('generations').orderBy('createdAt', 'desc').get();
    const start = (page - 1) * limit;
    const docs = snapshot.docs.slice(start, start + limit).map((d: any) => ({ id: d.id, ...d.data() }));
    return { data: docs, total: snapshot.size, page, limit };
  }
  return (await import('./supabase')).getGenerations(page, limit);
}

export async function deleteGeneration(id: string) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    await db.collection('generations').doc(id).delete();
    return true;
  }
  return (await import('./supabase')).deleteGeneration(id);
}

export async function findGenerationById(id: string) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const doc = await db.collection('generations').doc(id).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }
  return (await import('./supabase')).findGenerationById(id);
}

export async function listGenerationsByUser(userId: string, limit: number = 50) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const snapshot = await db.collection('generations').orderBy('createdAt', 'desc').get();
    const docs = snapshot.docs
      .filter((d: any) => d.data().userId === userId)
      .slice(0, limit)
      .map((d: any) => ({ id: d.id, ...d.data() }));
    return { data: docs, total: docs.length };
  }
  return (await import('./supabase')).listGenerationsByUser(userId, limit);
}

export async function addFeedback(data: {
  userId: string;
  generationId: string;
  imageIndex: number;
  action: string;
  faceSimilarity?: number | null;
  outfitSimilarity?: number | null;
  productSimilarity?: number | null;
  sceneMatch?: number | null;
  score?: number;
  metadata?: string | null;
}) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const { FieldValue } = await import('./local-db');
    await db.collection('feedbacks').add({
      ...data,
      metadata: data.metadata || null,
      score: data.score || 0,
      createdAt: FieldValue.serverTimestamp(),
    });
    return;
  }
  return (await import('./supabase')).addFeedback(data);
}

export async function getUserFeedbackStats(userId: string, days: number = 7) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const cutoff = new Date(Date.now() - days * 86400000).toISOString();
    const snapshot = await db.collection('feedbacks').orderBy('createdAt', 'desc').get();
    const all = snapshot.docs
      .filter((d: any) => d.data().userId === userId && d.data().createdAt >= cutoff)
      .map((d: any) => d.data());
    const downloads = all.filter((f: any) => f.action === 'download').length;
    const deletes = all.filter((f: any) => f.action === 'delete').length;
    return {
      total: all.length,
      downloads,
      deletes,
      deleteRate: all.length > 0 ? deletes / all.length : 0,
    };
  }
  return (await import('./supabase')).getUserFeedbackStats(userId, days);
}

// ======== User preferences ========

export async function saveUserPreferences(userId: string, prefs: any) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const existing = await db.collection('user_preferences').doc(userId).get();
    if (existing.exists) {
      await db.collection('user_preferences').doc(userId).update(prefs);
    } else {
      await db.collection('user_preferences').doc(userId).set(prefs);
    }
    const doc = await db.collection('user_preferences').doc(userId).get();
    return { id: doc.id, ...doc.data() };
  }
  return (await import('./supabase')).saveUserPreferences(userId, prefs);
}

export async function getUserPreferences(userId: string) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const doc = await db.collection('user_preferences').doc(userId).get();
    if (!doc.exists) return null;
    return { id: doc.id, ...doc.data() };
  }
  return (await import('./supabase')).getUserPreferences(userId);
}

// ======== Daily Usage / Quota ========

export async function getDailyUsage(userId: string, date: string): Promise<{ count: number } | null> {
  if (isLocalDev()) { return null; }
  return (await import('./supabase')).getDailyUsage(userId, date);
}

export async function incrementDailyUsage(userId: string, date: string): Promise<void> {
  if (isLocalDev()) { return; }
  return (await import('./supabase')).incrementDailyUsage(userId, date);
}

// ======== Affiliate ========

export async function getSettings(key: string): Promise<any> {
  if (isLocalDev()) { return null; }
  return (await import('./supabase')).getSettings(key);
}

export async function upsertSetting(key: string, value: any): Promise<void> {
  if (isLocalDev()) { return; }
  return (await import('./supabase')).upsertSetting(key, value);
}

export async function getAffiliateStats(userId: string): Promise<{ clicks: number; conversions: number; commissions: number }> {
  if (isLocalDev()) { return { clicks: 0, conversions: 0, commissions: 0 }; }
  return (await import('./supabase')).getAffiliateStats(userId);
}

export async function getAffiliateCommissions(userId: string): Promise<any[]> {
  if (isLocalDev()) { return []; }
  return (await import('./supabase')).getAffiliateCommissions(userId);
}

export async function findUserByAffiliateCode(code: string) {
  if (isLocalDev()) {
    const db = await getLocalDb();
    const snapshot = await db.collection('users').where('affiliateCode', '==', code).limit(1).get();
    if (snapshot.empty) return null;
    const doc = snapshot.docs[0];
    return { id: doc.id, ...doc.data() };
  }
  return (await import('./supabase')).findUserByAffiliateCode(code);
}

export async function recordClick(linkId: string, ip?: string, userAgent?: string): Promise<void> {
  if (isLocalDev()) { return; }
  return (await import('./supabase')).recordClick(linkId, ip, userAgent);
}

export async function createCommission(
  userId: string, sourceId: string, sourceName: string, level: number, amount: number
): Promise<void> {
  if (isLocalDev()) { return; }
  return (await import('./supabase')).createCommission(userId, sourceId, sourceName, level, amount);
}

// Auth utilities for local dev
import { sign, verify } from 'hono/jwt';

function getJwtSecret(): string {
  const secret = getEnv('JWT_SECRET');
  if (!secret) throw new Error('JWT_SECRET environment variable is required');
  return secret;
}

export async function createLocalToken(user: any): Promise<string> {
  return sign(
    {
      userId: user.id,
      role: user.role,
      membershipLevel: user.membershipLevel,
      exp: Math.floor(Date.now() / 1000) + 86400 * 7,
    },
    getJwtSecret()
  );
}

export async function verifyLocalToken(token: string): Promise<any> {
  return verify(token, getJwtSecret(), 'HS256');
}
