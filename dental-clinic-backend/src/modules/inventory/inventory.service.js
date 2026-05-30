import { NotFoundError } from '../../utils/errors.js';

export class InventoryService {
  /** @param {import('./inventory.repository.js').InventoryRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  async list(query = {}) {
    const limit = Math.min(Number(query.limit) || 50, 200);
    const offset = Number(query.offset) || 0;
    const search = query.search?.trim() || undefined;
    const category = query.category || undefined;
    const status = query.status || undefined;

    const [rows, countRow] = await Promise.all([
      this.repo.findAll({ search, category, status, limit, offset }),
      this.repo.count({ search, category, status }),
    ]);

    // Attach computed alert flags
    const today = new Date().toISOString().split('T')[0];
    const thirtyDays = new Date();
    thirtyDays.setDate(thirtyDays.getDate() + 30);
    const thirtyDaysStr = thirtyDays.toISOString().split('T')[0];

    const items = rows.map((item) => ({
      ...item,
      is_low_stock: item.quantity <= item.min_stock_alert,
      is_near_expiry: item.expiry_date
        ? item.expiry_date <= thirtyDaysStr && item.expiry_date >= today
        : false,
      is_expired: item.expiry_date ? item.expiry_date < today : false,
    }));

    return { items, total: Number(countRow.total), limit, offset };
  }

  async getById(id) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundError('Inventory item not found');
    return item;
  }

  async create(dto) {
    return this.repo.create(dto);
  }

  async update(id, dto) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundError('Inventory item not found');
    return this.repo.update(id, dto);
  }

  async restock(id, additionalQty) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundError('Inventory item not found');
    const newQty = item.quantity + additionalQty;
    return this.repo.update(id, { quantity: newQty });
  }

  async delete(id) {
    const item = await this.repo.findById(id);
    if (!item) throw new NotFoundError('Inventory item not found');
    return this.repo.softDelete(id);
  }

  async getAlerts() {
    const [lowStock, nearExpiry] = await Promise.all([
      this.repo.getLowStock(),
      this.repo.getNearExpiry(30),
    ]);

    const today = new Date().toISOString().split('T')[0];

    return {
      low_stock: lowStock.map((i) => ({ ...i, alert_type: 'low_stock' })),
      near_expiry: nearExpiry
        .filter((i) => i.expiry_date >= today)
        .map((i) => ({ ...i, alert_type: 'near_expiry' })),
      expired: nearExpiry
        .filter((i) => i.expiry_date < today)
        .map((i) => ({ ...i, alert_type: 'expired' })),
    };
  }
}
