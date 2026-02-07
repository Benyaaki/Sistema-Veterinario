import { useState, useEffect } from 'react';
import { deliveriesService, usersService, productsService, salesService, customersService, type DeliveryOrder, type Product } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { useBranch } from '../context/BranchContext';
import { Truck, CheckCircle, Plus, Search, MapPin, User, Clock, Trash2 } from 'lucide-react';

interface CartItem extends Product {
    quantity: number;
}

const Deliveries = () => {
    const { hasAnyRole } = useAuth();
    const { currentBranch } = useBranch();
    const [deliveries, setDeliveries] = useState<DeliveryOrder[]>([]);
    const [dispatchers, setDispatchers] = useState<any[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [scanQuery, setScanQuery] = useState('');
    const [productSuggestions, setProductSuggestions] = useState<Product[]>([]);
    const [cart, setCart] = useState<CartItem[]>([]);

    // State for Customer Mode
    const [customerMode, setCustomerMode] = useState<'SYSTEM' | 'GUEST'>('GUEST'); // Default to Guest or System? Let's say Guest for ease, or System for debt. User asked for choice.
    const [customerSearch, setCustomerSearch] = useState('');
    const [customerSuggestions, setCustomerSuggestions] = useState<any[]>([]);
    const [selectedCustomer, setSelectedCustomer] = useState<any | null>(null);
    const [guestName, setGuestName] = useState('');
    const [guestContact, setGuestContact] = useState('');

    // Form State
    const [address, setAddress] = useState('');
    const [paymentStatus, setPaymentStatus] = useState<'PAID_CASH' | 'PAID_TRANSFER' | 'DEBT'>('PAID_CASH');
    const [scheduledAt, setScheduledAt] = useState(''); // ISO string or simple datetime-local value
    const [shippingCost, setShippingCost] = useState(1000); // Default 1000

    // Debounced Customer Search
    useEffect(() => {
        if (customerMode !== 'SYSTEM' || !customerSearch || customerSearch.length < 1) {
            setCustomerSuggestions([]);
            return;
        }
        const delay = setTimeout(async () => {
            try {
                const res = await customersService.getAll({
                    search: customerSearch,
                    role: 'client'
                });
                setCustomerSuggestions(res.slice(0, 5));
            } catch (e) {
                console.error(e);
            }
        }, 300);
        return () => clearTimeout(delay);
    }, [customerSearch, customerMode]);

    const selectCustomer = (c: any) => {
        setSelectedCustomer(c);
        setCustomerSearch(c.first_name ? `${c.first_name} ${c.last_name}` : c.name); // Use split name from Tutor model
        setCustomerSuggestions([]);
        // Auto-fill address if available
        if (c.address) setAddress(c.address);
    };

    const loadData = async () => {
        setIsLoading(true);
        try {
            const [delData, usersData] = await Promise.all([
                deliveriesService.getPending(),
                usersService.getAll('delivery') // Assuming 'delivery' role exists, otherwise fallback to all
            ]);
            setDeliveries(delData);
            console.log("DEBUG: Deliveries Data", delData);
            setDispatchers(usersData);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadData();
    }, []);

    // Search Products Logic (Simplified from POS)
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
            }
        }, 300);
        return () => clearTimeout(delay);
    }, [scanQuery, currentBranch]);

    const addToCart = (product: Product) => {
        const existing = cart.find(i => (i.id || i._id) === (product.id || product._id));
        if (existing) {
            setCart(cart.map(i => (i.id || i._id) === (product.id || product._id) ? { ...i, quantity: i.quantity + 1 } : i));
        } else {
            setCart([...cart, { ...product, quantity: 1 }]);
        }
        setScanQuery('');
        setProductSuggestions([]);
    };

    const removeFromCart = (idx: number) => {
        setCart(cart.filter((_, i) => i !== idx));
    };

    const handleCreateDelivery = async () => {
        if (cart.length === 0) return alert('Agregue productos');
        if (!address) return alert('Ingrese dirección');
        if (customerMode === 'SYSTEM' && !selectedCustomer) return alert('Seleccione un cliente del sistema');
        if (customerMode === 'GUEST') {
            if (!guestName) return alert('Ingrese nombre del cliente');
            if (!guestContact) return alert('Ingrese teléfono de contacto');
        }

        // Validation: Guests cannot have DEBT
        if (customerMode === 'GUEST' && paymentStatus === 'DEBT') {
            return alert('Clientes ocasionales no pueden tener deuda. Registre el pago o use un cliente del sistema.');
        }

        try {
            const productsTotal = cart.reduce((sum, item) => sum + (item.sale_price * item.quantity), 0);
            const total = productsTotal + shippingCost;

            // Map payment status to Sale fields
            let paymentMethod = 'CASH';
            if (paymentStatus === 'PAID_TRANSFER') paymentMethod = 'TRANSFER';
            if (paymentStatus === 'DEBT') paymentMethod = 'DEBT'; // Logic in backend handles debt

            const saleData = {
                branch_id: currentBranch?.id || currentBranch?._id,
                items: [
                    ...cart.map(i => ({
                        product_id: i.id || i._id,
                        name: i.name,
                        type: i.kind || 'PRODUCT',
                        quantity: i.quantity,
                        unit_price: i.sale_price,
                        total: i.sale_price * i.quantity
                    })),
                    // Add Shipping as a Service Item to keep totals correct in Sale
                    {
                        name: 'Costo de Envío',
                        type: 'SERVICE', // or SHIPPING if supported
                        quantity: 1,
                        unit_price: shippingCost,
                        total: shippingCost
                    }
                ],
                customer_id: customerMode === 'SYSTEM' ? (selectedCustomer.id || selectedCustomer._id) : undefined,
                customer_name: customerMode === 'SYSTEM' ? selectedCustomer.name : guestName,
                subtotal: total,
                discount_percent: 0,
                discount_amount: 0,
                total: total,
                payment_method: paymentMethod,
                create_delivery: true,
                delivery_info: {
                    customer_snapshot: {
                        address,
                        name: customerMode === 'SYSTEM' ? (selectedCustomer.first_name ? `${selectedCustomer.first_name} ${selectedCustomer.last_name}` : selectedCustomer.name) : guestName,
                        phone: customerMode === 'SYSTEM' ? selectedCustomer.phone : guestContact
                    },
                    shipping_cost: shippingCost,
                    assigned_user_id: null,
                    scheduled_at: scheduledAt ? new Date(scheduledAt).toISOString() : null
                }
            };

            await salesService.create(saleData);
            alert('Despacho creado con éxito');
            setShowModal(false);
            setCart([]);
            setAddress('');
            setScheduledAt('');
            setGuestName('');
            setGuestContact('');
            setCustomerSearch('');
            setSelectedCustomer(null);
            setCustomerMode('GUEST');
            loadData();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.detail || 'Error al crear despacho');
        }
    };

    const markAsDelivered = async (id: string) => {
        if (!confirm('¿Marcar como entregado?')) return;
        try {
            await deliveriesService.updateStatus(id, 'DELIVERED');
            loadData();
        } catch (error) {
            console.error(error);
            alert('Error al actualizar estado');
        }
    };

    const handleDeleteDelivery = async (id: string, e: React.MouseEvent) => {
        e.stopPropagation();
        if (!confirm('¿Eliminar despacho? Esto anulará la venta y devolverá el stock.')) return;
        try {
            await deliveriesService.delete(id);
            alert('Despacho eliminado');
            loadData();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.detail || 'Error al eliminar');
        }
    };

    if (isLoading) return <div className="p-8 text-center text-secondary-500">Cargando despachos...</div>;

    return (
        <div className="p-6 space-y-6">
            <div className="flex justify-between items-center">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Truck className="text-blue-400" /> Gestión de Despachos
                </h1>
                <button
                    onClick={() => setShowModal(true)}
                    className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:bg-primary/90 transition-colors"
                >
                    <Plus size={20} /> Nuevo Despacho
                </button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {deliveries.length === 0 ? (
                    <div className="col-span-full text-center py-12 bg-white rounded-xl border border-gray-200">
                        <p className="text-gray-500">No hay despachos pendientes.</p>
                    </div>
                ) : (
                    deliveries.map((delivery) => (
                        <div key={delivery.id || delivery._id} className="bg-white p-5 rounded-xl shadow-sm border border-gray-200 flex flex-col justify-between relative overflow-hidden">
                            {/* Status Stripe */}
                            <div className={`absolute top-0 left-0 w-1 h-full ${delivery.status === 'PENDING' ? 'bg-yellow-400' : 'bg-green-500'}`}></div>

                            <div>
                                <div className="flex justify-between items-start mb-4 pl-3">
                                    <span className={`text-xs font-bold px-2 py-1 rounded uppercase ${delivery.status === 'PENDING' ? 'bg-yellow-100 text-yellow-800' :
                                        delivery.status === 'ASSIGNED' ? 'bg-blue-100 text-blue-800' :
                                            delivery.status === 'DELIVERED' ? 'bg-green-100 text-green-800' :
                                                'bg-gray-100 text-gray-800'
                                        }`}>
                                        {
                                            {
                                                'PENDING': 'Pendiente',
                                                'ASSIGNED': 'Asignado',
                                                'IN_TRANSIT': 'En Camino',
                                                'DELIVERED': 'Entregado',
                                                'FAILED': 'Fallido'
                                            }[delivery.status] || delivery.status
                                        }
                                    </span>
                                    <div className="text-right">
                                        <div className="text-xs text-gray-500">{new Date(delivery.created_at).toLocaleDateString()}</div>
                                        {delivery.scheduled_at && (
                                            <div className="text-xs font-bold text-blue-600 flex items-center justify-end gap-1 mt-1">
                                                <Clock size={10} />
                                                {new Date(delivery.scheduled_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                            </div>
                                        )}
                                    </div>
                                </div>

                                <div className="pl-3 mb-4">
                                    <div className="flex flex-col gap-1 mb-3">
                                        <div className="flex items-start gap-2 text-sm text-gray-700">
                                            <MapPin size={16} className="text-gray-400 mt-0.5" />
                                            <span className="font-medium">{delivery.customer_snapshot?.address || 'Sin dirección'}</span>
                                        </div>
                                        {delivery.assigned_user_id && (
                                            <div className="flex items-center gap-2 text-sm text-gray-600">
                                                <User size={16} className="text-gray-400" />
                                                <span>
                                                    {dispatchers.find(u => (u.id || u._id) === delivery.assigned_user_id)?.name || 'Repartidor'}
                                                </span>
                                            </div>
                                        )}
                                    </div>

                                    <div className="bg-gray-50 p-3 rounded-lg space-y-2">
                                        <div className="flex justify-between items-center text-sm font-bold text-gray-800 border-b border-gray-200 pb-2">
                                            <span>Total</span>
                                            <span>${(delivery.sale_details?.total || 0).toLocaleString()}</span>
                                        </div>
                                        <ul className="space-y-1">
                                            {delivery.sale_details?.items.map((item, idx) => (
                                                <li key={idx} className="text-xs text-gray-600 flex justify-between">
                                                    <span>{item.quantity}x {item.name}</span>
                                                    <span>${item.unit_price.toLocaleString()}</span>
                                                </li>
                                            ))}
                                        </ul>
                                    </div>
                                </div>
                            </div>

                            <div className="pl-3 mt-auto flex gap-2">
                                <button
                                    onClick={() => markAsDelivered(delivery.id || delivery._id || '')}
                                    className="flex-1 py-2 bg-primary text-white rounded-lg font-medium text-sm transition-colors flex justify-center items-center gap-2 shadow-sm hover:bg-primary/90"
                                >
                                    <CheckCircle size={16} /> Entregado
                                </button>
                                {hasAnyRole(['admin', 'superadmin']) && (
                                    <button
                                        onClick={(e) => handleDeleteDelivery(delivery.id || delivery._id || '', e)}
                                        className="px-3 py-2 bg-red-100 hover:bg-red-200 text-red-600 rounded-lg transition-colors flex justify-center items-center shadow-sm"
                                        title="Eliminar despacho"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                )}
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* New Delivery Modal */}
            {showModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center p-4 z-50 backdrop-blur-sm">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50 rounded-t-xl">
                            <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                                <Truck className="text-blue-600" /> Nuevo Despacho
                            </h2>
                            <button onClick={() => setShowModal(false)} className="text-gray-400 hover:text-gray-600">
                                ✕
                            </button>
                        </div>

                        <div className="p-6 space-y-6">
                            {/* Product Search */}
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Buscar Productos</label>
                                <div className="relative">
                                    <Search className="absolute left-3 top-3 text-gray-400" size={18} />
                                    <input
                                        className="w-full pl-10 pr-4 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="Escanear o buscar..."
                                        value={scanQuery}
                                        onChange={e => setScanQuery(e.target.value)}
                                    />
                                    {/* Suggestions */}
                                    {productSuggestions.length > 0 && (
                                        <div className="absolute top-full left-0 w-full bg-white shadow-lg rounded-lg border border-gray-100 mt-1 z-10">
                                            {productSuggestions.map(p => (
                                                <div
                                                    key={p.id || p._id}
                                                    onClick={() => addToCart(p)}
                                                    className="p-3 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 flex justify-between items-center"
                                                >
                                                    <span className="font-medium text-gray-800">{p.name}</span>
                                                    <span className="text-sm font-bold text-blue-600">${p.sale_price.toLocaleString()}</span>
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            </div>

                            {/* Cart */}
                            <div className="border border-gray-200 rounded-lg overflow-hidden">
                                <div className="bg-gray-50 px-4 py-2 text-xs font-bold text-gray-500 uppercase tracking-wider flex justify-between">
                                    <span>Producto</span>
                                    <span>Total</span>
                                </div>
                                <div className="divide-y divide-gray-100 max-h-40 overflow-y-auto">
                                    {cart.length === 0 ? (
                                        <div className="p-4 text-center text-gray-400 text-sm">Carrito vacío</div>
                                    ) : (
                                        cart.map((item, idx) => (
                                            <div key={idx} className="p-3 flex justify-between items-center text-sm">
                                                <div>
                                                    <div className="font-medium text-gray-800">{item.name}</div>
                                                    <div className="text-xs text-gray-500">{item.quantity} x ${item.sale_price.toLocaleString()}</div>
                                                </div>
                                                <div className="flex items-center gap-4">
                                                    <span className="font-bold text-gray-800">${(item.sale_price * item.quantity).toLocaleString()}</span>
                                                    <button onClick={() => removeFromCart(idx)} className="text-red-500 hover:text-red-700">
                                                        <Trash2 size={16} />
                                                    </button>
                                                </div>
                                            </div>
                                        ))
                                    )}
                                </div>
                                <div className="bg-gray-50 px-4 py-3 flex justify-between items-center border-t border-gray-200">
                                    <span className="font-bold text-gray-700">Subtotal Productos</span>
                                    <span className="font-bold text-gray-800">
                                        ${cart.reduce((sum, i) => sum + (i.sale_price * i.quantity), 0).toLocaleString()}
                                    </span>
                                </div>
                                <div className="bg-gray-50 px-4 py-2 flex justify-between items-center border-t border-gray-200">
                                    <span className="font-bold text-gray-700">Costo Envío</span>
                                    <span className="font-bold text-blue-600">${shippingCost.toLocaleString()}</span>
                                </div>
                                <div className="bg-blue-50 px-4 py-3 flex justify-between items-center border-t border-blue-100">
                                    <span className="font-bold text-lg text-blue-800">Total a Pagar</span>
                                    <span className="font-bold text-xl text-blue-800">
                                        ${(cart.reduce((sum, i) => sum + (i.sale_price * i.quantity), 0) + shippingCost).toLocaleString()}
                                    </span>
                                </div>
                            </div>

                            {/* Details Grid */}
                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Costo de Envío</label>
                                    <input
                                        type="range"
                                        min="1000"
                                        max="5000"
                                        step="500"
                                        className="w-full h-2 bg-gray-200 rounded-lg appearance-none cursor-pointer"
                                        value={shippingCost}
                                        onChange={e => setShippingCost(parseInt(e.target.value))}
                                    />
                                    <div className="flex justify-between text-xs text-gray-500 mt-1">
                                        <span>$1.000</span>
                                        <span className="font-bold text-blue-600">${shippingCost.toLocaleString()}</span>
                                        <span>$5.000</span>
                                    </div>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Dirección de Entrega</label>
                                    <input
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        placeholder="Calle, Número, Comuna..."
                                        value={address}
                                        onChange={e => setAddress(e.target.value)}
                                    />
                                </div>
                                <div className="col-span-1 md:col-span-2">
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Cliente</label>
                                    <div className="flex bg-gray-100 rounded-lg p-1 mb-2">
                                        <button
                                            className={`flex-1 py-1 text-xs font-bold rounded-md transition-colors ${customerMode === 'GUEST' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                                            onClick={() => {
                                                setCustomerMode('GUEST');
                                                if (paymentStatus === 'DEBT') setPaymentStatus('PAID_CASH');
                                            }}
                                        >
                                            Ocasional
                                        </button>
                                        <button
                                            className={`flex-1 py-1 text-xs font-bold rounded-md transition-colors ${customerMode === 'SYSTEM' ? 'bg-white shadow text-primary' : 'text-gray-500'}`}
                                            onClick={() => setCustomerMode('SYSTEM')}
                                        >
                                            Cliente Sistema
                                        </button>
                                    </div>

                                    {customerMode === 'GUEST' ? (
                                        <div className="space-y-2">
                                            <input
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                placeholder="Nombre del Cliente"
                                                value={guestName}
                                                onChange={e => setGuestName(e.target.value)}
                                            />
                                            <input
                                                className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                                placeholder="Teléfono de Contacto"
                                                value={guestContact}
                                                onChange={e => setGuestContact(e.target.value)}
                                            />
                                        </div>
                                    ) : (
                                        <div className="relative">
                                            <Search className="absolute left-3 top-3 text-gray-400" size={16} />
                                            <input
                                                className={`w-full pl-9 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 ${selectedCustomer ? 'border-green-500 bg-green-50' : 'border-gray-300'}`}
                                                placeholder="Buscar cliente..."
                                                value={customerSearch}
                                                onChange={e => {
                                                    setCustomerSearch(e.target.value);
                                                    setSelectedCustomer(null);
                                                }}
                                            />
                                            {customerSuggestions.length > 0 && (
                                                <div className="absolute top-full left-0 w-full bg-white shadow-lg rounded-lg border border-gray-100 mt-1 z-20 max-h-40 overflow-y-auto">
                                                    {customerSuggestions.map(c => (
                                                        <div
                                                            key={c.id || c._id}
                                                            onClick={() => selectCustomer(c)}
                                                            className="p-2 hover:bg-gray-50 cursor-pointer border-b last:border-b-0 text-sm"
                                                        >
                                                            <div className="font-bold text-gray-800">{c.first_name ? `${c.first_name} ${c.last_name}` : c.name}</div>
                                                            <div className="text-xs text-gray-500 font-mono">{c.phone || 'Sin Teléfono'}{c.rut ? ` • ${c.rut}` : ''}</div>
                                                        </div>
                                                    ))}
                                                </div>
                                            )}
                                        </div>
                                    )}
                                </div>

                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Método de Pago</label>
                                    <select
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 bg-white"
                                        value={paymentStatus}
                                        onChange={e => setPaymentStatus(e.target.value as any)}
                                    >
                                        <option value="PAID_CASH">Efectivo</option>
                                        <option value="PAID_TRANSFER">Transferencia</option>
                                        {customerMode === 'SYSTEM' && (
                                            <option value="DEBT">Deudado</option>
                                        )}
                                    </select>
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Programar Entrega</label>
                                    <input
                                        type="datetime-local"
                                        className="w-full px-3 py-2 border border-gray-300 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500"
                                        value={scheduledAt}
                                        onChange={e => setScheduledAt(e.target.value)}
                                    />
                                </div>
                            </div>
                        </div>

                        <div className="p-6 border-t border-gray-100 bg-gray-50 rounded-b-xl flex gap-3 justify-end">
                            <button
                                onClick={() => setShowModal(false)}
                                className="px-4 py-2 text-gray-600 hover:text-gray-800 font-medium"
                            >
                                Cancelar
                            </button>
                            <button
                                onClick={handleCreateDelivery}
                                className="px-6 py-2 bg-primary text-white rounded-lg font-bold hover:bg-primary/90 shadow-md transition-all transform hover:scale-105"
                            >
                                Crear Despacho
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Deliveries;
