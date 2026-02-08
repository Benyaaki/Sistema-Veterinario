import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import api from '../api/axios';
import {
    Calendar as CalendarIcon, User,
    ChevronRight, ShoppingCart, Clock, Tag
} from 'lucide-react';

interface CommissionSummary {
    professional_id: string;
    name: string;
    total: number;
    count: number;
}

interface CommissionDetail {
    sale_id: string;
    created_at: string;
    product_name: string;
    quantity: number;
    unit_price: number;
    total: number;
    customer_name: string;
    category: string;
}

const Commissions = () => {
    const { hasAnyRole } = useAuth();
    const [loading, setLoading] = useState(false);
    const [detailsLoading, setDetailsLoading] = useState(false);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [summaries, setSummaries] = useState<CommissionSummary[]>([]);
    const [selectedProfessional, setSelectedProfessional] = useState<CommissionSummary | null>(null);
    const [details, setDetails] = useState<CommissionDetail[]>([]);

    useEffect(() => {
        loadSummaries();
    }, [date]);

    const loadSummaries = async () => {
        setLoading(true);
        try {
            const res = await api.get('/reports/commissions', {
                params: { start: date, end: date }
            });
            setSummaries(res.data);
            if (selectedProfessional) {
                // Refresh details if one is selected
                loadDetails(selectedProfessional.professional_id);
            }
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    const loadDetails = async (profId: string) => {
        setDetailsLoading(true);
        try {
            const res = await api.get('/reports/commissions/details', {
                params: { start: date, end: date, professional_id: profId }
            });
            setDetails(res.data);
        } catch (error) {
            console.error(error);
        } finally {
            setDetailsLoading(false);
        }
    };

    const handleSelectProfessional = (prof: CommissionSummary) => {
        setSelectedProfessional(prof);
        loadDetails(prof.professional_id);
    };

    const formatTime = (dateString: string) => {
        if (!dateString) return '--:--';
        // Ensure the date string has a timezone indicator (Z) for correct UTC-to-local conversion
        const isoString = dateString.endsWith('Z') || dateString.includes('+') ? dateString : `${dateString}Z`;
        return new Date(isoString).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit', hour12: true });
    };

    if (!hasAnyRole(['admin', 'superadmin'])) {
        return <div className="p-8 text-center">Acceso denegado</div>;
    }

    return (
        <div className="max-w-6xl mx-auto">
            <div className="flex justify-between items-center mb-6">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">
                        Control de Comisiones
                    </h1>
                    <p className="text-gray-500 text-sm">Resumen de ventas por profesional</p>
                </div>

                <div className="flex items-center gap-2 bg-white p-2 rounded-xl shadow-sm border">
                    <CalendarIcon size={18} className="text-gray-400" />
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        className="outline-none text-sm font-medium"
                    />
                </div>
            </div>

            <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                {/* Professionals List */}
                <div className="lg:col-span-1 space-y-4">
                    <h3 className="font-semibold text-gray-700 px-1">Profesionales</h3>
                    {loading && summaries.length === 0 ? (
                        <div className="bg-white p-8 rounded-xl border text-center text-gray-400">Cargando...</div>
                    ) : summaries.length === 0 ? (
                        <div className="bg-white p-8 rounded-xl border text-center text-gray-400 italic">
                            No hay ventas registradas para este día.
                        </div>
                    ) : (
                        summaries.map((prof) => (
                            <button
                                key={prof.professional_id}
                                onClick={() => handleSelectProfessional(prof)}
                                className={`w-full text-left p-4 rounded-xl border transition-all ${selectedProfessional?.professional_id === prof.professional_id
                                    ? 'bg-primary text-white border-primary shadow-lg scale-[1.02]'
                                    : 'bg-white text-gray-800 border-gray-200 hover:border-primary hover:shadow-md'
                                    }`}
                            >
                                <div className="flex justify-between items-start mb-2">
                                    <div className="flex items-center gap-2">
                                        <div className={`p-2 rounded-lg ${selectedProfessional?.professional_id === prof.professional_id ? 'bg-white/20' : 'bg-gray-100'}`}>
                                            <User size={18} />
                                        </div>
                                        <span className="font-bold">{prof.name}</span>
                                    </div>
                                    <ChevronRight size={18} className={selectedProfessional?.professional_id === prof.professional_id ? 'text-white' : 'text-gray-400'} />
                                </div>
                                <div className="flex justify-between items-end">
                                    <span className="text-xs opacity-80">{prof.count} atenciones</span>
                                    <span className="text-xl font-black">${prof.total.toLocaleString()}</span>
                                </div>
                            </button>
                        ))
                    )}
                </div>

                {/* Details Breakdown */}
                <div className="lg:col-span-2">
                    {!selectedProfessional ? (
                        <div className="h-full min-h-[400px] bg-gray-50 border-2 border-dashed border-gray-200 rounded-2xl flex flex-col items-center justify-center text-gray-400 p-8 text-center">
                            <ShoppingCart size={48} className="mb-4 opacity-20" />
                            <p>Selecciona un profesional para ver el desglose detallado de sus ventas.</p>
                        </div>
                    ) : (
                        <div className="bg-white rounded-2xl border shadow-sm overflow-hidden animate-in fade-in slide-in-from-right-4 duration-300">
                            <div className="p-6 border-b bg-gray-50/50">
                                <div className="flex justify-between items-center">
                                    <div className="flex items-center gap-3">
                                        <div className="w-12 h-12 bg-primary/10 text-primary rounded-full flex items-center justify-center font-bold text-xl">
                                            {selectedProfessional.name.charAt(0)}
                                        </div>
                                        <div>
                                            <h2 className="text-lg font-bold text-gray-900">
                                                {selectedProfessional.name}
                                            </h2>
                                            <p className="text-sm text-gray-500 capitalize">
                                                {new Date(date + 'T12:00:00').toLocaleDateString('es-CL', { weekday: 'long', day: 'numeric', month: 'long' })}
                                            </p>
                                        </div>
                                    </div>
                                    <div className="text-right">
                                        <div className="text-2xl font-black text-primary">${selectedProfessional.total.toLocaleString()}</div>
                                        <div className="text-xs text-gray-400 uppercase font-bold tracking-wider">Total Generado</div>
                                    </div>
                                </div>
                            </div>

                            <div className="p-0">
                                {detailsLoading ? (
                                    <div className="p-12 text-center text-gray-400">Cargando detalles...</div>
                                ) : details.length === 0 ? (
                                    <div className="p-12 text-center text-gray-400 italic">No se encontraron detalles.</div>
                                ) : (
                                    <div className="overflow-x-auto">
                                        <table className="w-full text-left">
                                            <thead className="bg-gray-50 text-gray-500 text-xs font-bold uppercase tracking-wider">
                                                <tr>
                                                    <th className="px-6 py-4">Hora</th>
                                                    <th className="px-6 py-4">Producto / Servicio</th>
                                                    <th className="px-6 py-4">Cliente</th>
                                                    <th className="px-6 py-4 text-right">Cant.</th>
                                                    <th className="px-6 py-4 text-right">Total</th>
                                                </tr>
                                            </thead>
                                            <tbody className="divide-y divide-gray-100">
                                                {details.map((item, idx) => (
                                                    <tr key={idx} className="hover:bg-gray-50 transition-colors">
                                                        <td className="px-6 py-4">
                                                            <div className="flex items-center gap-2 text-gray-500">
                                                                <Clock size={14} />
                                                                {formatTime(item.created_at)}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4">
                                                            <div className="font-medium text-gray-900">{item.product_name}</div>
                                                            <div className="flex items-center gap-1 text-[10px] text-primary font-bold uppercase">
                                                                <Tag size={10} />
                                                                {item.category}
                                                            </div>
                                                        </td>
                                                        <td className="px-6 py-4 text-gray-600 text-sm">
                                                            {item.customer_name}
                                                        </td>
                                                        <td className="px-6 py-4 text-right font-mono text-gray-500">
                                                            x{item.quantity}
                                                        </td>
                                                        <td className="px-6 py-4 text-right">
                                                            <span className="font-bold text-gray-900">${item.total.toLocaleString()}</span>
                                                        </td>
                                                    </tr>
                                                ))}
                                            </tbody>
                                        </table>
                                    </div>
                                )}
                            </div>
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
};

export default Commissions;
