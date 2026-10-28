import { apiClient } from "./client";

export type SplitType = "Equal" | "Custom" | "Consumption";
export type ExpenseShare = { userId: string; shareAmount: number | null };
export type SaveExpense = { description: string; amount: number; category: string; paidByUserId: string; splitType: SplitType; expenseDate: string; notes?: string; shares: ExpenseShare[] };
export type Expense = { expenseId: string; tripId: string; description: string; amount: number; category: string; paidByUserId: string; paidByName: string; splitType: SplitType; expenseDate: string; notes: string | null; participantCount: number | null; shares?: { expenseSplitId: string; userId: string; fullName: string; email: string; shareAmount: number }[] };
export type Balance = { userId: string; fullName: string; totalPaid: number; totalShares: number; totalSettlementSent: number; totalSettlementReceived: number; netBalance: number };
export type Suggestion = { fromUserId: string; fromName: string; toUserId: string; toName: string; amount: number };
export type Settlement = { settlementId: string; tripId: string; paidByUserId: string; paidByName: string; receivedByUserId: string; receivedByName: string; amount: number; settlementDate: string; status: "Pending" | "Completed" | "Cancelled"; notes: string | null; createdAt: string };
export type SettlementDashboardItem = { debtorId: string; debtorName: string; creditorId: string; creditorName: string; settlementType: "You Pay" | "You Receive"; originalAmount: number; completedAmount: number; pendingAmount: number; remainingAmount: number; progressPercent: number };
export type PaymentQrDetails = { recipientId: string; recipientName: string; recipientUpiId: string | null; amount: number; amountText: string; currencyCode: string; transactionNote: string };
const base = (tripId: string) => `/trips/${encodeURIComponent(tripId)}`;
export const expensesApi = {
  async list(tripId: string) { return (await apiClient.get<Expense[]>(`${base(tripId)}/expenses`)).data; },
  async get(tripId: string, id: string) { return (await apiClient.get<Expense>(`${base(tripId)}/expenses/${encodeURIComponent(id)}`)).data; },
  async create(tripId: string, body: SaveExpense) { return (await apiClient.post(`${base(tripId)}/expenses`, body)).data; },
  async update(tripId: string, id: string, body: SaveExpense) { return (await apiClient.put(`${base(tripId)}/expenses/${encodeURIComponent(id)}`, body)).data; },
  async remove(tripId: string, id: string) { return (await apiClient.delete(`${base(tripId)}/expenses/${encodeURIComponent(id)}`)).data; },
  async balances(tripId: string) { return (await apiClient.get<Balance[]>(`${base(tripId)}/balances`)).data; },
  async suggestions(tripId: string) { return (await apiClient.get<Suggestion[]>(`${base(tripId)}/settlement-suggestions`)).data; },
  async settlements(tripId: string) { return (await apiClient.get<Settlement[]>(`${base(tripId)}/settlements`)).data; },
  async createSettlement(tripId: string, body: { settlementId: string; paidByUserId: string; receivedByUserId: string; amount: number; notes?: string }) { return (await apiClient.post(`${base(tripId)}/settlements`, body)).data; },
  async updateSettlement(tripId: string, id: string, status: "Completed" | "Cancelled") { return (await apiClient.patch(`${base(tripId)}/settlements/${encodeURIComponent(id)}/status`, { status })).data; },
  async settlementDashboard(tripId: string) { return (await apiClient.get<SettlementDashboardItem[]>(`${base(tripId)}/settlements/dashboard`)).data; },
  async paymentQrDetails(tripId: string, recipientId: string) { return (await apiClient.get<PaymentQrDetails>(`${base(tripId)}/settlements/payment-qr-details`, { params: { recipientId } })).data; },
  async settlementHistory(tripId: string, status: "Pending" | "Completed" | "Cancelled" | "" = "") { return (await apiClient.get<Settlement[]>(`${base(tripId)}/settlements/history`, { params: status ? { status } : {} })).data; },
  async editSettlement(tripId: string, id: string, body: { paidByUserId: string; receivedByUserId: string; amount: number; notes?: string }) { return (await apiClient.put(`${base(tripId)}/settlements/${encodeURIComponent(id)}`, body)).data; },
};
