import { useState, useEffect } from 'react';
import { inventoryService, productsService, type Stock, type Product } from '../api/services';
import { Package, Search, RefreshCw, Edit2, ChevronLeft, ChevronRight } from 'lucide-react';
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
    const [selectedCategory, setSelectedCategory] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [selectedBranchFilter, setSelectedBranchFilter] = useState('');
    const [categories, setCategories] = useState<string[]>([]);

    // Modal State
    const [isAdjustmentModalOpen, setIsAdjustmentModalOpen] = useState(false);
    const [selectedProduct, setSelectedProduct] = useState<Product | undefined>(undefined);
    const [selectedBranchId, setSelectedBranchId] = useState<string | undefined>(undefined);
    const [selectedBranchName, setSelectedBranchName] = useState<string | undefined>(undefined);
    const [currentQtyToEdit, setCurrentQtyToEdit] = useState(0);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const itemsPerPage = 200;

    const loadData = async () => {
        setLoading(true);
        try {
            // 1. Fetch Branches
            const branchRes = await api.get('/branches');
            const activeBranches = branchRes.data.filter((b: Branch) => b.is_active);
            setBranches(activeBranches);

            // 2. Fetch Products
            const { items: productData, total } = await productsService.getAll({
                search,
                category: selectedCategory,
                supplier_name: supplierName,
                limit: itemsPerPage,
                page: currentPage
            });
            setTotalProducts(total);
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

    const loadCategories = async () => {
        try {
            const cats = await productsService.getCategories();
            setCategories(cats);
        } catch (error) {
            console.error(error);
        }
    };

    useEffect(() => {
        loadData();
    }, [search, selectedCategory, supplierName, currentPage]);

    useEffect(() => {
        loadCategories();
    }, []);

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1);
    }, [search, selectedCategory, supplierName]);

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

    const totalPages = Math.ceil(totalProducts / itemsPerPage);
    const filteredBranchesRow = branches.filter(b => !selectedBranchFilter || (b.id === selectedBranchFilter || b._id === selectedBranchFilter));

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                <Package className="text-blue-400" /> Stock por Sucursal
            </h1>

            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200">
                <div className="flex flex-col md:flex-row gap-4">
                    <div className="relative flex-1">
                        <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" size={20} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o SKU..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>

                    <div className="w-full md:w-48">
                        <select
                            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={selectedBranchFilter}
                            onChange={e => setSelectedBranchFilter(e.target.value)}
                        >
                            <option value="">Todas las Sucursales</option>
                            {branches.map(b => (
                                <option key={b.id || b._id} value={b.id || b._id}>{b.name}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-full md:w-48">
                        <select
                            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={selectedCategory}
                            onChange={e => setSelectedCategory(e.target.value)}
                        >
                            <option value="">Todas las Categorías</option>
                            {categories.map(cat => (
                                <option key={cat} value={cat}>{cat}</option>
                            ))}
                        </select>
                    </div>

                    <div className="w-full md:w-64">
                        <input
                            type="text"
                            placeholder="Compañía / Proveedor..."
                            className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={supplierName}
                            onChange={e => setSupplierName(e.target.value)}
                        />
                    </div>

                    <div className="flex gap-2">
                        <button
                            onClick={loadData}
                            className="p-2 border border-blue-600 text-blue-600 bg-white rounded hover:bg-blue-50 transition-colors"
                            title="Recargar"
                        >
                            <RefreshCw size={20} className={loading ? 'animate-spin' : ''} />
                        </button>
                    </div>
                </div>
            </div>
            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                <div className="overflow-x-auto">
                    <table className="w-full text-sm text-left">
                        <thead className="bg-brand-surface text-gray-500 font-medium border-b border-brand-accent/20">
                            <tr>
                                <th className="p-4 w-20">ID</th>
                                <th className="p-4 w-32">EAN/SKU</th>
                                <th className="p-4 w-64">Producto</th>
                                <th className="p-4">Categoría</th>
                                <th className="p-4 text-center bg-gray-100/50">Total Global</th>
                                {filteredBranchesRow.map(branch => (
                                    <th key={branch.id || branch._id} className="p-4 text-center min-w-[100px]">
                                        {branch.name}
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading && (
                                <tr><td colSpan={filteredBranchesRow.length + 5} className="p-8 text-center text-gray-500">Cargando datos...</td></tr>
                            )}
                            {!loading && pivotData.length === 0 && (
                                <tr><td colSpan={filteredBranchesRow.length + 5} className="p-8 text-center text-gray-500">No se encontraron productos</td></tr>
                            )}
                            {pivotData.map((row: any) => (
                                <tr key={row.id || row._id} className="hover:bg-brand-surface/50 transition-colors">
                                    <td className="p-4 text-gray-400 font-mono text-[10px]">{row.external_id || '-'}</td>
                                    <td className="p-4 text-gray-400 font-mono text-[10px]">{row.sku || '-'}</td>
                                    <td className="p-4">
                                        <div className="font-semibold text-gray-900 leading-tight">{row.name}</div>
                                        <div className="text-[10px] text-gray-400 italic">{row.supplier_name || ''}</div>
                                    </td>
                                    <td className="p-4 text-gray-600 text-xs">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded-full">{row.category || 'General'}</span>
                                    </td>
                                    <td className="p-4 text-center font-bold text-gray-800 bg-gray-50/50">
                                        {['veterinaria', 'peluquería', 'peluqueria'].includes(row.category?.toLowerCase() || '') ? (
                                            <span className="text-gray-400">-</span>
                                        ) : (
                                            row.totalStock
                                        )}
                                    </td>
                                    {filteredBranchesRow.map(branch => {
                                        const bId = branch.id || branch._id || '';
                                        const qty = row.stockByBranch[bId] || 0;
                                        return (
                                            <td key={branch.id || branch._id} className="p-4 text-center">
                                                <div className="flex items-center justify-center gap-2 group">
                                                    {['veterinaria', 'peluquería', 'peluqueria'].includes(row.category?.toLowerCase() || '') ? (
                                                        <span className="text-gray-400 font-bold">-</span>
                                                    ) : (
                                                        <>
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
                                                        </>
                                                    )}
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

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-gray-200 mt-4">
                    <div className="flex flex-1 justify-between sm:hidden">
                        <button
                            onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                            disabled={currentPage === 1}
                            className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Anterior
                        </button>
                        <button
                            onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                            disabled={currentPage === totalPages}
                            className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                        >
                            Siguiente
                        </button>
                    </div>
                    <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                        <div>
                            <p className="text-sm text-gray-700">
                                Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalProducts)}</span> de{' '}
                                <span className="font-medium">{totalProducts}</span> resultados
                            </p>
                        </div>
                        <div>
                            <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                <button
                                    onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                    disabled={currentPage === 1}
                                    className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <span className="sr-only">Anterior</span>
                                    <ChevronLeft className="h-5 w-5" aria-hidden="true" />
                                </button>
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    let pageNum = currentPage;
                                    if (currentPage <= 3) pageNum = i + 1;
                                    else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                    else pageNum = currentPage - 2 + i;

                                    if (pageNum <= 0 || pageNum > totalPages) return null;

                                    return (
                                        <button
                                            key={pageNum}
                                            onClick={() => setCurrentPage(pageNum)}
                                            className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === pageNum ? 'bg-blue-600 text-white focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0'}`}
                                        >
                                            {pageNum}
                                        </button>
                                    );
                                })}
                                <button
                                    onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                    disabled={currentPage === totalPages}
                                    className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                >
                                    <span className="sr-only">Siguiente</span>
                                    <ChevronRight className="h-5 w-5" aria-hidden="true" />
                                </button>
                            </nav>
                        </div>
                    </div>
                </div>
            )}

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
