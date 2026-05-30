export class InventoryRepository {
  /** @param {import('knex').Knex} db */
  constructor(db) {
    this.db = db;
  }

  findAll({ search, category, status, limit = 50, offset = 0 } = {}) {
    const today = new Date().toISOString().split('T')[0];
    const q = this.db('inventory').whereNull('deleted_at').orderBy('created_at', 'desc');

    if (search) {
      q.where((b) =>
        b
          .whereILike('material_name', `%${search}%`)
          .orWhereILike('supplier_info', `%${search}%`)
      );
    }

    if (category && category !== 'all') {
      q.where('category', category);
    }

    if (status === 'low-stock') {
      q.whereRaw('quantity > 0 AND quantity <= min_stock_alert');
    } else if (status === 'out-of-stock') {
      q.where('quantity', 0);
    } else if (status === 'expired') {
      q.whereNotNull('expiry_date').where('expiry_date', '<', today);
    } else if (status === 'in-stock') {
      q.whereRaw('quantity > min_stock_alert');
    }

    return q.limit(limit).offset(offset);
  }

  count({ search, category, status } = {}) {
    const today = new Date().toISOString().split('T')[0];
    const q = this.db('inventory').whereNull('deleted_at').count('id as total');

    if (search) {
      q.where((b) =>
        b
          .whereILike('material_name', `%${search}%`)
          .orWhereILike('supplier_info', `%${search}%`)
      );
    }

    if (category && category !== 'all') {
      q.where('category', category);
    }

    if (status === 'low-stock') {
      q.whereRaw('quantity > 0 AND quantity <= min_stock_alert');
    } else if (status === 'out-of-stock') {
      q.where('quantity', 0);
    } else if (status === 'expired') {
      q.whereNotNull('expiry_date').where('expiry_date', '<', today);
    } else if (status === 'in-stock') {
      q.whereRaw('quantity > min_stock_alert');
    }

    return q.first();
  }

  findById(id) {
    return this.db('inventory').where({ id }).whereNull('deleted_at').first();
  }

  async create(data) {
    const [item] = await this.db('inventory').insert(data).returning('*');
    return item;
  }

  async update(id, data) {
    const [item] = await this.db('inventory')
      .where({ id })
      .whereNull('deleted_at')
      .update(data)
      .returning('*');
    return item;
  }

  async softDelete(id) {
    const [item] = await this.db('inventory')
      .where({ id })
      .whereNull('deleted_at')
      .update({ deleted_at: this.db.fn.now() })
      .returning('*');
    return item;
  }

  /** Returns items where quantity <= min_stock_alert (including out-of-stock) */
  getLowStock() {
    return this.db('inventory')
      .whereNull('deleted_at')
      .whereRaw('quantity <= min_stock_alert')
      .orderBy('quantity', 'asc');
  }

  /** Returns items where expiry_date is within the next 30 days or already past */
  getNearExpiry(daysAhead = 30) {
    const today = new Date().toISOString().split('T')[0];
    const threshold = new Date();
    threshold.setDate(threshold.getDate() + daysAhead);
    const thresholdStr = threshold.toISOString().split('T')[0];

    return this.db('inventory')
      .whereNull('deleted_at')
      .whereNotNull('expiry_date')
      .where('expiry_date', '<=', thresholdStr)
      .orderBy('expiry_date', 'asc');
  }
}
