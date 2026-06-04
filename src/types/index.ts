// ============================================================
//  types/product.ts
// ============================================================
export type Product = {
  id: number;
  shopId: number;
  categoryId?: number | null;
  name: string;
  description?: string | null;
  reference?: string | null;
  quantity: number;
  purchasePrice: number;
  salePrice: number;
  alertThreshold: number;
  imageUrl?: string | null;
  isActive: boolean;
  semiWholesalePrice?: number | null;
  semiWholesaleMinQty?: number | null;
  wholesalePrice?: number | null;
  wholesaleMinQty?: number | null;
  createdAt: string;
  updatedAt: string;
  category?: { id: number; name: string } | null;
};

// ============================================================
//  types/category.ts
// ============================================================
export type Category = {
  id: number;
  shopId: number;
  name: string;
  createdAt: string;
  _count?: { products: number };
};

// ============================================================
//  types/client.ts
// ============================================================
export type Client = {
  id: number;
  shopId: number;
  name: string;
  phone: string;
  email?: string | null;
  address?: string | null;
  createdAt: string;
  totalPurchases?: number;
  totalPaid?: number;
  totalRemaining?: number;
};

// ============================================================
//  types/supplier.ts
// ============================================================
export type Supplier = {
  id: number;
  shopId: number;
  name: string;
  phone?: string | null;
  email?: string | null;
  address?: string | null;
  createdAt: string;
  totalDebt?: number;
  supplierDebts?: SupplierDebt[];
};

export type SupplierDebt = {
  id: number;
  supplierId: number;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  status: "UNPAID" | "PARTIAL" | "PAID";
  note?: string | null;
  createdAt: string;
  payments?: SupplierPayment[];
};

export type SupplierPayment = {
  id: number;
  supplierDebtId: number;
  amount: number;
  note?: string | null;
  paidAt: string;
};

// ============================================================
//  types/sale.ts
// ============================================================
export type SaleItem = {
  id: number;
  saleId: number;
  productId?: number | null;
  productName: string;
  productImageUrl?: string | null;
  quantity: number;
  unitPrice: number;
  totalAmount: number;
  product?: Product | null;
};

export type SalePayment = {
  id: number;
  saleId: number;
  amount: number;
  note?: string | null;
  paidAt: string;
};

export type Sale = {
  id: number;
  shopId: number;
  userId?: number | null;
  clientId?: number | null;
  invoiceNumber?: string | null;
  customerName?: string | null;
  totalAmount: number;
  paidAmount: number;
  remaining: number;
  status: "PAID" | "PARTIAL" | "UNPAID";
  note?: string | null;
  createdAt: string;
  updatedAt: string;
  client?: Client | null;
  items: SaleItem[];
  payments: SalePayment[];
};

// ============================================================
//  types/stock.ts
// ============================================================
export type StockMovement = {
  id: number;
  shopId: number;
  productId: number;
  userId?: number | null;
  supplierId?: number | null;
  type: "ENTRY" | "OUT" | "SALE" | "ADJUST";
  quantity: number;
  unitCost?: number | null;
  note?: string | null;
  createdAt: string;
  product: Product;
  user?: { name: string } | null;
  supplier?: Supplier | null;
};

// ============================================================
//  types/cash.ts
// ============================================================
export type CashTransaction = {
  id: number;
  cashRegisterId: number;
  type: "IN" | "OUT";
  amount: number;
  label: string;
  reference?: string | null;
  createdAt: string;
};

export type CashRegister = {
  id: number;
  shopId: number;
  userId?: number | null;
  openingAmount: number;
  closingAmount?: number | null;
  totalIn: number;
  totalOut: number;
  currentBalance?: number;
  status: "OPEN" | "CLOSED";
  openedAt: string;
  closedAt?: string | null;
  note?: string | null;
  transactions?: CashTransaction[];
  user?: { name: string } | null;
};

// ============================================================
//  types/dashboard.ts
// ============================================================
export type DashboardStats = {
  totalProducts: number;
  lowStockProducts: number;
  outOfStockProducts: number;
  stockValue: number;
  totalSales: number;
  totalSalesAmount: number;
  totalPaidAmount: number;
  totalClientDebt: number;
  recentSalesAmount: number;
  totalClients: number;
  totalSuppliers: number;
  totalSupplierDebt: number;
  cashOpen: boolean;
  currentBalance: number | null;
  topProducts: {
    productId: number | null;
    productName: string;
    totalQuantity: number | null;
    totalAmount: number | null;
  }[];
};

// ============================================================
//  types/shop.ts
// ============================================================
export type Shop = {
  id: number;
  name: string;
  ownerName: string;
  email: string;
  phone?: string | null;
  address?: string | null;
  status: "ACTIVE" | "SUSPENDED" | "EXPIRED";
  createdAt: string;
  _count?: { users: number; products: number; sales: number };
  subscriptions?: {
    id: number;
    plan: string;
    status: string;
    endDate: string;
  }[];
};

// ============================================================
//  types/user.ts
// ============================================================
export type User = {
  id: number;
  shopId: number;
  name: string;
  email: string;
  role: "ADMIN" | "EMPLOYEE";
  isActive: boolean;
  createdAt: string;
};