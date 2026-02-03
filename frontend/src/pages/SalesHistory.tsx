import { useState, useEffect } from 'react';
import { salesService, type Sale } from '../api/services';
import { useAuth } from '../context/AuthContext';
import { FileText, RotateCcw } from 'lucide-react';

const SalesHistory = () => {
    const { hasAnyRole } = useAuth();
    const isAdmin = hasAnyRole(['admin', 'superadmin']);
    const [sales, setSales] = useState<Sale[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const loadSales = async () => {
        try {
            const data = await salesService.getAll({ limit: 50 });
            setSales(data);
        } catch (error) {
            console.error(error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        loadSales();
    }, []);

    const handleVoid = async (saleId: string) => {
        if (!confirm("¿Está seguro de anular esta venta? Esto revertirá el stock.")) return;

        try {
            await salesService.voidSale(saleId, "Anulada desde Historial");
            loadSales(); // Refresh
        } catch (error: any) {
            alert(error.response?.data?.detail || "Error al anular");
        }
    };

    if (isLoading) return <div className="p-8 text-center text-secondary-500">Cargando ventas...</div>;

    return (
        <div className="p-6 space-y-6">
            <h1 className="text-2xl font-bold text-secondary-800 flex items-center gap-2">
                <FileText className="text-blue-400" /> Historial de Ventas
            </h1>

            <div className="bg-white rounded-xl shadow-sm border border-secondary-200 overflow-hidden">
                <table className="w-full text-sm text-left">
                    <thead className="bg-secondary-50 text-secondary-600 font-medium">
                        <tr>
                            <th className="p-3">Fecha</th>
                            <th className="p-3">ID</th>
                            <th className="p-3 text-right">Total</th>
                            <th className="p-3 text-center">Pago</th>
                            <th className="p-3 text-center">Estado</th>
                            <th className="p-3 text-right">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-secondary-100">
                        {sales.map((sale) => (
                            <tr key={sale.id || sale._id} className="hover:bg-secondary-50">
                                <td className="p-3 text-secondary-600">
                                    {new Date(sale.created_at).toLocaleString()}
                                </td>
                                <td className="p-3 font-mono text-xs text-secondary-500">{sale.id || sale._id}</td>
                                <td className="p-3 text-right font-bold text-secondary-800">${sale.total.toLocaleString()}</td>
                                <td className="p-3 text-center text-xs font-medium bg-gray-100 rounded-full px-2 py-1 inline-block mx-auto mt-2">
                                    {sale.payment_method}
                                </td>
                                <td className="p-3 text-center">
                                    <span className={`px-2 py-1 rounded text-xs font-medium ${sale.status === 'COMPLETED' ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {sale.status}
                                    </span>
                                </td>
                                <td className="p-3 text-right">
                                    {isAdmin && sale.status === 'COMPLETED' && (
                                        <button
                                            onClick={() => handleVoid(sale.id || sale._id || '')}
                                            className="text-red-500 hover:text-red-700 text-xs flex items-center gap-1 ml-auto"
                                        >
                                            <RotateCcw size={14} /> Anular
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
};

export default SalesHistory;
