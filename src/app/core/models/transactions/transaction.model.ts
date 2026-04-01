export interface Transaction {
  id?: number;
  userId?: string;
  trendor_id?: string;
  amount?: number;
  currency?: string; // e.g 'NGN', 'USD', etc.
  type?: TransactionType;
  status?: TransactionStatus;
  destination_account_name?: string;
  destination_account_number?: string;
  destination_bank?: string;
  description?: string;
  transaction_id?: string;
  date?: Date;
  createdAt?: Date;
  updatedAt?: Date;
  deletedAt?: Date;
}

export enum TransactionType {
  WITHDRAWAL = 'withdrawal',
  CREDIT = 'credit',
  DEBIT = 'debit',
  ALL = 'all',
}

export enum TransactionStatus {
  PENDING = 'pending',
  COMPLETED = 'completed',
  FAILED = 'failed',
}

export interface FindTransactionsDto {
  trendor_id: string;
  transaction_type?: TransactionType;
  searchQuery?: string;
  limit?: number;
  page?: number;
  sort?: 'ASC' | 'DESC';
}

export interface TransactionResponse {
  list: Transaction[];
  count: number;
}
