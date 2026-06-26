// In-memory database for local development
// Only used when running in local dev mode

interface StoredDocument {
  id: string;
  data: Record<string, any>;
}

class MemoryCollection {
  private docs: Map<string, StoredDocument> = new Map();
  private counter = 0;

  add(data: Record<string, any>): string {
    this.counter++;
    const id = `local_${this.counter}_${Date.now()}`;
    this.docs.set(id, { id, data: { ...data, createdAt: new Date().toISOString() } });
    return id;
  }

  doc(id: string) {
    return {
      get: async () => {
        const doc = this.docs.get(id);
        return doc ? { id: doc.id, data: () => doc.data, exists: true } : { exists: false, data: () => null };
      },
      set: async (data: Record<string, any>, options?: { merge?: boolean }) => {
        const existing = this.docs.get(id);
        if (existing && options?.merge) {
          this.docs.set(id, { id, data: { ...existing.data, ...data } });
        } else {
          this.docs.set(id, { id, data: { ...data, createdAt: data.createdAt || new Date().toISOString() } });
        }
      },
      update: async (data: Record<string, any>) => {
        const existing = this.docs.get(id);
        if (existing) {
          this.docs.set(id, { id, data: { ...existing.data, ...data } });
        }
      },
      delete: async () => { this.docs.delete(id); },
    };
  }

  where(field: string, op: string, value: any) {
    const filtered = Array.from(this.docs.values())
      .filter(doc => {
        if (op === '==') return doc.data[field] === value;
        if (op === '>') return doc.data[field] > value;
        if (op === '<') return doc.data[field] < value;
        if (op === '>=') return doc.data[field] >= value;
        if (op === '<=') return doc.data[field] <= value;
        if (op === 'array-contains') return Array.isArray(doc.data[field]) && doc.data[field].includes(value);
        return true;
      });

    return {
      orderBy: (_field: string, _dir?: string) => ({
        limit: (_n: number) => ({
          get: async () => ({
            docs: filtered.slice(0, _n).map(d => ({
              id: d.id,
              data: () => d.data,
              ref: { deleteStorage: async () => { this.docs.delete(d.id); } },
            })),
            size: filtered.slice(0, _n).length,
            empty: filtered.slice(0, _n).length === 0,
          }),
        }),
        get: async () => ({
          docs: filtered.map(d => ({
            id: d.id,
            data: () => d.data,
            ref: { deleteStorage: async () => { this.docs.delete(d.id); } },
          })),
          size: filtered.length,
          empty: filtered.length === 0,
        }),
      }),
      limit: (_n: number) => ({
        get: async () => ({
          docs: filtered.slice(0, _n).map(d => ({
            id: d.id,
            data: () => d.data,
            ref: { deleteStorage: async () => { this.docs.delete(d.id); } },
          })),
          size: filtered.slice(0, _n).length,
          empty: filtered.slice(0, _n).length === 0,
        }),
      }),
      get: async () => ({
        docs: filtered.map(d => ({
          id: d.id,
          data: () => d.data,
          ref: { deleteStorage: async () => { this.docs.delete(d.id); } },
        })),
        size: filtered.length,
        empty: filtered.length === 0,
      }),
      count: () => ({
        get: async () => ({ data: () => ({ count: filtered.length }) }),
      }),
    };
  }

  orderBy(field: string, dir?: string) {
    const sorted = Array.from(this.docs.values())
      .sort((a, b) => {
        const av = a.data[field] || '';
        const bv = b.data[field] || '';
        if (dir === 'desc') return av < bv ? 1 : -1;
        return av > bv ? 1 : -1;
      });

    return {
      get: async () => ({
        docs: sorted.map(d => ({
          id: d.id,
          data: () => d.data,
          ref: { delete: async () => { this.docs.delete(d.id); } },
        })),
        size: sorted.length,
        empty: sorted.length === 0,
      }),
      limit: (n: number) => ({
        get: async () => ({
          docs: sorted.slice(0, n).map(d => ({
            id: d.id,
            data: () => d.data,
            ref: { delete: async () => { this.docs.delete(d.id); } },
          })),
          size: sorted.slice(0, n).length,
          empty: sorted.slice(0, n).length === 0,
        }),
      }),
    };
  }

  count() {
    return { get: async () => ({ data: () => ({ count: this.docs.size }) }) };
  }

  get isEmpty() { return this.docs.size === 0; }
  get size() { return this.docs.size; }

  get() {
    const all = Array.from(this.docs.values());
    return {
      docs: all.map(d => ({
        id: d.id,
        data: () => d.data,
        ref: { delete: async () => { this.docs.delete(d.id); } },
      })),
      size: all.length,
      empty: all.length === 0,
    };
  }
}

class LocalDB {
  private collections: Map<string, MemoryCollection> = new Map();

  collection(name: string): MemoryCollection {
    if (!this.collections.has(name)) {
      this.collections.set(name, new MemoryCollection());
    }
    return this.collections.get(name)!;
  }

  doc(path: string) {
    const parts = path.split('/');
    const col = this.collection(parts[0]);
    return col.doc(parts[1]);
  }

  getAll(ids: string[]) {
    return Promise.all(ids.map(id => this.doc(id)));
  }
}

const db = new LocalDB();

// Helper to match the FieldValue interface
export const FieldValue = {
  serverTimestamp: () => new Date().toISOString(),
  delete: () => '__DELETE__',
};

export async function seedLocalDb() {
  const usersCol = db.collection('users');
  if (usersCol.isEmpty) {
    const bcrypt = await import('bcryptjs');
    const adminPassword = process.env.ADMIN_PASSWORD || 'admin';
    const passwordHash = await bcrypt.hash(adminPassword, 12);

    await usersCol.doc('super-admin').set({
      name: process.env.ADMIN_NAME || 'Super Admin',
      email: process.env.ADMIN_EMAIL || 'admin@kocapp.com',
      username: process.env.ADMIN_USERNAME || 'admin',
      passwordHash,
      role: 'super_admin',
      status: 'active',
      membershipLevel: 2,
      affiliateCode: null,
      referredBy: null,
      createdAt: new Date().toISOString(),
    });

  }
}

export default db;
