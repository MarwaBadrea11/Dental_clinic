/**
 * TX-07: InventoryRepository with clinic isolation
 * All queries MUST filter by clinic_id to prevent cross-clinic data leaks
 */
export class InventoryRepository {
  /**
   * @param {import('knex').Knex} db
   * @param {string} clinicId
   */
  constructor(db, clinicId) {
    this.db = db;
    this.clinicId = clinicId;
  }

  findAll({ search, category, status, limit = 50, offset = 0 } = {}) {
    const today = new Date().toISOString().split('T')[0];
    // TX-07: OLD - no clinic_id filter
    // const q = this.db('inventory').whereNull('deleted_at').orderBy('created_at', 'desc');
    
    // TX-07: NEW - filter by clinic_id
    const q = this.db('inventory')
      .where('clinic_id', this.clinicId)
      .whereNull('deleted_at')
      .orderBy('created_at', 'desc');

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
    // TX-07: OLD - no clinic_id filter
    // const q = this.db('inventory').whereNull('deleted_at').count('id as total');
    
    // TX-07: NEW - filter by clinic_id
    const q = this.db('inventory')
      .where('clinic_id', this.clinicId)
      .whereNull('deleted_at')
      .count('id as total');

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
    // TX-07: OLD - no clinic_id filter
    // return this.db('inventory').where({ id }).whereNull('deleted_at').first();
    
    // TX-07: NEW - filter by clinic_id
    return this.db('inventory')
      .where({ id, clinic_id: this.clinicId })
      .whereNull('deleted_at')
      .first();
  }

  async create(data) {
    // TX-07: OLD - no clinic_id enforcement
    // const [item] = await this.db('inventory').insert(data).returning('*');
    
    // TX-07: NEW - enforce clinic_id on insert
    const [item] = await this.db('inventory')
      .insert({ ...data, clinic_id: this.clinicId })
      .returning('*');
    return item;
  }

  async update(id, data) {
    // TX-07: OLD - no clinic_id filter
    // const [item] = await this.db('inventory')
    //   .where({ id })
    //   .whereNull('deleted_at')
    //   .update(data)
    //   .returning('*');
    
    // TX-07: NEW - filter by clinic_id
    const [item] = await this.db('inventory')
      .where({ id, clinic_id: this.clinicId })
      .whereNull('deleted_at')
      .update(data)
      .returning('*');
    return item;
  }

  async softDelete(id) {
    // TX-07: OLD - no clinic_id filter
    // const [item] = await this.db('inventory')
    //   .where({ id })
    //   .whereNull('deleted_at')
    //   .update({ deleted_at: this.db.fn.now() })
    //   .returning('*');
    
    // TX-07: NEW - filter by clinic_id
    const [item] = await this.db('inventory')
      .where({ id, clinic_id: this.clinicId })
      .whereNull('deleted_at')
      .update({ deleted_at: this.db.fn.now() })
      .returning('*');
    return item;
  }

  /** Returns items where quantity <= min_stock_alert (including out-of-stock) */
  getLowStock() {
    // TX-07: OLD - no clinic_id filter
    // return this.db('inventory')
    //   .whereNull('deleted_at')
    //   .whereRaw('quantity <= min_stock_alert')
    //   .orderBy('quantity', 'asc');
    
    // TX-07: NEW - filter by clinic_id
    return this.db('inventory')
      .where('clinic_id', this.clinicId)
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

    // TX-07: OLD - no clinic_id filter
    // return this.db('inventory')
    //   .whereNull('deleted_at')
    //   .whereNotNull('expiry_date')
    //   .where('expiry_date', '<=', thresholdStr)
    //   .orderBy('expiry_date', 'asc');
    
    // TX-07: NEW - filter by clinic_id
    return this.db('inventory')
      .where('clinic_id', this.clinicId)
      .whereNull('deleted_at')
      .whereNotNull('expiry_date')
      .where('expiry_date', '<=', thresholdStr)
      .orderBy('expiry_date', 'asc');
  }
}
