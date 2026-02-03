import { useState, useEffect } from 'react';
import { salesService, type Sale } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { Calendar, DollarSign, Clock, CreditCard, ChevronLeft, ChevronRight } from 'lucide-react';

const MyDailySales = () => {
    const { user } = useAuth();
    const [sales, setSales] = useState<Sale[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedDebtSale, setSelectedDebtSale] = useState<Sale | null>(null);
    const [stats, setStats] = useState({ total: 0, count: 0 });
    const [currentDate, setCurrentDate] = useState(new Date());

    useEffect(() => {
        loadMySales();
    }, [currentDate]);

    const loadMySales = async () => {
        try {
            setLoading(true);
            // Calculate Start/End of Selected Day in LOCAL time, sent as ISO
            const startOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 0, 0, 0).toISOString();
            const endOfDay = new Date(currentDate.getFullYear(), currentDate.getMonth(), currentDate.getDate(), 23, 59, 59).toISOString();

            const data = await salesService.getMySales({ start_date: startOfDay, end_date: endOfDay });
            console.log("DEBUG: My Sales Data:", data);

            // Data is already filtered by backend
            setSales(data);
            setStats({
                total: data.reduce((sum, s) => sum + s.total, 0),
                count: data.length
            });
        } catch (error) {
            console.error("Error loading sales", error);
        } finally {
            setLoading(false);
        }
    };

    const handlePrevDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() - 1);
        setCurrentDate(newDate);
    };

    const handleNextDay = () => {
        const newDate = new Date(currentDate);
        newDate.setDate(currentDate.getDate() + 1);
        setCurrentDate(newDate);
    };

    if (loading) return <div className="p-8 text-center text-secondary-500">Cargando historial...</div>;

    // State for Debt Modal


    // Group sales by date
    const salesByDate: { [key: string]: Sale[] } = {};
    sales.forEach(sale => {
        const dateKey = new Date(sale.created_at).toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' });
        if (!salesByDate[dateKey]) salesByDate[dateKey] = [];
        salesByDate[dateKey].push(sale);
    });

    return (
        <div className="p-6 space-y-6">
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
                <h1 className="text-2xl font-bold text-gray-800 flex items-center gap-2">
                    <Calendar className="text-blue-400" /> Mis Ventas Diarias
                </h1>

                <div className="flex items-center gap-2 bg-white p-2 rounded-lg shadow-sm border border-gray-100">
                    <button
                        onClick={handlePrevDay}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                    >
                        <ChevronLeft size={20} />
                    </button>

                    <div className="px-4 py-1 text-center min-w-[180px]">
                        <span className="block font-bold text-gray-800 capitalize">
                            {currentDate.toLocaleDateString('es-ES', { weekday: 'long', day: 'numeric', month: 'long' })}
                        </span>
                    </div>

                    <button
                        onClick={handleNextDay}
                        className="p-2 hover:bg-gray-100 rounded-full text-gray-600 transition-colors"
                        disabled={currentDate.toDateString() === new Date().toDateString()} // Optional: Disable future? No, maybe they want to check
                    >
                        <ChevronRight size={20} />
                    </button>
                </div>
            </div>

            {/* Summary Cards */}
            <div className="grid grid-cols-2 gap-4 max-w-lg">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm">Total Período</p>
                    <p className="text-2xl font-bold text-primary flex items-center">
                        <DollarSign size={20} />
                        {stats.total.toLocaleString()}
                    </p>
                </div>
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-100">
                    <p className="text-gray-500 text-sm">Transacciones</p>
                    <p className="text-2xl font-bold text-gray-800">
                        {stats.count}
                    </p>
                </div>
            </div>

            {/* Lists Grouped by Date */}
            <div className="space-y-6">
                {Object.keys(salesByDate).length === 0 ? (
                    <div className="bg-white p-8 rounded-xl text-center text-gray-400">
                        No hay ventas registradas en el período.
                    </div>
                ) : (
                    Object.entries(salesByDate).map(([dateLabel, daySales]) => (
                        <div key={dateLabel} className="space-y-2">
                            <h3 className="text-sm font-bold text-gray-500 uppercase tracking-wider ml-1">{dateLabel}</h3>
                            <div className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden">
                                <table className="w-full text-sm text-left">
                                    <thead className="bg-brand-surface text-gray-600 font-medium border-b border-brand-accent/30">
                                        <tr>
                                            <th className="p-4">Hora</th>
                                            <th className="p-4">Medio</th>
                                            <th className="p-4">Productos / Servicios</th>
                                            <th className="p-4">Pago</th>
                                            <th className="p-4 text-right">Total</th>
                                        </tr>
                                    </thead>
                                    <tbody className="divide-y divide-gray-100">
                                        {daySales.map((sale) => (
                                            <tr key={sale.id || sale._id} className="hover:bg-brand-bg transition-colors">
                                                <td className="p-4 text-gray-600 font-mono">
                                                    <div className="flex items-center gap-2">
                                                        <Clock size={16} />
                                                        {(() => {
                                                            // Ensure proper UTC parsing. If string is naive (missing Z or offset), treat as UTC.
                                                            let dateStr = sale.created_at;
                                                            if (!dateStr.endsWith('Z') && !dateStr.includes('+')) {
                                                                dateStr += 'Z';
                                                            }
                                                            return new Date(dateStr).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
                                                        })()}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span className={`px-2 py-1 rounded text-xs font-bold uppercase ${sale.channel === 'DELIVERY' ? 'bg-orange-100 text-orange-700' : 'bg-blue-100 text-blue-700'
                                                        }`}>
                                                        {sale.channel === 'DELIVERY' ? 'Despacho' : 'Local'}
                                                    </span>
                                                </td>
                                                <td className="p-4">
                                                    <div className="space-y-1">
                                                        {sale.items.map((item, idx) => (
                                                            <div key={idx} className="flex justify-between max-w-md">
                                                                <span className="text-gray-900">{item.quantity}x {item.name}</span>
                                                                <span className="text-xs text-gray-400 font-mono">${item.total.toLocaleString()}</span>
                                                            </div>
                                                        ))}
                                                        {sale.items.length > 3 && (
                                                            <span className="text-xs text-gray-400 italic">... y más</span>
                                                        )}
                                                    </div>
                                                </td>
                                                <td className="p-4">
                                                    <span
                                                        className={`inline-flex items-center px-2 py-1 rounded text-xs font-bold uppercase
                                                        ${sale.payment_method === 'CASH' ? 'bg-green-100 text-green-700' :
                                                                sale.payment_method === 'DEBT' ? 'bg-red-100 text-red-700 cursor-pointer hover:bg-red-200' :
                                                                    'bg-brand-surface text-primary'}
                                                        `}
                                                        title={sale.payment_method === 'DEBT' ? (sale.customer_name ? `Deuda a: ${sale.customer_name}` : 'Cliente desconocido') : ''}
                                                        onClick={() => {
                                                            if (sale.payment_method === 'DEBT') {
                                                                setSelectedDebtSale(sale);
                                                            }
                                                        }}
                                                    >
                                                        <CreditCard size={12} className="mr-1" />
                                                        {(() => {
                                                            switch (sale.payment_method) {
                                                                case 'CASH': return 'Efectivo';
                                                                case 'DEBIT': return 'Débito';
                                                                case 'CREDIT': return 'Crédito';
                                                                case 'TRANSFER': return 'Transferencia';
                                                                case 'DEBT': return 'Deuda';
                                                                default: return sale.payment_method;
                                                            }
                                                        })()}
                                                    </span>
                                                </td>
                                                <td className="p-4 text-right font-bold text-gray-900">
                                                    ${sale.total.toLocaleString()}
                                                </td>
                                            </tr>
                                        ))}
                                    </tbody>
                                </table>
                            </div>
                        </div>
                    ))
                )}
            </div>

            {/* Debt Detail Modal */}
            {selectedDebtSale && (
                <div
                    className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center p-4 z-50"
                    onClick={() => setSelectedDebtSale(null)}
                >
                    <div
                        className="bg-white rounded-xl shadow-xl max-w-md w-full p-6 animate-in fade-in zoom-in duration-200"
                        onClick={(e) => e.stopPropagation()}
                    >
                        <div className="text-center space-y-4">
                            <div className="mx-auto w-12 h-12 bg-red-100 rounded-full flex items-center justify-center">
                                <CreditCard className="text-red-600" size={24} />
                            </div>

                            <h3 className="text-xl font-bold text-gray-900">Detalle de Deuda</h3>

                            <div className="bg-brand-surface p-4 rounded-lg space-y-2">
                                <div>
                                    <p className="text-xs text-gray-500 uppercase font-bold">Cliente / Tutor</p>
                                    <p className="text-lg font-medium text-gray-900">
                                        {selectedDebtSale.customer_name || "Nombre no registrado"}
                                    </p>
                                </div>
                                <div className="pt-2 border-t border-brand-accent/30">
                                    <p className="text-xs text-gray-500 uppercase font-bold">Monto de la Deuda</p>
                                    <p className="text-2xl font-bold text-red-600">
                                        ${selectedDebtSale.total.toLocaleString()}
                                    </p>
                                </div>
                            </div>

                            <p className="text-sm text-gray-500">
                                Esta venta está registrada como deuda pendiente de pago.
                            </p>

                            <button
                                onClick={() => setSelectedDebtSale(null)}
                                className="w-full py-2.5 bg-gray-900 text-white rounded-lg hover:bg-gray-800 font-medium transition-colors"
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
};

export default MyDailySales;
