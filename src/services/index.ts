// ============================================================
//  services/api.ts
// ============================================================
import axios from "axios";

export const api = axios.create({ baseURL: "http://localhost:5000/api" });

api.interceptors.request.use((config) => {
  const token = localStorage.getItem("token");
  if (token) config.headers.Authorization = `Bearer ${token}`;
  return config;
});

api.interceptors.response.use(
  (r) => r,
  (error) => {
    if (error.response?.status === 401) {
      localStorage.removeItem("token");
      localStorage.removeItem("user");
      window.location.href = "/login";
    }
    return Promise.reject(error);
  }
);

// ── Auth ──────────────────────────────────────────────────────
export const login = async (data: { email: string; password: string }) => {
  const res = await api.post("/auth/login", data);
  return res.data;
};
export const loginSuperAdmin = async (data: { email: string; password: string }) => {
  const res = await api.post("/auth/super-admin/login", data);
  return res.data;
};

// ── Products ──────────────────────────────────────────────────
import type { Product, Category, Client, Supplier, Sale, DashboardStats, Shop, User } from "../types/index";

export type CreateProductPayload = {
  name: string; description?: string; reference?: string; categoryId?: number | null;
  quantity: number; purchasePrice: number; salePrice: number; alertThreshold: number; imageUrl?: string;
};
export type ProductListResponse = {
  data: Product[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
};

export const getProducts = async (params?: { search?: string; categoryId?: number; page?: number; limit?: number }): Promise<ProductListResponse> => {
  const res = await api.get("/products", { params });
  return res.data;
};
export const getProductById = async (id: number): Promise<Product> => (await api.get(`/products/${id}`)).data;
export const createProduct = async (payload: CreateProductPayload): Promise<Product> => (await api.post("/products", payload)).data.product;
export const updateProduct = async (id: number, payload: Partial<CreateProductPayload>): Promise<Product> => (await api.put(`/products/${id}`, payload)).data.product;
export const deleteProduct = async (id: number): Promise<void> => { await api.delete(`/products/${id}`); };
export const getLowStockProducts = async (): Promise<Product[]> => (await api.get("/products/low-stock")).data;

export const getSuggestedPrice = async (productId: number, quantity: number) => {
  const res = await api.get(`/products/${productId}/price`, { params: { quantity } });
  return res.data as {
    quantity: number;
    suggestedPrice: number;
    tier: "detail" | "semiWholesale" | "wholesale";
    tiers: {
      detail: { price: number; label: string };
      semiWholesale: { price: number; minQty: number; label: string } | null;
      wholesale: { price: number; minQty: number; label: string } | null;
    };
  };
};

// ── Categories ────────────────────────────────────────────────
export const getCategories = async (): Promise<Category[]> => (await api.get("/categories")).data;
export const createCategory = async (name: string): Promise<Category> => (await api.post("/categories", { name })).data.category;
export const deleteCategory = async (id: number): Promise<void> => { await api.delete(`/categories/${id}`); };

// ── Clients ───────────────────────────────────────────────────
export type ClientPayload = { name: string; phone: string; email?: string; address?: string };
export const getClients = async (): Promise<Client[]> => (await api.get("/clients")).data;
export const getClientById = async (id: number) => (await api.get(`/clients/${id}`)).data;
export const createClient = async (payload: ClientPayload): Promise<Client> => (await api.post("/clients", payload)).data.client;
export const updateClient = async (id: number, payload: ClientPayload): Promise<Client> => (await api.put(`/clients/${id}`, payload)).data.client;
export const deleteClient = async (id: number): Promise<void> => { await api.delete(`/clients/${id}`); };

// ── Suppliers ─────────────────────────────────────────────────
export type SupplierPayload = { name: string; phone?: string; email?: string; address?: string };
export const getSuppliers = async (): Promise<Supplier[]> => (await api.get("/suppliers")).data;
export const getSupplierById = async (id: number) => (await api.get(`/suppliers/${id}`)).data;
export const createSupplier = async (payload: SupplierPayload): Promise<Supplier> => (await api.post("/suppliers", payload)).data.supplier;
export const updateSupplier = async (id: number, payload: SupplierPayload): Promise<Supplier> => (await api.put(`/suppliers/${id}`, payload)).data.supplier;
export const deleteSupplier = async (id: number): Promise<void> => { await api.delete(`/suppliers/${id}`); };
export const addSupplierDebt = async (supplierId: number, data: { totalAmount: number; paidAmount?: number; note?: string }) => (await api.post(`/suppliers/${supplierId}/debts`, data)).data;
export const addSupplierPayment = async (supplierId: number, debtId: number, data: { amount: number; note?: string }) => (await api.post(`/suppliers/${supplierId}/debts/${debtId}/payments`, data)).data;

// ── Sales ─────────────────────────────────────────────────────
export type SaleItemPayload = { productId: number; quantity: number; unitPrice: number };
export type CreateSalePayload = { clientId?: number | null; customerName?: string; paidAmount?: number; note?: string; items: SaleItemPayload[] };
export type SaleListResponse = { data: Sale[]; pagination: { total: number; page: number; limit: number; totalPages: number } };
export const getSales = async (params?: { status?: string; page?: number; limit?: number; search?: string }): Promise<SaleListResponse> => (await api.get("/sales", { params })).data;
export const getSaleById = async (id: number): Promise<Sale> => (await api.get(`/sales/${id}`)).data;
export const createSale = async (payload: CreateSalePayload) => (await api.post("/sales", payload)).data;
export const addSalePayment = async (saleId: number, amount: number, note?: string) => (await api.patch(`/sales/${saleId}/payment`, { amount, note })).data;
export const deleteSale = async (id: number): Promise<void> => { await api.delete(`/sales/${id}`); };

// ── Invoices ──────────────────────────────────────────────────
export type InvoiceListResponse = {
  data: Sale[];
  pagination: { total: number; page: number; limit: number; totalPages: number };
  stats: { totalInvoices: number; totalRevenue: number; totalCollected: number; totalOutstanding: number };
};
export const getInvoices = async (params?: { search?: string; status?: string; dateFrom?: string; dateTo?: string; page?: number; limit?: number }): Promise<InvoiceListResponse> => (await api.get("/invoices", { params })).data;
export const getInvoiceById = async (id: number): Promise<Sale> => (await api.get(`/invoices/${id}`)).data;
export const addInvoicePayment = async (id: number, amount: number, note?: string) => (await api.patch(`/invoices/${id}/payment`, { amount, note })).data;

// ── Stock ─────────────────────────────────────────────────────
export type StockPayload = { productId: number; quantity: number; supplierId?: number; unitCost?: number; paidAmount?: number; createDebt?: boolean; note?: string };
export const getStockMovements = async (params?: { page?: number; limit?: number }) => (await api.get("/stock/movements", { params })).data;
export const addStockEntry = async (payload: StockPayload) => (await api.post("/stock/entry", payload)).data;
export const addStockOut = async (payload: StockPayload) => (await api.post("/stock/out", payload)).data;

// ── Cash ──────────────────────────────────────────────────────
export const getCurrentCash = async () => (await api.get("/cash/current")).data;
export const getCashHistory = async (params?: { page?: number; limit?: number }) => (await api.get("/cash/history", { params })).data;
export const getCashById = async (id: number) => (await api.get(`/cash/${id}`)).data;
export const openCash = async (data: { openingAmount: number; note?: string }) => (await api.post("/cash/open", data)).data;
export const closeCash = async (id: number, data?: { note?: string }) => (await api.patch(`/cash/${id}/close`, data || {})).data;
export const addCashTransaction = async (data: { type: "IN" | "OUT"; amount: number; label: string; reference?: string }) => (await api.post("/cash/transactions", data)).data;

// ── Dashboard ─────────────────────────────────────────────────
export const getDashboardStats = async (): Promise<DashboardStats> => (await api.get("/dashboard/stats")).data;

// ── Super Admin ───────────────────────────────────────────────
export const getShops = async (): Promise<Shop[]> => (await api.get("/super-admin/shops")).data;
export const createShop = async (data: any) => (await api.post("/super-admin/shops", data)).data;
export const updateShopStatus = async (id: number, status: string) => (await api.patch(`/super-admin/shops/${id}/status`, { status })).data;
export const resetShopPassword = async (id: number, newPassword: string) => (await api.patch(`/super-admin/shops/${id}/reset-password`, { newPassword })).data;
export const deleteShop = async (id: number): Promise<void> => { await api.delete(`/super-admin/shops/${id}`); };

// ── Users ─────────────────────────────────────────────────────
export const getUsers = async (): Promise<User[]> => (await api.get("/users")).data;
export const createUser = async (data: { name: string; email: string; password: string; role: string }): Promise<User> => (await api.post("/users", data)).data.user;
export const updateUser = async (id: number, data: any): Promise<User> => (await api.put(`/users/${id}`, data)).data.user;
export const deleteUser = async (id: number): Promise<void> => { await api.delete(`/users/${id}`); };