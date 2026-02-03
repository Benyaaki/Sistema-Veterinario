import { useState, useEffect } from 'react';
import { inventoryService, productsService, type Stock, type Product } from '../api/services';
import { Package, Search, RefreshCw, Edit2 } from 'lucide-react';
import api from '../api/axios';
import StockAdjustmentModal from '../components/StockAdjustmentModal';

interface Branch {
    id: string;
    _id?: string;
    name: string;
    is_active: boolean;
}

const StockPage = () => {
    const [products, setProducts] = useState<Product[]>([]);
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [loading, setLoading] = useState(false);
    const [search, setSearch] = useState('');

    // Modal State
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
    const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(undefined);
    const [selectedBranchName, setSelectedBranchName] = useState<string | undefined>(undefined);
    const [currentQtyToEdit, setCurrentQtyToEdit] = useState(0);

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Branches
            const branchRes = await api.get('/branches');
            const activeBranches = branchRes.data.filter((b: Branch) => b.is_active);
            setBranches(activeBranches);

            // 2. Fetch Products
            const productData = await productsService.getAll({ search });
            setProducts(productData);

            // 3. Fetch ALL Stocks (unfiltered by branch)
            // The current service might filter by branch. We need a way to get ALL.
            // checking inventoryService.getStock implementation...
            // If it demands branch_id, we might need to fetch for each branch or update backend.
            // Let's assume we can fetch all or loop.
            // Parallel fetch for all branches to build compendium
            // Ideally backend supports "get all stocks", but let's iterate for now if needed.
            // Actually router inventory.py: get_stock(branch_id=None) returns all.
            const stockData = await inventoryService.getStock({});
            setStocks(stockData);

        } catch (error) {
            console.error("Error loading stock data:", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [search]);

    const handleEditStock = (product: Product, branchId: string, branchName: string, qty: number) => {
        setSelectedProduct(product);
        setSelectedBranchId(branchId);
        setSelectedBranchName(branchName);
        setCurrentQtyToEdit(qty);
        setIsAdjustmentModalOpen(true);
    };

    // Build Pivot Table Data
    // Map<ProductId, { product: Product, stocks: { BranchId: qty } }>
    const pivotData = products.map(product => {
        const prodId = product.id || product._id;
        const prodStocks = stocks.filter(s => s.product_id === prodId);

        const stockByBranch: Record<string, number> = {};
        branches.forEach(b => {
            const bId = b.id || b._id;
            const entry = prodStocks.find(s => s.branch_id === bId);
            stockByBranch[bId || ''] = entry ? entry.quantity : 0;
        });

        // Calculate Total
        const totalStock = Object.values(stockByBranch).reduce((a, b) => a + b, 0);

        return {
            ...product,
            stockByBranch,
            totalStock
        };
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col gap-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                        <Package className="text-blue-400" /> Control de Stock Multi-Sucursal
                    </h1>
                </div>

                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar producto..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={loadData}
                        className="p-2 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Recargar"
                    >
                        <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                    </button>
                </div>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-brand-surface text-gray-500 font-medium border-b border-brand-accent/20">
                            <tr>
                                <th className="p-4 w-64">Producto</th>
                                <th className="p-4">Categoría</th>
                                <th className="p-4 text-center bg-gray-100/50">Total Global</th>
                                {branches.map(branch => (
                                    <th key={branch.id || branch._id} className="p-4 text-center min-w-[100px]">
                                        {branch.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && (
                                <tr><td colSpan={branches.length + 3} className="p-8 text-center text-gray-500">Cargando datos...</td></tr>
                            )}
                            {!loading && pivotData.length === 0 && (
                                <tr><td colSpan={branches.length + 3} className="p-8 text-center text-gray-500">No se encontraron productos</td></tr>
                            )}
                            {pivotData.map((row: any) => (
                                <tr key={row.id || row._id} className="hover:bg-brand-surface/50 transition-colors">
                                    <td className="p-4">
                                        <div className="font-semibold text-gray-900">{row.name}</div>
                                        <div className="text-xs text-gray-500 font-mono">{row.sku}</div>
                                    </td>
                                    <td className="p-4 text-gray-600">{row.category}</td>
                                    <td className="p-4 text-center font-bold text-gray-800 bg-gray-50/50">
                                        {row.totalStock}
                                    </td>
                                    {branches.map(branch => {
                                        const bId = branch.id || branch._id || '';
                                        const qty = row.stockByBranch[bId] || 0;
                                        return (
                                            <td key={branch.id || branch._id} className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2 group">
                                                    <span className={`px-2 py-1 rounded-full text-xs font-medium ${qty > 5 ? 'bg-green-100 text-green-700' :
                                                        qty > 0 ? 'bg-yellow-100 text-yellow-700' :
                                                            'bg-red-100 text-red-700'
                                                        }`}>
                                                        {qty}
                                                    </span>
                                                    <button
                                                        className="text-gray-400 hover:text-purple-600 opacity-0 group-hover:opacity-100 transition-opacity"
                                                        onClick={() => handleEditStock(row, branch.id || branch._id!, branch.name, qty)}
                                                        title="Editar Stock"
                                                    >
                                                        <Edit2 size={14} />
                                                    </button>
                                                </div>
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>

            <StockAdjustmentModal
                isOpen={isAdjustmentModalOpen}
                onClose={() => setIsAdjustmentModalOpen(false)}
                onSuccess={loadData}
                product={selectedProduct}
                branchId={selectedBranchId}
                branchName={selectedBranchName}
                currentQuantity={currentQtyToEdit}
            />
        </div>
    );
};

export default StockPage;
