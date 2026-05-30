export class DashboardService {
  /** @param {import('./dashboard.repository.js').DashboardRepository} repo */
  constructor(repo) {
    this.repo = repo;
  }

  async getStats() {
    const [
      totalPatients,
      patientsThisMonth,
      todayAppointments,
      pendingPayments,
      clinicEfficiency,
    ] = await Promise.all([
      this.repo.countPatients(),
      this.repo.countPatientsThisMonth(),
      this.repo.countTodayAppointments(),
      this.repo.pendingPaymentsSummary(),
      this.repo.clinicEfficiency(),
    ]);

    return {
      totalPatients,
      patientsThisMonth,
      todayAppointments,
      pendingPayments: {
        total: pendingPayments.totalOverdue,
        overdueCount: pendingPayments.overdueCount,
      },
      clinicEfficiency,
    };
  }

  getRecentPatients() {
    return this.repo.recentPatients();
  }

  getTodaySchedule() {
    return this.repo.todaySchedule();
  }
}
