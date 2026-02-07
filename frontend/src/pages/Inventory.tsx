import { useState, useEffect } from 'react';
import { inventoryService, type Stock, type Product, productsService } from '../api/services';
import {
    Search, RefreshCw, Edit, Plus, Package, Trash2
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


    // Modal State
    const [isProductModalOpen, setIsProductModalOpen] = useState(false);
    const [productToEdit, setProductToEdit] = useState<Product | undefined>(undefined);

    const loadData = async () => {
        setLoading(true);
        try {
            // Fetch Products always
            const productData = await productsService.getAll({ search });
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

    useEffect(() => {
        loadData();
    }, [currentBranch, search]);



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

                            <th className="p-3 text-xs">ID</th>
                            <th className="p-3 text-xs">UPC/EAN/ISBN</th>
                            <th className="p-3 text-xs">Nombre Artículo</th>
                            <th className="p-3 text-xs">Categoría</th>
                            <th className="p-3 text-xs">Nombre de la Compañía</th>
                            <th className="p-3 text-xs">Precio de Compra</th>
                            <th className="p-3 text-xs">Precio de Venta</th>
                            <th className="p-3 text-xs text-gray-500">IVA</th>
                            <th className="p-3 text-xs text-center uppercase tracking-wider">Stock</th>
                            <th className="p-3 text-center text-xs">Acción</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100">
                        {loading && (
                            <tr><td colSpan={11} className="p-8 text-center text-gray-500">Cargando inventario...</td></tr>
                        )}
                        {!loading && tableRows.length === 0 && (
                            <tr><td colSpan={10} className="p-8 text-center text-gray-500">No se encontraron productos.</td></tr>
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
                                    <td className="p-3 text-gray-900 font-mono text-xs">${product.purchase_price?.toLocaleString() || '0'}</td>
                                    <td className="p-3 text-gray-900 font-bold font-mono text-xs">${product.sale_price?.toLocaleString() || '0'}</td>
                                    <td className="p-3 text-gray-500 text-[10px] font-mono whitespace-nowrap">
                                        {product.tax_percent > 0
                                            ? `$${Math.round(product.sale_price - (product.sale_price / (1 + (product.tax_percent / 100)))).toLocaleString()} (${product.tax_percent}%)`
                                            : '-'
                                        }
                                    </td>
                                    <td className="p-3 text-center font-bold">
                                        <span className={product.stockQty <= (product.stock_alert_threshold || 5) ? 'text-red-500' : 'text-green-600'}>
                                            {product.stockQty}
                                        </span>
                                    </td>
                                    <td className="p-3 text-center">
                                        <div className="flex justify-center gap-2">
                                            <button
                                                onClick={() => handleEditProduct(product)}
                                                className="text-blue-500 hover:text-blue-700 bg-blue-50 p-1.5 rounded transition-colors"
                                                title="Editar Producto"
                                            >
                                                <Edit size={16} />
                                            </button>
                                            {hasRole('admin') && (
                                                <button
                                                    onClick={() => handleDeleteProduct(product.id || product._id)}
                                                    className="text-red-500 hover:text-red-700 bg-red-50 p-1.5 rounded transition-colors"
                                                    title="Eliminar Producto"
                                                >
                                                    <Trash2 size={16} />
                                                </button>
                                            )}
                                        </div>
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
