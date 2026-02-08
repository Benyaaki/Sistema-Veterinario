import { useState, useEffect } from 'react';
import { inventoryService, type Stock, type Product, productsService } from '../api/services';
import {
    Search, RefreshCw, Edit, Plus, Package, Trash2, ChevronLeft, ChevronRight
} from 'lucide-react';
import FileImporter from '../components/FileImporter';
import { useBranch } from '../context/BranchContext';
import { useAuth } from '../context/AuthContext';
import ProductFormModal from '../components/ProductFormModal';

const Inventory = () => {
    const { currentBranch } = useBranch();
    const { hasRole } = useAuth();
    const [stocks, setStocks] = useState<Stock[]>([]);
    const [products, setProducts] = useState<Map<string, Product>>(new Map());
    const [search, setSearch] = useState('');
    const [selectedCategory, setSelectedCategory] = useState('');
    const [supplierName, setSupplierName] = useState('');
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalProducts, setTotalProducts] = useState(0);
    const itemsPerPage = 200;


    // Modal State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | undefined>(undefined);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch Products always
            const { items: productData, total } = await productsService.getAll({
                search,
                category: selectedCategory,
                supplier_name: supplierName,
                limit: itemsPerPage,
                page: currentPage
            });
            setTotalProducts(total);
            const pMap = new Map<string, Product>();
            productData.forEach((p: Product) => pMap.set(p.id || p._id || '', p));
            setProducts(pMap);

            // Fetch Stock only if branch selected
            if (currentBranch) {
                const stockData = await inventoryService.getStock({ branch_id: currentBranch.id || currentBranch._id });
                setStocks(stockData);
            } else {
                setStocks([]);
            }

        } catch (error) {
            console.error(error);
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
    }, [currentBranch, search, selectedCategory, supplierName, currentPage]);

    useEffect(() => {
        loadCategories();
    }, []);

    // Reset page on search
    useEffect(() => {
        setCurrentPage(1);
    }, [search, selectedCategory, supplierName]);



    const handleEditProduct = (product: Product) => {
        setProductToEdit(product);
        setIsProductModalOpen(true);
    };

    const handleDeleteProduct = async (id: string) => {
        if (!window.confirm('¿Estás seguro de que deseas eliminar este producto?')) return;
        try {
            await productsService.delete(id);
            alert('Producto eliminado correctamente');
            loadData();
        } catch (error) {
            console.error(error);
            alert('Error al eliminar producto');
        }
    };

    // Calculate derived data
    const tableRows = Array.from(products.values()).map(product => {
        const stock = stocks.find(s => s.product_id === (product.id || product._id));
        return {
            ...product,
            stockQty: stock ? stock.quantity : 0,
            stockId: stock ? (stock.id || (stock as any)._id) : undefined
        };
    });

    const totalPages = Math.ceil(totalProducts / itemsPerPage);

    return (
        <div className="p-6 space-y-4">
            {/* Header Actions */}
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Package className="text-blue-400" /> Inventario
            </h1>

            <div className="space-y-4">
                {/* Search Bar Standardized */}
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
                            {hasRole('admin') && (
                                <button
                                    onClick={() => {
                                        setProductToEdit(undefined);
                                        setIsProductModalOpen(true);
                                    }}
                                    className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap"
                                >
                                    <Plus size={20} />
                                    Nuevo
                                </button>
                            )}
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

                <div className="flex justify-end pr-1">
                    {hasRole('admin') && (
                        <FileImporter label="Importar Catálogo" endpoint="/api/v1/import/products" onSuccess={loadData} />
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded shadow-sm border border-brand-accent/20 overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-brand-surface text-gray-500 font-medium border-b border-brand-accent/20">
                        <tr>

                            <th className="p-3 text-xs">ID</th>
                            <th className="p-3 text-xs">UPC/EAN/ISBN</th>
                            <th className="p-3 text-xs">Nombre Artículo</th>
                            <th className="p-3 text-xs">Categoría</th>
                            <th className="p-3 text-xs">Nombre de la Compañía</th>
                            {hasRole('admin') && <th className="p-3 text-xs">Precio de Compra</th>}
                            <th className="p-3 text-xs">Precio de Venta</th>
                            <th className="p-3 text-xs text-gray-500">IVA</th>
                            <th className="p-3 text-xs text-center uppercase tracking-wider">Stock</th>
                            {hasRole('admin') && <th className="p-3 text-center text-xs">Acción</th>}
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && (
                            <tr><td colSpan={hasRole('admin') ? 10 : 8} className="p-8 text-center text-gray-500">Cargando inventario...</td></tr>
                        )}
                        {!loading && tableRows.length === 0 && (
                            <tr><td colSpan={hasRole('admin') ? 10 : 8} className="p-8 text-center text-gray-500">No se encontraron productos.</td></tr>
                        )}
                        {tableRows.map((product: any) => {
                            return (
                                <tr key={product.id || product._id} className="hover:bg-brand-surface/50 transition-colors">
                                    <td className="p-3 text-gray-400 font-mono text-[10px]">{product.external_id || '-'}</td>
                                    <td className="p-3 text-gray-400 font-mono text-[10px]">{product.sku || '-'}</td>
                                    <td className="p-3">
                                        <div className="flex items-center gap-3">
                                            {product.avatar ? (
                                                <img src={product.avatar} alt="" className="w-8 h-8 rounded border object-cover bg-white" />
                                            ) : (
                                                <div className="w-8 h-8 rounded border bg-gray-50 flex items-center justify-center text-gray-300">
                                                    <Package size={14} />
                                                </div>
                                            )}
                                            <span className="font-bold text-gray-900 leading-tight">{product.name}</span>
                                        </div>
                                    </td>
                                    <td className="p-3 text-gray-600 text-xs">
                                        <span className="bg-gray-100 px-2 py-0.5 rounded-full">{product.category || 'General'}</span>
                                    </td>
                                    <td className="p-3 text-gray-500 text-xs max-w-[150px] truncate">{product.supplier_name || '-'}</td>
                                    {hasRole('admin') && (
                                        <td className="p-3 text-gray-900 font-mono text-xs">${product.purchase_price?.toLocaleString() || '0'}</td>
                                    )}
                                    <td className="p-3 text-gray-900 font-bold font-mono text-xs">${product.sale_price?.toLocaleString() || '0'}</td>
                                    <td className="p-3 text-gray-500 text-[10px] font-mono whitespace-nowrap">
                                        {product.tax_percent > 0
                                            ? `$${Math.round(product.sale_price - (product.sale_price / (1 + (product.tax_percent / 100)))).toLocaleString()} (${product.tax_percent}%)`
                                            : '-'
                                        }
                                    </td>
                                    <td className="p-3 text-center font-bold">
                                        {['veterinaria', 'peluquería', 'peluqueria'].includes(product.category?.toLowerCase() || '') ? (
                                            <span className="text-gray-400">-</span>
                                        ) : (
                                            <span className={product.stockQty <= (product.stock_alert_threshold || 5) ? 'text-red-500' : 'text-green-600'}>
                                                {product.stockQty}
                                            </span>
                                        )}
                                    </td>
                                    {hasRole('admin') && (
                                        <td className="p-3 text-center">
                                            <div className="flex justify-center gap-2">
                                                <button
                                                    onClick={() => handleEditProduct(product)}
                                                    className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded transition-colors"
                                                    title="Editar Producto"
                                                >
                                                    <Edit size={16} />
                                                </button>
                                                <button
                                                    onClick={() => handleDeleteProduct(product.id || product._id)}
                                                    className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded transition-colors"
                                                    title="Eliminar Producto"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            </div>
                                        </td>
                                    )}
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>

            {/* Pagination Controls */}
            {totalPages > 1 && (
                <div className="flex items-center justify-between bg-white px-4 py-3 rounded-lg border border-gray-200">
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
                                {/* Page Numbers - Simple version */}
                                {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                    // Logic to show pages around current page
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


            <ProductFormModal
                isOpen={isProductModalOpen}
                onClose={() => setIsProductModalOpen(false)}
                onSuccess={loadData}
                productToEdit={productToEdit}
            />
        </div >
    );
};

export default Inventory;
