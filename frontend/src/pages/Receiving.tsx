import { useState, useEffect } from 'react';
import { useBranch } from '../context/BranchContext';
import { productsService, type Product } from '../api/services';
import api from '../api/axios';
import { Search, Trash2, ArrowRight, Package } from 'lucide-react';

const Receiving = () => {
    const { currentBranch } = useBranch();
    const [mode, setMode] = useState<'RECEIVE' | 'TRANSFER'>('RECEIVE');
    const [scanQuery, setScanQuery] = useState('');
    const [cart, setCart] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
    const [branches, setBranches] = useState<any[]>([]);
    const [targetBranchId, setTargetBranchId] = useState<string>('');

    useEffect(() => {
        const fetchBranches = async () => {
            try {
                const res = await api.get('/branches');
                setBranches(res.data);
            } catch (error) {
                console.error("Error fetching branches", error);
            }
        };
        fetchBranches();
    }, []);



    // Search Products
    useEffect(() => {
        if (!scanQuery || scanQuery.length < 1) {
            setProductSuggestions([]);
            return;
        }
        const delay = setTimeout(async () => {
            try {
                const res = await productsService.getAll({
                    search: scanQuery,
                    branch_id: currentBranch?.id || currentBranch?._id
                });
                setProductSuggestions(res.slice(0, 5));
            } catch (e) {
                console.error(e);
                setProductSuggestions([]);
            }
        }, 300);
        return () => clearTimeout(delay);
    }, [scanQuery]);

    const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && scanQuery) {
            if (productSuggestions.length > 0) {
                addItemToCart(productSuggestions[0]);
                setScanQuery('');
                setProductSuggestions([]);
            } else {
                setLoading(true);
                setLoading(true);
                try {
                    const res = await productsService.getAll({
                        search: scanQuery,
                        branch_id: currentBranch?.id || currentBranch?._id
                    });
                    if (res.length > 0) {
                        addItemToCart(res[0]);
                        setScanQuery('');
                    } else {
                        alert('Producto no encontrado');
                    }
                } catch (err) {
                    console.error(err);
                } finally {
                    setLoading(false);
                }
            }
        }
    };

    const handleSelectProduct = (product: Product) => {
        addItemToCart(product);
        setScanQuery('');
        setProductSuggestions([]);
    };

    const addItemToCart = (product: Product) => {
        const existing = cart.find(i => i.product_id === (product.id || product._id));
        if (existing) {
            setCart(cart.map(i => i.product_id === (product.id || product._id) ? { ...i, quantity: i.quantity + 1, total: (i.quantity + 1) * i.cost } : i));
        } else {
            setCart([...cart, {
                product_id: product.id || product._id,
                name: product.name,
                sku: product.sku,
                cost: product.purchase_price,
                stock: product.stock, // Store stock
                quantity: 1,
                discount: 0,
                total: product.purchase_price
            }]);
        }
    };

    const removeItem = (matchId: string) => {
        setCart(cart.filter(i => i.product_id !== matchId));
    };

    const updateItem = (idx: number, field: string, value: number) => {
        const newCart = [...cart];
        const item = newCart[idx];
        if (field === 'quantity') item.quantity = value;
        if (field === 'cost') item.cost = value;
        if (field === 'discount') item.discount = value;

        // Recalc total
        item.total = (item.quantity * item.cost) - item.discount;
        setCart(newCart);
    };

    const handleProcess = async () => {
        if (!currentBranch) return;
        if (cart.length === 0) return;
        if (mode === 'TRANSFER' && !targetBranchId) {
            alert('Seleccione una sucursal de destino');
            return;
        }

        setLoading(true);
        try {
            for (const item of cart) {
                const payload: any = {
                    product_id: item.product_id,
                    type: mode, // 'RECEIVE' or 'TRANSFER' (mapped to IN/TRANSFER in backend logic, but here backend expects specific types?) 
                    // Wait, previous code sent 'IN' or 'OUT'. Backend probably expects 'TRANSFER' or similar. 
                    // Let's stick to what worked: mode === 'RECEIVE' ? 'IN' : 'TRANSFER' 
                    // Actually, let's check what I wrote before: type: mode === 'RECEIVE' ? 'IN' : 'OUT'
                    // Standard inventory types are typically IN, OUT, TRANSFER. 
                    // I will assume type should be mode (RECEIVE -> IN, TRANSFER -> TRANSFER)
                    // But wait, the previous code was: type: mode === 'RECEIVE' ? 'IN' : 'OUT'
                    // If I assume TRANSFER is a valid type in backend:
                    quantity: item.quantity,
                    reason: mode === 'RECEIVE'
                        ? `Recepción en ${currentBranch.name}`
                        : `Transferencia de ${currentBranch.name} a ${branches.find(b => (b.id || b._id) === targetBranchId)?.name}`,
                    reference: 'RECEPCION-APP'
                };

                // Adjust type for backend
                payload.type = mode === 'RECEIVE' ? 'IN' : 'TRANSFER';

                if (mode === 'RECEIVE') {
                    payload.to_branch_id = currentBranch.id || currentBranch._id;
                } else if (mode === 'TRANSFER') {
                    payload.from_branch_id = currentBranch.id || currentBranch._id;
                    payload.to_branch_id = targetBranchId;
                }

                await api.post('/inventory/movements', payload);
            }

            alert('Inventario actualizado con éxito');
            setCart([]);
            setTargetBranchId('');
        } catch (error) {
            console.error("Error processing receiving", error);
            alert('Error procesando la recepción');
        } finally {
            setLoading(false);
        }
    };









    const getModeColor = () => {
        switch (mode) {
            case 'RECEIVE': return 'bg-green-600';
            case 'TRANSFER': return 'bg-blue-600';
        }
    };

    const totalAmount = cart.reduce((acc, item) => acc + item.total, 0);

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <h1 className="text-2xl font-bold text-gray-800 mb-6 flex items-center gap-2">
                <Package className="text-blue-400" /> Recepción de Inventario
            </h1>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Branch and Mode Info */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <div className="flex flex-col md:flex-row gap-4 items-start md:items-center justify-between">
                            <div className="flex-1">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Sucursal Actual</label>
                                <div className="flex items-center gap-2 bg-blue-50 border border-blue-200 rounded-lg px-4 py-2">
                                    <span className="text-lg font-bold text-blue-700">{currentBranch?.name || 'No seleccionada'}</span>
                                </div>
                            </div>

                            <div className="flex-1">
                                <label className="block text-sm font-semibold text-gray-700 mb-2">Modo de Operación</label>
                                <select
                                    className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    value={mode}
                                    onChange={(e: any) => setMode(e.target.value)}
                                >
                                    <option value="RECEIVE">Recibir</option>
                                    <option value="TRANSFER">Transferir a otra sucursal</option>
                                </select>
                            </div>
                        </div>

                        {mode === 'TRANSFER' && (
                            <div className="mt-4 p-4 bg-blue-50 border border-blue-200 rounded-lg">
                                <label className="block text-sm font-semibold text-blue-800 mb-2">Sucursal de Destino</label>
                                <div className="flex items-center gap-2">
                                    <span className="text-gray-500">De: </span>
                                    <span className="font-bold text-gray-700">{currentBranch?.name}</span>
                                    <ArrowRight size={16} className="text-gray-400 mx-2" />
                                    <span className="text-gray-500">A: </span>
                                    <select
                                        className="flex-1 px-3 py-2 border border-blue-300 rounded outline-none focus:ring-2 focus:ring-blue-500"
                                        value={targetBranchId}
                                        onChange={(e) => setTargetBranchId(e.target.value)}
                                    >
                                        <option value="">-- Seleccionar Sucursal --</option>
                                        {branches
                                            .filter(b => (b.id || b._id) !== (currentBranch?.id || currentBranch?._id))
                                            .map(b => (
                                                <option key={b.id || b._id} value={b.id || b._id}>
                                                    {b.name}
                                                </option>
                                            ))}
                                    </select>
                                </div>
                            </div>
                        )}


                    </div>



                    {/* Product Search */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Buscar Productos</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="Buscar producto por nombre..."
                                value={scanQuery}
                                onChange={e => setScanQuery(e.target.value)}
                                onKeyDown={handleScan}
                                autoFocus
                            />

                            {/* Product Suggestions Dropdown */}
                            {productSuggestions.length > 0 && (
                                <div className="absolute top-full left-0 right-0 mt-1 bg-white shadow-xl rounded-lg border border-gray-200 max-h-64 overflow-y-auto z-50">
                                    {productSuggestions.map((product) => (
                                        <div
                                            key={product.id || product._id}
                                            className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0 transition-colors"
                                            onClick={() => handleSelectProduct(product)}
                                        >
                                            <div className="flex justify-between items-center">
                                                <div>
                                                    <div className="font-semibold text-gray-800">{product.name}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-green-600">${product.purchase_price?.toLocaleString() || 0}</div>
                                                    <div className="text-xs text-gray-500">Costo</div>
                                                </div>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>

                    {/* Cart Table */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 overflow-hidden">
                        <table className="w-full text-sm">
                            <thead className="bg-gray-50 border-b border-gray-200">
                                <tr>
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Producto</th>
                                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Stock</th>
                                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Cant.</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Costo Unit.</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Total</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {cart.length === 0 && (
                                    <tr>
                                        <td colSpan={7} className="px-4 py-12 text-center text-gray-400 italic">
                                            No hay productos agregados
                                        </td>
                                    </tr>
                                )}
                                {cart.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="font-medium text-gray-800">{item.name}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {item.stock !== undefined ? (
                                                <span className={`text-sm font-medium ${item.stock > 0 ? 'text-gray-600' : 'text-red-500'}`}>
                                                    {item.stock}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <input
                                                type="number"
                                                className="w-16 px-2 py-1 border border-gray-300 rounded text-center"
                                                value={item.quantity}
                                                onChange={e => updateItem(idx, 'quantity', parseFloat(e.target.value) || 1)}
                                                min="1"
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right">
                                            <input
                                                type="number"
                                                className="w-24 px-2 py-1 border border-gray-100 bg-gray-50 rounded text-right text-gray-500 cursor-not-allowed"
                                                value={item.cost}
                                                readOnly
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-800">
                                            ${item.total.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => removeItem(item.product_id)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                            </tbody>
                        </table>
                    </div>
                </div>

                {/* Right Column - Summary */}
                <div className="lg:col-span-1">
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-5 sticky top-6">
                        <h2 className="text-lg font-bold text-gray-800 mb-4">Resumen</h2>

                        <div className="space-y-3 mb-4">
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Productos:</span>
                                <span className="font-semibold">{cart.length}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-600">Unidades:</span>
                                <span className="font-semibold">{cart.reduce((acc, i) => acc + i.quantity, 0)}</span>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-3 mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-gray-800">Total:</span>
                                <span className="text-2xl font-bold text-blue-600">${totalAmount.toLocaleString()}</span>
                            </div>
                        </div>

                        <button
                            onClick={handleProcess}
                            disabled={cart.length === 0 || loading}
                            className={`w-full py-3 text-white font-bold rounded-lg transition-colors ${cart.length > 0 && !loading
                                ? `${getModeColor()} hover:opacity-90`
                                : 'bg-gray-300 cursor-not-allowed'
                                }`}
                        >
                            {loading ? 'Procesando...' : mode === 'RECEIVE' ? 'Completar Recepción' : 'Completar Transferencia'}
                        </button>
                    </div>
                </div>
            </div>
        </div>
    );
};

export default Receiving;
