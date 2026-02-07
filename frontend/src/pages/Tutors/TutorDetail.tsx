import { useState, useEffect } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../../api/axios';
import {
    Phone, Calendar, Activity,
    ArrowLeft, PawPrint, Clock, CheckCircle, XCircle,
    ShoppingBag, ChevronDown, ChevronUp, ExternalLink, Plus
} from 'lucide-react';
import { formatPhoneNumber } from '../../utils/formatters';

const TutorDetail = () => {
    const { id } = useParams();
    const navigate = useNavigate();
    const [data, setData] = useState<any>(null);
    const [loading, setLoading] = useState(true);
    const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
    const [expandedSale, setExpandedSale] = useState<string | null>(null);
    const [expandedDate, setExpandedDate] = useState<string | null>(null);
    const [activeTab, setActiveTab] = useState<'profile' | 'purchases'>('profile');

    useEffect(() => {
        const fetchData = async () => {
            try {
                const [detailsRes, salesRes] = await Promise.all([
                    api.get(`/tutors/${id}/details`),
                    api.get(`/sales/customer/${id}`)
                ]);
                setData(detailsRes.data);
                setPurchaseHistory(salesRes.data);
            } catch (error) {
                console.error("Error fetching tutor details", error);
            } finally {
                setLoading(false);
            }
        };
        fetchData();
    }, [id]);

    if (loading) return <div className="p-8 text-center text-gray-500">Cargando perfil...</div>;
    if (!data) return <div className="p-8 text-center text-red-500">Tutor no encontrado</div>;

    const { tutor, patients, consultations, stats } = data;

    return (
        <div className="max-w-6xl mx-auto space-y-6 pb-10">
            {/* Header / Navigation */}
            <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-2">
                <div className="flex items-center space-x-4">
                    <button
                        onClick={() => navigate(-1)}
                        className="p-2 hover:bg-white rounded-lg transition-colors text-gray-500"
                    >
                        <ArrowLeft className="w-6 h-6" />
                    </button>
                    <h1 className="text-2xl font-bold text-gray-800">Perfil del Tutor</h1>
                </div>

                <div className="flex bg-white p-1 rounded-xl border shadow-sm">
                    <button
                        onClick={() => setActiveTab('profile')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'profile' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Información General
                    </button>
                    <button
                        onClick={() => setActiveTab('purchases')}
                        className={`px-6 py-2 rounded-lg text-sm font-bold transition-all ${activeTab === 'purchases' ? 'bg-primary text-white shadow-md' : 'text-gray-500 hover:text-gray-700'}`}
                    >
                        Historial de Compras ({purchaseHistory.length})
                    </button>
                </div>
            </div>

            {activeTab === 'profile' ? (
                <>
                    {/* Profile Card & Stats */}
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                        {/* Tutor Info */}
                        <div className="md:col-span-2 bg-white rounded-xl shadow-sm border p-6">
                            <div className="flex items-start justify-between">
                                <div className="flex items-center space-x-4">
                                    <div className="w-16 h-16 bg-gradient-to-br from-primary to-teal-600 rounded-full flex items-center justify-center text-white text-2xl font-bold shadow-md">
                                        {tutor.first_name?.[0]}
                                    </div>
                                    <div>
                                        <h2 className="text-2xl font-bold text-gray-900">{tutor.first_name} {tutor.last_name}</h2>
                                        <p className="text-gray-500 text-sm">Registrado el {new Date(tutor.created_at).toLocaleDateString()}</p>
                                    </div>
                                </div>
                                <div className="flex gap-2">
                                    <Link
                                        to={`/tutores/editar/${tutor._id || id}`}
                                        className="bg-primary/10 text-primary px-4 py-2 rounded-lg text-sm font-medium hover:bg-primary/20 transition-colors flex items-center"
                                    >
                                        ✏️ Editar Datos
                                    </Link>
                                    <Link
                                        to={`/tutores`}
                                        className="bg-gray-100 text-gray-600 px-4 py-2 rounded-lg text-sm font-medium hover:bg-gray-200 transition-colors"
                                    >
                                        Cerrar Ficha
                                    </Link>
                                </div>
                            </div>

                            <div className="mt-8 grid grid-cols-1 md:grid-cols-2 gap-6">
                                <div className="flex items-center space-x-3 text-gray-700 bg-gray-50 p-3 rounded-lg">
                                    <Phone className="w-5 h-5 text-primary" />
                                    <span className="font-medium">{formatPhoneNumber(tutor.phone)}</span>
                                </div>
                                <div className="flex items-center space-x-3 text-gray-700 bg-gray-50 p-3 rounded-lg">
                                    <Activity className="w-5 h-5 text-primary" />
                                    {tutor.email ? (
                                        <a href={`mailto:${tutor.email}`} className="hover:underline truncate" title={tutor.email}>
                                            {tutor.email}
                                        </a>
                                    ) : (
                                        <span className="text-gray-400 italic">Sin email registrado</span>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Stats Card */}
                        <div className="bg-gradient-to-br from-gray-900 to-gray-800 rounded-xl shadow-lg p-6 text-white">
                            <h3 className="text-lg font-semibold mb-6 flex items-center opacity-90">
                                <Calendar className="w-5 h-5 mr-2 text-teal-300" />
                                Resumen Clínico
                            </h3>
                            <div className="space-y-6">
                                <div className="flex justify-between items-end">
                                    <span className="text-gray-300 text-sm">Total Consultas</span>
                                    <span className="text-3xl font-bold">{stats.total_appointments}</span>
                                </div>

                                <div className="h-2 bg-gray-700 rounded-full overflow-hidden flex">
                                    <div
                                        className="h-full bg-teal-400"
                                        style={{ width: stats.total_appointments ? `${(stats.attended / stats.total_appointments) * 100}%` : '0%' }}
                                    />
                                    <div
                                        className="h-full bg-red-400"
                                        style={{ width: stats.total_appointments ? `${(stats.no_shows / stats.total_appointments) * 100}%` : '0%' }}
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-4 pt-2">
                                    <div className="bg-white/10 p-3 rounded-lg border border-white/5">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <CheckCircle className="w-4 h-4 text-teal-300" />
                                            <span className="text-xs font-medium text-teal-100">Asistidas</span>
                                        </div>
                                        <span className="text-xl font-bold">{stats.attended}</span>
                                    </div>
                                    <div className="bg-white/10 p-3 rounded-lg border border-white/5">
                                        <div className="flex items-center space-x-2 mb-1">
                                            <XCircle className="w-4 h-4 text-red-300" />
                                            <span className="text-xs font-medium text-red-100">Faltas</span>
                                        </div>
                                        <span className="text-xl font-bold">{stats.no_shows}</span>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>

                    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
                        {/* Pets List */}
                        <div className="lg:col-span-1 space-y-6">
                            <div className="bg-white rounded-xl shadow-sm border p-6">
                                <h3 className="font-bold text-gray-800 mb-4 flex items-center">
                                    <PawPrint className="w-5 h-5 mr-2 text-primary" />
                                    Mascotas Relacionadas ({patients.length})
                                </h3>
                                <div className="space-y-3">
                                    {patients.length > 0 ? patients.map((patient: any) => (
                                        <Link
                                            key={patient._id}
                                            to={`/patients/${patient._id}`}
                                            className="flex items-center p-3 bg-gray-50 rounded-lg hover:bg-teal-50 hover:shadow-sm transition-all border border-transparent hover:border-teal-100 group"
                                        >
                                            <div className="w-10 h-10 bg-white rounded-full flex items-center justify-center text-lg shadow-sm group-hover:scale-110 transition-transform">
                                                {patient.species === 'Perro' ? '🐕' : patient.species === 'Gato' ? '🐈' : '🐾'}
                                            </div>
                                            <div className="ml-3">
                                                <p className="font-bold text-gray-900 group-hover:text-primary transition-colors">{patient.name}</p>
                                                <p className="text-xs text-gray-500">{patient.breed} • {patient.sex}</p>
                                            </div>
                                        </Link>
                                    )) : (
                                        <p className="text-gray-500 text-sm italic py-4 text-center">Sin mascotas registradas</p>
                                    )}
                                </div>
                            </div>
                        </div>

                        {/* Recent Consultations */}
                        <div className="lg:col-span-2">
                            <div className="bg-white rounded-xl shadow-sm border p-6 text-sm">
                                <h3 className="font-bold text-gray-800 mb-6 flex items-center border-b pb-4">
                                    <Clock className="w-5 h-5 mr-2 text-primary" />
                                    Historial Cronológico de Citas
                                </h3>

                                {consultations.length > 0 ? (
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-4">
                                        {consultations.map((consultation: any) => (
                                            <div key={consultation._id} className="relative pl-6 border-l-2 border-gray-100 last:mb-0 hover:bg-gray-50/50 p-3 rounded-r-lg transition-colors">
                                                <div className={`absolute -left-[9px] top-4 w-4 h-4 rounded-full border-2 border-white shadow-sm
                                                    ${consultation.status === 'attended' ? 'bg-green-500' :
                                                        consultation.status === 'no_show' ? 'bg-red-500' : 'bg-blue-400'}
                                                `}></div>

                                                <div className="flex justify-between items-start mb-1">
                                                    <div>
                                                        <p className="font-semibold text-gray-900">
                                                            {new Date(consultation.date).toLocaleDateString('es-CL', {
                                                                day: '2-digit', month: 'long', year: 'numeric'
                                                            })}
                                                            <span className="text-gray-400 font-normal mx-2">|</span>
                                                            {new Date(consultation.date).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                                                        </p>
                                                        <Link to={`/patients/${consultation.patient_id}`} className="text-primary hover:underline text-xs font-medium block mt-1">
                                                            Paciente: {patients.find((p: any) => p._id === consultation.patient_id)?.name || 'Desconocido'}
                                                        </Link>
                                                    </div>
                                                    <span className={`px-2 py-0.5 rounded text-xs font-medium
                                                        ${consultation.status === 'attended' ? 'bg-green-100 text-green-700' :
                                                            consultation.status === 'no_show' ? 'bg-red-100 text-red-700' : 'bg-blue-100 text-blue-700'}
                                                    `}>
                                                        {consultation.status === 'attended' ? 'Asistió' :
                                                            consultation.status === 'no_show' ? 'No Asistió' : 'Agendada'}
                                                    </span>
                                                </div>

                                                <p className="text-gray-600 mt-2 italic">
                                                    "{consultation.reason || 'Sin motivo registrado'}"
                                                </p>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p className="text-center text-gray-500 py-12 italic bg-gray-50 rounded-lg">No hay historial de citas registradas aún.</p>
                                )}
                            </div>
                        </div>
                    </div>
                </>
            ) : (
                <div className="bg-white rounded-xl shadow-sm border p-8">
                    <div className="flex items-center justify-between mb-8 border-b pb-6">
                        <div>
                            <h3 className="text-xl font-bold text-gray-800 flex items-center gap-3">
                                <ShoppingBag className="text-primary" size={24} />
                                Historial Completo de Compras
                            </h3>
                            <p className="text-gray-500 text-sm mt-1">Registro histórico de productos y servicios adquiridos por el cliente</p>
                        </div>
                        <div className="text-right">
                            <p className="text-xs text-gray-400 font-bold uppercase tracking-wider">Inversión Total</p>
                            <p className="text-3xl font-black text-green-600">${stats.total_spent?.toLocaleString()}</p>
                        </div>
                    </div>

                    {purchaseHistory.length > 0 ? (
                        <div className="space-y-4">
                            {Object.entries(
                                purchaseHistory.reduce((acc: any, sale: any) => {
                                    const date = new Date(sale.created_at).toLocaleDateString('es-CL', {
                                        day: '2-digit', month: '2-digit', year: 'numeric'
                                    });
                                    if (!acc[date]) acc[date] = [];
                                    acc[date].push(sale);
                                    return acc;
                                }, {})
                            ).sort((a, b) => {
                                const dateA = a[0].split('/').reverse().join('');
                                const dateB = b[0].split('/').reverse().join('');
                                return dateB.localeCompare(dateA);
                            }).map(([date, sales]: [string, any]) => (
                                <div key={date} className="space-y-3">
                                    <button
                                        onClick={() => setExpandedDate(expandedDate === date ? null : date)}
                                        className="w-full flex justify-between items-center p-3 bg-indigo-50/50 rounded-xl text-indigo-700 font-bold hover:bg-indigo-50 transition-colors border border-indigo-100/50"
                                    >
                                        <div className="flex items-center gap-3">
                                            <Calendar size={18} />
                                            <span>{date}</span>
                                        </div>
                                        <div className="flex items-center gap-4">
                                            <span className="text-sm font-medium opacity-70">{sales.length} {sales.length === 1 ? 'venta' : 'ventas'}</span>
                                            {expandedDate === date ? <ChevronUp size={20} /> : <ChevronDown size={20} />}
                                        </div>
                                    </button>

                                    {expandedDate === date && (
                                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pl-4 animate-in slide-in-from-top-2 duration-200">
                                            {sales.map((sale: any) => (
                                                <div key={sale._id} className="border rounded-2xl overflow-hidden shadow-sm bg-white">
                                                    <div
                                                        className="flex justify-between items-center p-4 bg-gray-50/50 cursor-pointer hover:bg-gray-100 transition-colors"
                                                        onClick={() => setExpandedSale(expandedSale === sale._id ? null : sale._id)}
                                                    >
                                                        <div className="flex gap-4 items-center">
                                                            <div className="p-2 bg-white rounded-lg shadow-sm border border-gray-100">
                                                                <ShoppingBag className="text-indigo-400" size={18} />
                                                            </div>
                                                            <div>
                                                                <p className="font-bold text-gray-900">{new Date(sale.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</p>
                                                                <p className="text-gray-400 font-mono text-[10px]">#{sale._id.slice(-8).toUpperCase()}</p>
                                                            </div>
                                                        </div>
                                                        <div className="flex items-center gap-4">
                                                            <div className="text-right">
                                                                <p className="text-[10px] text-gray-400 font-bold uppercase">
                                                                    {sale.payment_method === 'CASH' ? 'EFECTIVO' :
                                                                        sale.payment_method === 'DEBIT' ? 'DÉBITO' :
                                                                            sale.payment_method === 'CREDIT' ? 'CRÉDITO' :
                                                                                sale.payment_method === 'TRANSFER' ? 'TRANSFERENCIA' :
                                                                                    sale.payment_method === 'DEBT' || sale.payment_method === 'DUE' ? 'DEUDA' :
                                                                                        sale.payment_method}
                                                                </p>
                                                                <p className="text-lg font-bold text-green-600">${sale.total?.toLocaleString()}</p>
                                                            </div>
                                                            {expandedSale === sale._id ? <ChevronUp size={20} className="text-gray-400" /> : <ChevronDown size={20} className="text-gray-400" />}
                                                        </div>
                                                    </div>

                                                    {expandedSale === sale._id && (
                                                        <div className="p-4 border-t bg-white">
                                                            <table className="w-full text-xs">
                                                                <thead className="text-gray-400 font-bold border-b">
                                                                    <tr>
                                                                        <th className="px-2 py-2 text-left">Descripción</th>
                                                                        <th className="px-2 py-2 text-center">Cant.</th>
                                                                        <th className="px-2 py-2 text-right">Subtotal</th>
                                                                    </tr>
                                                                </thead>
                                                                <tbody className="divide-y divide-gray-50">
                                                                    {sale.items?.map((item: any, idx: number) => (
                                                                        <tr key={idx} className="hover:bg-gray-50/50">
                                                                            <td className="px-2 py-2 text-gray-700">{item.name}</td>
                                                                            <td className="px-2 py-2 text-center text-gray-500">{item.quantity}</td>
                                                                            <td className="px-2 py-2 text-right font-bold text-gray-800">${item.total?.toLocaleString()}</td>
                                                                        </tr>
                                                                    ))}
                                                                </tbody>
                                                            </table>
                                                        </div>
                                                    )}
                                                </div>
                                            ))}
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>
                    ) : (
                        <div className="text-center py-20 bg-gray-50 rounded-3xl border-2 border-dashed border-gray-100">
                            <ShoppingBag size={48} className="mx-auto text-gray-200 mb-4" />
                            <p className="text-gray-500 font-medium">Este cliente aún no registra compras en el sistema.</p>
                            <Link to="/ventas/nueva" className="mt-4 inline-flex items-center gap-2 text-primary font-bold hover:underline">
                                <Plus size={16} /> Iniciar primera venta
                            </Link>
                        </div>
                    )}
                </div>
            )}
        </div>
    );
};

export default TutorDetail;
