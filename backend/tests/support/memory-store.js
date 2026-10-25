// Test-only model adapter; production always uses the Mongoose models.
class InMemoryCollection {
  constructor(name) {
    this.name = name;
    this.docs = [];
    this._nextId = 1;
  }

  clear() {
    this.docs = [];
    this._nextId = 1;
  }

  _matchesQuery(doc, query = {}) {
    for (const [key, val] of Object.entries(query)) {
      if (key === '$or' && Array.isArray(val)) {
        const anyMatch = val.some((subQuery) => this._matchesQuery(doc, subQuery));
        if (!anyMatch) return false;
        continue;
      }
      if (key === '$and' && Array.isArray(val)) {
        const allMatch = val.every((subQuery) => this._matchesQuery(doc, subQuery));
        if (!allMatch) return false;
        continue;
      }
      const docVal = doc[key];
      if (val && typeof val === 'object' && !Array.isArray(val)) {
        if ('$ne' in val && docVal === val.$ne) return false;
        if ('$in' in val && (!Array.isArray(val.$in) || !val.$in.includes(docVal))) return false;
        if ('$nin' in val && Array.isArray(val.$nin) && val.$nin.includes(docVal)) return false;
        if ('$gte' in val && !(docVal >= val.$gte)) return false;
        if ('$lte' in val && !(docVal <= val.$lte)) return false;
        if ('$gt' in val && !(docVal > val.$gt)) return false;
        if ('$lt' in val && !(docVal < val.$lt)) return false;
        if ('$regex' in val) {
          const reg = new RegExp(val.$regex, val.$options || 'i');
          if (!reg.test(String(docVal || ''))) return false;
        }
      } else if (docVal !== val) {
        return false;
      }
    }
    return true;
  }

  find(query = {}) {
    let results = this.docs.filter((d) => this._matchesQuery(d, query)).map((d) => ({ ...d }));

    const queryObj = {
      _sort: null,
      _limit: null,
      _skip: 0,
      sort(sortObj) {
        this._sort = sortObj;
        return this;
      },
      skip(n) {
        this._skip = n;
        return this;
      },
      limit(n) {
        this._limit = n;
        return this;
      },
      select(fields) {
        return this;
      },
      async exec() {
        let items = [...results];
        if (this._sort) {
          const [key, dir] = Object.entries(this._sort)[0] || [];
          if (key) {
            items.sort((a, b) => {
              const aVal = a[key];
              const bVal = b[key];
              if (aVal < bVal) return dir === -1 ? 1 : -1;
              if (aVal > bVal) return dir === -1 ? -1 : 1;
              return 0;
            });
          }
        }
        if (this._skip) items = items.slice(this._skip);
        if (this._limit) items = items.slice(0, this._limit);
        return items;
      },
      then(resolve, reject) {
        return this.exec().then(resolve, reject);
      },
    };

    return queryObj;
  }

  findOne(query = {}) {
    const doc = this.docs.find((d) => this._matchesQuery(d, query));
    const result = doc ? { ...doc } : null;
    return {
      select() {
        return this;
      },
      then(resolve, reject) {
        return Promise.resolve(result).then(resolve, reject);
      },
    };
  }

  findById(id) {
    return this.findOne({ _id: id });
  }

  async countDocuments(query = {}) {
    return this.docs.filter((d) => this._matchesQuery(d, query)).length;
  }

  async create(data) {
    const isArray = Array.isArray(data);
    const toInsert = isArray ? data : [data];
    const created = toInsert.map((item) => {
      const now = new Date().toISOString();
      const newDoc = {
        _id: item._id || `${this.name.slice(0, 3)}_${Date.now()}_${this._nextId++}`,
        createdAt: now,
        updatedAt: now,
        ...item,
      };
      this.docs.push(newDoc);
      return { ...newDoc };
    });
    return isArray ? created : created[0];
  }

  async updateOne(query, update) {
    const index = this.docs.findIndex((d) => this._matchesQuery(d, query));
    if (index === -1) return { matchedCount: 0, modifiedCount: 0 };
    const doc = this.docs[index];
    const updated = {
      ...doc,
      ...(update.$set || update),
      updatedAt: new Date().toISOString(),
    };
    if (update.$inc) {
      for (const [k, v] of Object.entries(update.$inc)) {
        updated[k] = (updated[k] || 0) + v;
      }
    }
    if (update.$push) {
      for (const [k, v] of Object.entries(update.$push)) {
        if (!Array.isArray(updated[k])) updated[k] = [];
        updated[k].push(v);
      }
    }
    this.docs[index] = updated;
    return { matchedCount: 1, modifiedCount: 1 };
  }

  async findByIdAndUpdate(id, update, options = {}) {
    const index = this.docs.findIndex((d) => d._id === id);
    if (index === -1) return null;
    const doc = this.docs[index];
    const updated = {
      ...doc,
      ...(update.$set || update),
      updatedAt: new Date().toISOString(),
    };
    this.docs[index] = updated;
    return options.new !== false ? { ...updated } : { ...doc };
  }

  async deleteOne(query) {
    const index = this.docs.findIndex((d) => this._matchesQuery(d, query));
    if (index === -1) return { deletedCount: 0 };
    this.docs.splice(index, 1);
    return { deletedCount: 1 };
  }

  async deleteMany(query) {
    const initialLen = this.docs.length;
    this.docs = this.docs.filter((d) => !this._matchesQuery(d, query));
    const deletedCount = initialLen - this.docs.length;
    return { deletedCount };
  }
}

// Registry of collections
const collections = {
  Company: new InMemoryCollection('companies'),
  User: new InMemoryCollection('users'),
  Employee: new InMemoryCollection('employees'),
  Department: new InMemoryCollection('departments'),
  Designation: new InMemoryCollection('designations'),
  Attendance: new InMemoryCollection('attendances'),
  AttendanceCorrection: new InMemoryCollection('attendance_corrections'),
  LeaveRequest: new InMemoryCollection('leave_requests'),
  Payroll: new InMemoryCollection('payrolls'),
  Announcement: new InMemoryCollection('announcements'),
  Notification: new InMemoryCollection('notifications'),
  AuditLog: new InMemoryCollection('audit_logs'),
  FaceTemplate: new InMemoryCollection('face_templates'),
};

export const getModel = (name) => {
  if (!collections[name]) {
    collections[name] = new InMemoryCollection(name.toLowerCase());
  }
  return collections[name];
};

export const dbStore = collections;
