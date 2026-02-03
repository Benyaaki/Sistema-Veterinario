import { useState, useEffect } from 'react';
import { inventoryService, type Stock, type Product, productsService } from '../api/services';
import {
    Search, RefreshCw, Edit, Plus, Package
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
    const [loading, setLoading] = useState(false);
    const [selectedItems, setSelectedItems] = useState<Set<string>>(new Set());

    // Modal State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | undefined>(undefined);

    const loadData = async () => {
        if (!currentBranch) return;
        setLoading(true);
        try {
            // Fetch Products and Stocks
            const [stockData, productData] = await Promise.all([
                inventoryService.getStock({ branch_id: currentBranch.id || currentBranch._id }),
                productsService.getAll({ search })
            ]);

            const pMap = new Map<string, Product>();
            productData.forEach((p: Product) => pMap.set(p.id || p._id || '', p));
            setProducts(pMap);

            // Filter stocks to match search (if items found)
            if (search) {
                const pIds = new Set(productData.map((p: Product) => p.id || p._id));
                setStocks(stockData.filter((s: Stock) => pIds.has(s.product_id)));
            } else {
                setStocks(stockData);
            }

        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, [currentBranch, search]);

    const handleSelectAll = (e: React.ChangeEvent<HTMLInputElement>) => {
        if (e.target.checked) {
            setSelectedItems(new Set(stocks.map(s => s.product_id)));
        } else {
            setSelectedItems(new Set());
        }
    };

    const handleSelect = (id: string) => {
        const newSet = new Set(selectedItems);
        if (newSet.has(id)) newSet.delete(id);
        else newSet.add(id);
        setSelectedItems(newSet);
    };

    const handleEditProduct = (product: Product) => {
        setProductToEdit(product);
        setIsProductModalOpen(true);
    };

    // Calculate derived data
    const tableRows = stocks.map(stock => {
        const product = products.get(stock.product_id);
        if (!product) return null;
        return {
            ...product,
            stockQty: stock.quantity,
            stockId: (stock as any)._id || stock.id
        };
    }).filter(files => files !== null);

    return (
        <div className="p-6 space-y-4">
            {/* Header Actions */}
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Package className="text-blue-400" /> Inventario
            </h1>

            <div className="space-y-4">
                {/* Search Bar Standardized */}
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={search}
                            onChange={e => setSearch(e.target.value)}
                        />
                    </div>
                    <button
                        onClick={() => {
                            setProductToEdit(undefined);
                            setIsProductModalOpen(true);
                        }}
                        className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                        <Plus size={20} />
                        Nuevo Producto
                    </button>
                </div>

                <div className="flex flex-wrap justify-end gap-4 items-center">
                    <button
                        onClick={loadData}
                        className="flex items-center gap-2 px-3 py-2 border border-blue-600 text-blue-600 bg-white rounded hover:bg-blue-50 transition-colors"
                    >
                        <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Recargar Tabla
                    </button>

                    {hasRole('admin') && (
                        <FileImporter label="Productos" endpoint="/api/v1/import/products" onSuccess={loadData} />
                    )}
                </div>
            </div>

            {/* Table */}
            <div className="bg-white rounded shadow-sm border border-brand-accent/20 overflow-x-auto">
                <table className="w-full text-sm text-left">
                    <thead className="bg-brand-surface text-gray-500 font-medium border-b border-brand-accent/20">
                        <tr>
                            <th className="p-3 w-4">
                                <input type="checkbox" onChange={handleSelectAll} checked={stocks.length > 0 && selectedItems.size === stocks.length} />
                            </th>
                            <th className="p-3 text-xs">Id</th>
                            <th className="p-3 text-xs">UPC/EAN/ISBN</th>
                            <th className="p-3 text-xs">Nombre Artículo</th>
                            <th className="p-3 text-xs">Categoría</th>
                            <th className="p-3 text-xs">Nombre de la Compañía</th>
                            <th className="p-3 text-xs">Precio de Compra</th>
                            <th className="p-3 text-xs">Precio de Venta</th>
                            <th className="p-3 text-xs text-gray-500">IVA (19%)</th>
                            {/* Removed Quantity Column as requested */}
                            <th className="p-3 text-center text-xs">Editar</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && (
                            <tr><td colSpan={10} className="p-8 text-center text-gray-500">Cargando inventario...</td></tr>
                        )}
                        {!loading && Array.from(products.values()).length === 0 && (
                            <tr><td colSpan={10} className="p-8 text-center text-gray-500">No se encontraron productos.</td></tr>
                        )}
                        {Array.from(products.values()).map((product: any) => {
                            return (
                                <tr key={product.id || product._id} className="hover:bg-brand-surface/50 transition-colors">
                                    <td className="p-3">
                                        <input
                                            type="checkbox"
                                            checked={selectedItems.has(product.id || product._id)}
                                            onChange={() => handleSelect(product.id || product._id)}
                                        />
                                    </td>
                                    <td className="p-3 text-gray-500 text-xs font-mono">{(product.id || product._id).substring(0, 8)}...</td>
                                    <td className="p-3 text-gray-900">{product.sku || '-'}</td>
                                    <td className="p-3 font-medium text-purple-900">{product.name}</td>
                                    <td className="p-3 text-gray-600">{product.category || 'General'}</td>
                                    <td className="p-3 text-gray-600">{product.supplier_name || '-'}</td>
                                    <td className="p-3 text-gray-900">${product.purchase_price?.toLocaleString() || '0'}</td>
                                    <td className="p-3 text-gray-900">${product.sale_price?.toLocaleString() || '0'}</td>
                                    <td className="p-3 text-gray-600 text-xs">${product.sale_price ? Math.round(product.sale_price - (product.sale_price / 1.19)).toLocaleString() : '0'}</td>
                                    {/* Removed Quantity Cell */}
                                    <td className="p-3 text-center">
                                        <button
                                            onClick={() => handleEditProduct(product)}
                                            className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded transition-colors"
                                            title="Editar Producto"
                                        >
                                            <Edit size={16} />
                                        </button>
                                    </td>
                                </tr>
                            )
                        })}
                    </tbody>
                </table>
            </div>
            {
                !loading && (
                    <div className="text-xs text-secondary-500">
                        Mostrando {tableRows.length} resultados.
                    </div>
                )
            }

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
