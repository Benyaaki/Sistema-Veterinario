import api from './axios';

// --- Types ---
export interface Product {
    id?: string;
    _id?: string;
    name: string;
    description?: string;
    sku?: string;
    kind: 'PRODUCT' | 'SERVICE';
    sale_price: number;
    purchase_price?: number;
    tax_percent?: number;
    stock_alert_threshold?: number;
    is_active: boolean;
    stock?: number;
}

export interface Stock {
    id?: string;
    branch_id: string;
    product_id: string;
    quantity: number;
}

export interface SaleItem {
    product_id?: string;
    name: string;
    type: 'PRODUCT' | 'SERVICE';
    quantity: number;
    unit_price: number;
    discount?: number;
    total: number;
}

export interface Sale {
    id?: string;
    _id?: string;
    branch_id: string;
    items: SaleItem[];
    subtotal: number;
    discount_percent: number;
    discount_amount: number;
    total: number;
    payment_method: string;
    status: string;
    created_at: string;
    voided_at?: string;
    void_reason?: string;
    customer_id?: string;
    customer_name?: string;
    channel?: 'STORE' | 'DELIVERY';
}

export interface InventoryMovement {
    type: 'IN' | 'OUT' | 'TRANSFER' | 'SALE' | 'VOID_SALE';
    product_id: string;
    quantity: number;
    from_branch_id?: string;
    to_branch_id?: string;
    reason: string;
    reference_sale_id?: string;
    created_at?: string;
    created_by?: string;
}

// --- Services ---

export const productsService = {
    getAll: async (params?: { search?: string; kind?: string; branch_id?: string }) => {
        const { data } = await api.get<Product[]>('/products/', { params });
        return data;
    },
    create: async (product: Product) => {
        const { data } = await api.post<Product>('/products/', product);
        return data;
    },
    update: async (id: string, product: Partial<Product>) => {
        const { data } = await api.put<Product>(`/products/${id}`, product);
        return data;
    }
};

export const inventoryService = {
    getStock: async (params?: { branch_id?: string; product_id?: string }) => {
        const { data } = await api.get<Stock[]>('/inventory/stock', { params });
        return data;
    },
    createMovement: async (movement: InventoryMovement) => {
        const { data } = await api.post<InventoryMovement>('/inventory/movements', movement);
        return data;
    },
    getMovements: async (params?: { limit?: number }) => {
        const { data } = await api.get<InventoryMovement[]>('/inventory/movements', { params });
        return data;
    }
};

export const salesService = {
    create: async (saleData: any) => {
        const { data } = await api.post<Sale>('/sales/', saleData);
        return data;
    },
    voidSale: async (id: string, reason: string) => {
        const { data } = await api.post<Sale>(`/sales/${id}/void`, null, { params: { reason } });
        return data;
    },
    getAll: async (params?: { limit?: number }) => {
        const { data } = await api.get<Sale[]>('/sales/', { params });
        return data;
    },
    getMySales: async (params?: { start_date?: string; end_date?: string }) => {
        const { data } = await api.get<Sale[]>('/sales/my', { params });
        return data;
    }
};

export interface DeliveryOrder {
    id?: string;
    _id?: string; // Beanie uses _id
    sale_id: string;
    branch_id: string;
    assigned_user_id?: string;
    status: string;
    customer_snapshot?: any;
    shipping_cost?: number;
    scheduled_at?: string;
    created_at: string;
    sale_details?: Sale; // Populated in backend
}

export const deliveriesService = {
    getPending: async () => {
        const { data } = await api.get<DeliveryOrder[]>('/deliveries/');
        return data;
    },
    updateStatus: async (id: string, status: string) => {
        const { data } = await api.put<DeliveryOrder>(`/deliveries/${id}/status`, null, { params: { status } });
        return data;
    },
    assign: async (id: string, user_id: string) => {
        const { data } = await api.put<DeliveryOrder>(`/deliveries/${id}/assign`, null, { params: { user_id } });
        return data;
    },
    delete: async (id: string) => {
        const { data } = await api.delete(`/deliveries/${id}`);
        return data;
    }
};

export const usersService = {
    getAll: async (role?: string) => {
        // Assuming backend supports filtering by role or we fetch all
        const { data } = await api.get<any[]>('/users/');
        if (role) {
            return data.filter(u => u.roles && u.roles.includes(role));
        }
        return data;
    }
};

export const customersService = {
    getAll: async (params?: { search?: string }) => {
        const { data } = await api.get<any[]>('/tutors/', { params });
        return data;
    }
};

export const reportsService = {
    getSalesStats: async (start: string, end: string) => {
        // Backend route `/reports/sales?start=...&end=...`?
        // If not exists, fetch all sales and aggregate (not ideal but safe).
        // Let's assume backend capability or use a dedicated endpoint if created?
        // We can create a simple aggregate endpoint on frontend via helper for MVP:
        const { data } = await api.get<Sale[]>('/sales/', { params: { start, end, limit: 10000 } });

        const total = data.reduce((sum: number, s: Sale) => sum + s.total, 0);
        return {
            total_sales: total,
            count: data.length,
            average: data.length ? total / data.length : 0
        };
    }
};
