import { useState, useEffect, useRef } from 'react';
import { useBranch } from '../context/BranchContext';
import { productsService, salesService, type Product } from '../api/services';
import api from '../api/axios';
import { Search, Trash2, ShoppingCart } from 'lucide-react';
import SaleSuccessModal from '../components/SaleSuccessModal';

// Types
interface CartItem extends Product {
    cartId: string;
    quantity: number;
    discountPercent: number;
    price: number;
    stock?: number;
    professional_id?: string | null;
    professional_name?: string | null;
}

const POS = () => {
    const { currentBranch } = useBranch();

    // State
    const [scanQuery, setScanQuery] = useState('');
    const [cart, setCart] = useState<CartItem[]>([]);
    const [selectedClient, setSelectedClient] = useState<any>(null);
    const [clientQuery, setClientQuery] = useState('');
    const [clients, setClients] = useState<any[]>([]);
    const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
    const [loading, setLoading] = useState(false);
    const [paymentMethod, setPaymentMethod] = useState('CASH');
    const [amountReceived, setAmountReceived] = useState(0);
    const [showSuccessModal, setShowSuccessModal] = useState(false);
    const [completedSale, setCompletedSale] = useState<any>(null);
    const [professionals, setProfessionals] = useState<any[]>([]);
    const [currentSession, setCurrentSession] = useState<any>(null);
    const [checkingSession, setCheckingSession] = useState(true);

    const searchInputRef = useRef<HTMLInputElement>(null);
    const clientSearchRef = useRef<HTMLInputElement>(null);

    // Initial Focus and Data
    useEffect(() => {
        clientSearchRef.current?.focus();
        loadProfessionals();
        checkCashSession();
    }, [currentBranch]);

    const loadProfessionals = async () => {
        try {
            const res = await api.get('/users/');
            setProfessionals(res.data.filter((e: any) => {
                const isVet = e.role === 'veterinarian' || e.roles?.includes('veterinarian');
                const isGroomer = e.role === 'groomer' || e.roles?.includes('groomer');
                return (isVet || isGroomer) && e.is_active;
            }));
        } catch (e) {
            console.error(e);
        }
    };

    const checkCashSession = async () => {
        if (!currentBranch) return;
        setCheckingSession(true);
        try {
            const branchId = currentBranch._id || currentBranch.id;
            const res = await api.get(`/cash/current?branch_id=${branchId}`);
            setCurrentSession(res.data);
        } catch (e) {
            console.error(e);
        } finally {
            setCheckingSession(false);
        }
    };

    // Search Clients
    useEffect(() => {
        if (!clientQuery) {
            setClients([]);
            return;
        }
        const delay = setTimeout(async () => {
            try {
                const res = await api.get(`/tutors?search=${clientQuery}&role=client`);
                setClients(res.data);
            } catch (e) {
                console.error(e);
            }
        }, 500);
        return () => clearTimeout(delay);
    }, [clientQuery]);

    // Search Products
    useEffect(() => {
        if (!scanQuery || scanQuery.length < 1) {
            setProductSuggestions([]);
            return;
        }
        const delay = setTimeout(async () => {
            try {
                const { items } = await productsService.getAll({
                    search: scanQuery,
                    branch_id: currentBranch?.id || currentBranch?._id
                });
                setProductSuggestions(items.slice(0, 5));
            } catch (e) {
                console.error(e);
                setProductSuggestions([]);
            }
        }, 300);
        return () => clearTimeout(delay);
    }, [scanQuery, currentBranch]);

    // Update cart items when client selected/changed
    useEffect(() => {
        if (cart.length > 0) {
            const discount = selectedClient?.discount_percent || 0;
            setCart(currentCart => currentCart.map(item => ({
                ...item,
                discountPercent: discount
            })));
        }
    }, [selectedClient]);

    // Add Item
    const handleScan = async (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter' && scanQuery) {
            if (productSuggestions.length > 0) {
                addToCart(productSuggestions[0]);
                setScanQuery('');
                setProductSuggestions([]);
            } else {
                setLoading(true);
                try {
                    const { items } = await productsService.getAll({
                        search: scanQuery,
                        branch_id: currentBranch?.id || currentBranch?._id
                    });
                    if (items.length > 0) {
                        addToCart(items[0]);
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
        addToCart(product);
        setScanQuery('');
        setProductSuggestions([]);
    };

    const addToCart = (product: Product) => {
        const productId = product.id || product._id;
        console.log(`Adding product to cart. Name: ${product.name}, ID: ${productId}`);

        // Only group if there's a valid ID and it matches
        const existing = productId && cart.find(i => (i.id === productId || i._id === productId));

        if (existing) {
            setCart(cart.map(i => (i.id === productId || i._id === productId) ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setCart([...cart, {
                ...product,
                cartId: Math.random().toString(36).substr(2, 9),
                quantity: 1,
                discountPercent: selectedClient?.discount_percent || 0,
                price: product.sale_price,
                stock: product.stock,
                professional_id: null,
                professional_name: null
            }]);
        }
    };

    const updateQuantity = (index: number, newQty: number) => {
        if (newQty < 1) return;
        const newCart = [...cart];
        newCart[index].quantity = newQty;
        setCart(newCart);
    };

    const removeFromCart = (index: number) => {
        setCart(cart.filter((_, i) => i !== index));
    };

    const updateProfessional = (index: number, profId: string) => {
        const prof = professionals.find(p => (p._id || p.id) === profId);
        const newCart = [...cart];
        newCart[index].professional_id = profId;
        newCart[index].professional_name = prof ? `${prof.name || ''} ${prof.last_name || ''}`.trim() : null;
        setCart(newCart);
    };

    // Totals
    const subtotal = cart.reduce((acc, item) => acc + (item.price * item.quantity), 0);
    const totalDiscount = cart.reduce((acc, item) => acc + (item.price * item.quantity * (item.discountPercent / 100)), 0);
    const grandTotal = subtotal - totalDiscount;
    const changeDue = amountReceived - grandTotal;

    const handleCheckout = async () => {
        // Client is optional now
        // if (!selectedClient) {
        //     alert('Debe seleccionar un cliente');
        //     return;
        // }
        if (cart.length === 0) {
            alert('El carrito está vacío');
            return;
        }

        if (!currentBranch) {
            alert('Debe seleccionar una sucursal para realizar la venta');
            return;
        }

        if (paymentMethod === 'DEBT' && !selectedClient) {
            alert('Debe seleccionar un cliente para dejar la venta como deuda.');
            return;
        }

        if (paymentMethod === 'CASH' && amountReceived < grandTotal) {
            alert('El monto recibido debe ser mayor o igual al total de la venta.');
            return;
        }

        setLoading(true);
        try {
            // Calculate totals
            const discountAmount = cart.reduce((acc, item) =>
                acc + (item.price * item.quantity * (item.discountPercent / 100)), 0
            );

            const saleData = {
                branch_id: currentBranch?._id || currentBranch?.id,
                customer_id: selectedClient ? (selectedClient._id || selectedClient.id) : null,
                items: cart.map(i => {
                    const itemSubtotal = i.price * i.quantity;
                    const itemDiscount = itemSubtotal * (i.discountPercent / 100);
                    const itemTotal = itemSubtotal - itemDiscount;

                    return {
                        product_id: i.id || i._id,
                        name: i.name,
                        type: i.kind || 'PRODUCT',
                        quantity: i.quantity,
                        unit_price: i.price,
                        total: itemTotal,
                        category: i.category,
                        professional_id: i.professional_id,
                        professional_name: i.professional_name
                    };
                }),
                subtotal: subtotal,
                discount_percent: 0, // Global discount (not used in this version)
                discount_amount: discountAmount,
                total: grandTotal,
                payment_method: paymentMethod,
                cash_received: paymentMethod === 'CASH' ? amountReceived : null,
                cash_change: paymentMethod === 'CASH' ? changeDue : null,
                cash_session_id: currentSession?._id || currentSession?.id,
                create_delivery: false
            };

            const createdSale = await salesService.create(saleData);

            // Show success modal with sale details
            setCompletedSale({
                ...createdSale,
                items: saleData.items,
                branch_name: currentBranch?.name,
                created_at: new Date().toISOString(),
                customer_email: selectedClient?.email
            });
            setShowSuccessModal(true);

            // Clear cart and form
            setCart([]);
            setSelectedClient(null);
            setClientQuery('');
            setAmountReceived(0);
        } catch (error: any) {
            console.error('Error completo:', error);
            const errorMsg = typeof error?.response?.data?.detail === 'object'
                ? JSON.stringify(error?.response?.data?.detail, null, 2)
                : (error?.response?.data?.detail || 'Error al procesar la venta');
            alert(errorMsg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen bg-gray-50 p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <ShoppingCart className="text-blue-400" /> Punto de Venta
                </h1>

                {checkingSession ? (
                    <span className="text-sm text-gray-400 animate-pulse">Verificando caja...</span>
                ) : currentSession ? (
                    <div className="flex items-center gap-2 bg-green-50 text-green-700 px-3 py-1 rounded-full border border-green-200 text-sm">
                        <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
                        Caja Abierta
                    </div>
                ) : (
                    <div className="flex items-center gap-2 bg-red-50 text-red-700 px-3 py-1 rounded-full border border-red-200 text-sm">
                        <div className="w-2 h-2 bg-red-500 rounded-full"></div>
                        Caja Cerrada - Debe abrir caja para vender
                    </div>
                )}
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Left Column - Main Content */}
                <div className="lg:col-span-2 space-y-6">
                    {/* Client Section */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Cliente / Tutor</label>
                        {!selectedClient ? (
                            <div className="relative">
                                <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                <input
                                    ref={clientSearchRef}
                                    className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                    placeholder="Buscar por nombre..."
                                    value={clientQuery}
                                    onChange={e => setClientQuery(e.target.value)}
                                />
                                {clientQuery && clients.length > 0 && (
                                    <div className="absolute top-full left-0 w-full bg-white shadow-xl rounded-lg border border-gray-200 mt-1 max-h-48 overflow-y-auto z-50">
                                        {clients.map(c => (
                                            <div
                                                key={c._id}
                                                className="p-3 hover:bg-blue-50 cursor-pointer border-b last:border-b-0"
                                                onClick={() => {
                                                    setSelectedClient(c);
                                                    setClientQuery('');
                                                }}
                                            >
                                                <div className="font-semibold text-gray-800">{c.first_name ? `${c.first_name} ${c.last_name}` : c.name}</div>
                                                <div className="text-xs text-gray-500">{c.phone}</div>
                                            </div>
                                        ))}
                                    </div>
                                )}
                            </div>
                        ) : (
                            <div className="flex items-center justify-between bg-blue-50 p-3 rounded-lg border border-blue-200">
                                <div>
                                    <div className="font-semibold text-gray-800">Cliente: <span className="text-blue-700">{selectedClient.first_name ? `${selectedClient.first_name} ${selectedClient.last_name}` : selectedClient.name}</span></div>
                                    <div className="text-xs text-gray-600">{selectedClient.phone}</div>
                                </div>
                                <button
                                    onClick={() => {
                                        setSelectedClient(null);
                                        setClientQuery('');
                                    }}
                                    className="text-sm text-blue-600 hover:underline font-medium"
                                >
                                    Quitar
                                </button>
                            </div>
                        )}
                    </div>

                    {/* Product Search */}
                    <div className="bg-white rounded-lg shadow-sm border border-gray-200 p-4">
                        <label className="block text-sm font-semibold text-gray-700 mb-2">Agregar Productos / Servicios</label>
                        <div className="relative">
                            <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                            <input
                                ref={searchInputRef}
                                className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                placeholder="Buscar producto o servicio..."
                                value={scanQuery}
                                onChange={e => setScanQuery(e.target.value)}
                                onKeyDown={handleScan}
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
                                                    <div className="flex items-center gap-2">
                                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded font-mono">ID {product.external_id || '-'}</span>
                                                        <span className="text-[10px] bg-gray-100 text-gray-500 px-1 rounded font-mono">{product.sku || '-'}</span>
                                                    </div>
                                                    <div className="font-semibold text-gray-900">{product.name}</div>
                                                </div>
                                                <div className="text-right">
                                                    <div className="font-bold text-green-600">${product.sale_price.toLocaleString()}</div>
                                                    <div className="text-xs text-gray-500">
                                                        {product.kind === 'PRODUCT' ? (
                                                            <>Stock: {['veterinaria', 'peluquería', 'peluqueria'].includes(product.category?.toLowerCase() || '') ? '-' : (product.stock ?? '-')}</>
                                                        ) : 'Servicio'}
                                                        {product.category && <span className="text-blue-400 ml-1">• {product.category}</span>}
                                                    </div>
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
                                    <th className="px-4 py-3 text-left font-semibold text-gray-700">Ítem</th>
                                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Profesional</th>
                                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Stock</th>
                                    <th className="px-4 py-3 text-center font-semibold text-gray-700">Cant.</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Precio</th>
                                    <th className="px-4 py-3 text-right font-semibold text-gray-700">Total</th>
                                    <th className="px-4 py-3"></th>
                                </tr>
                            </thead>
                            <tbody className="divide-y divide-gray-100">
                                {cart.map((item, idx) => (
                                    <tr key={idx} className="hover:bg-gray-50">
                                        <td className="px-4 py-3">
                                            <div className="flex items-center gap-2 mb-0.5">
                                                <span className="text-[9px] text-gray-400 font-mono">ID: {item.external_id || '-'}</span>
                                                <span className="text-[9px] text-gray-400 font-mono">SKU: {item.sku || '-'}</span>
                                            </div>
                                            <div className="font-medium text-gray-800">{item.name}</div>
                                            <div className="text-[10px] text-gray-400 font-mono uppercase italic">{item.kind}</div>
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {(item.kind !== 'PRODUCT' || item.category === 'Veterinaria' || item.category === 'Peluquería') ? (
                                                <select
                                                    className="text-xs border rounded p-1 max-w-[120px]"
                                                    value={item.professional_id || ''}
                                                    onChange={(e) => updateProfessional(idx, e.target.value)}
                                                >
                                                    <option value="">Seleccionar...</option>
                                                    {professionals
                                                        .filter(p => {
                                                            const isVet = p.role === 'veterinarian' || p.roles?.includes('veterinarian');
                                                            const isGroomer = p.role === 'groomer' || p.roles?.includes('groomer');

                                                            if (item.category === 'Veterinaria') return isVet;
                                                            if (item.category === 'Peluquería') return isVet || isGroomer;
                                                            return true;
                                                        })
                                                        .map(p => (
                                                            <option key={p._id || p.id} value={p._id || p.id}>{p.name || ''} {p.last_name || ''}</option>
                                                        ))}
                                                </select>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            {item.kind === 'PRODUCT' && item.stock !== undefined ? (
                                                <span className={`text-sm font-medium ${item.stock > 0 ? 'text-gray-600' : 'text-red-500'}`}>
                                                    {['veterinaria', 'peluquería', 'peluqueria'].includes(item.category?.toLowerCase() || '') ? '-' : item.stock}
                                                </span>
                                            ) : (
                                                <span className="text-gray-400">-</span>
                                            )}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <input
                                                type="number"
                                                min="1"
                                                className="w-16 text-center border rounded p-1"
                                                value={item.quantity}
                                                onChange={(e) => updateQuantity(idx, parseInt(e.target.value) || 1)}
                                            />
                                        </td>
                                        <td className="px-4 py-3 text-right font-medium text-gray-700">
                                            ${item.price.toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-right font-bold text-gray-800">
                                            ${(item.price * item.quantity).toLocaleString()}
                                        </td>
                                        <td className="px-4 py-3 text-center">
                                            <button
                                                onClick={() => removeFromCart(idx)}
                                                className="text-red-500 hover:text-red-700"
                                            >
                                                <Trash2 size={16} />
                                            </button>
                                        </td>
                                    </tr>
                                ))}
                                {cart.length === 0 && (
                                    <tr>
                                        <td colSpan={6} className="px-4 py-12 text-center text-gray-400 italic">
                                            No hay productos en el carrito
                                        </td>
                                    </tr>
                                )}
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
                                <span className="text-gray-600">Subtotal:</span>
                                <span className="font-semibold">${subtotal.toLocaleString()}</span>
                            </div>
                            {totalDiscount > 0 && (
                                <div className="flex justify-between text-sm">
                                    <span className="text-green-600">Descuento:</span>
                                    <span className="font-semibold text-green-600">-${totalDiscount.toLocaleString()}</span>
                                </div>
                            )}
                            <div className="flex justify-between text-sm pt-2 border-t border-dashed border-gray-200">
                                <span className="text-gray-500">Neto:</span>
                                <span className="font-medium text-gray-700">${Math.round(grandTotal / 1.19).toLocaleString()}</span>
                            </div>
                            <div className="flex justify-between text-sm">
                                <span className="text-gray-500">IVA (19%):</span>
                                <span className="font-medium text-gray-700">${Math.round(grandTotal - (grandTotal / 1.19)).toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="border-t border-gray-200 pt-3 mb-4">
                            <div className="flex justify-between items-center">
                                <span className="text-lg font-bold text-gray-800">Total:</span>
                                <span className="text-2xl font-bold text-blue-600">${grandTotal.toLocaleString()}</span>
                            </div>
                        </div>

                        <div className="mb-4">
                            <label className="block text-sm font-semibold text-gray-700 mb-2">Método de Pago</label>
                            <select
                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                value={paymentMethod}
                                onChange={e => setPaymentMethod(e.target.value)}
                            >
                                <option value="CASH">Efectivo</option>
                                <option value="DEBIT">Débito</option>
                                <option value="CREDIT">Crédito</option>
                                <option value="TRANSFER">Transferencia</option>
                                <option value="DEBT">Deuda</option>
                            </select>
                        </div>

                        {paymentMethod === 'CASH' && (
                            <>
                                <div className="mb-4">
                                    <label className="block text-sm font-semibold text-gray-700 mb-2">Monto Recibido</label>
                                    <input
                                        type="number"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                        value={amountReceived}
                                        onChange={e => setAmountReceived(parseFloat(e.target.value) || 0)}
                                        placeholder="0"
                                    />
                                </div>

                                {amountReceived > 0 && (
                                    <div className={`mb-4 p-3 rounded-lg border ${amountReceived >= grandTotal ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
                                        <div className="flex justify-between items-center">
                                            <span className="text-sm font-semibold text-gray-700">
                                                {amountReceived >= grandTotal ? 'Vuelto:' : 'Falta:'}
                                            </span>
                                            <span className={`text-xl font-bold ${amountReceived >= grandTotal ? 'text-green-700' : 'text-red-600'}`}>
                                                ${Math.abs(changeDue).toLocaleString()}
                                            </span>
                                        </div>
                                    </div>
                                )}
                            </>
                        )}

                        <button
                            onClick={handleCheckout}
                            disabled={cart.length === 0 || loading || !currentSession || (paymentMethod === 'CASH' && amountReceived < grandTotal)}
                            className="w-full py-3 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
                        >
                            {loading ? 'Procesando...' : !currentSession ? 'Caja Cerrada' : 'Completar Venta'}
                        </button>
                    </div>
                </div>
            </div>

            {/* Sale Success Modal */}
            <SaleSuccessModal
                isOpen={showSuccessModal}
                onClose={() => {
                    setShowSuccessModal(false);
                    setCompletedSale(null);
                }}
                sale={completedSale}
                storeName="CalFer"
            />
        </div>
    );
};

export default POS;
