
import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, Phone, Mail, Edit, User, Plus, X, Trash2, ShoppingBag, ChevronDown, ChevronUp } from 'lucide-react';
import FileImporter from '../components/FileImporter';
import { useAuth } from '../context/AuthContext';

import { formatPhoneNumber } from '../utils/formatters';

const Clients = () => {
    const { hasRole } = useAuth();
    const [tutors, setTutors] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedTutor, setSelectedTutor] = useState<any>(null);
    const [purchaseHistory, setPurchaseHistory] = useState<any[]>([]);
    const [expandedSale, setExpandedSale] = useState<string | null>(null);
    const [expandedDate, setExpandedDate] = useState<string | null>(null);
    const [showHistory, setShowHistory] = useState(false);

    const [filterBy, setFilterBy] = useState<'all' | 'debt' | 'discount'>('all');

    // Edit States
    const [isEditingDiscount, setIsEditingDiscount] = useState(false);
    const [newDiscount, setNewDiscount] = useState('');

    // Debt Payment State
    const [showPayModal, setShowPayModal] = useState(false);
    const [payAmount, setPayAmount] = useState('');


    // Create Modal State
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newTutor, setNewTutor] = useState({
        first_name: '',
        last_name: '',
        phone: '+56 9 ',
        email: '',
        notes: '',
        is_client: true,
        is_tutor: false
    });

    useEffect(() => {
        const fetchTutors = async () => {
            setLoading(true);
            try {
                const role = "client";
                let endpoint = searchTerm
                    ? `/tutors/?search=${searchTerm}&role=${role}`
                    : `/tutors/?limit=1000&role=${role}`;

                if (filterBy !== 'all') {
                    endpoint += `&filter=${filterBy}`;
                }

                const res = await api.get(endpoint);
                setTutors(res.data);
            } catch (error) {
                console.error("Error fetching tutors", error);
            } finally {
                setLoading(false);
            }
        };

        const delay = setTimeout(fetchTutors, 300);
        return () => clearTimeout(delay);
    }, [searchTerm, filterBy]);

    const handleViewTutor = async (tutor: any) => {
        setSelectedTutor(tutor);
        setNewDiscount(tutor.discount_percent?.toString() || '0');
        setIsEditingDiscount(false);
        setPurchaseHistory([]);
        setExpandedSale(null);
        setExpandedDate(null);
        setShowHistory(false); // Reset collapsible when changing tutor

        try {
            const tutorId = tutor.id || tutor._id;
            const [detailsRes, salesRes] = await Promise.all([
                api.get(`/tutors/${tutorId}/details`),
                api.get(`/sales/customer/${tutorId}`)
            ]);

            if (detailsRes.data.stats) {
                setSelectedTutor((prev: any) => ({
                    ...prev,
                    stats: detailsRes.data.stats,
                    debt: detailsRes.data.tutor.debt
                }));
            }
            setPurchaseHistory(salesRes.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handlePayDebt = async () => {
        if (!selectedTutor || !payAmount) return;
        try {
            const amount = parseFloat(payAmount);
            if (isNaN(amount) || amount <= 0) {
                alert('Monto inválido');
                return;
            }

            await api.post(`/tutors/${selectedTutor.id || selectedTutor._id}/pay-debt`, { amount });
            handleViewTutor(selectedTutor);

            const role = "client";
            const endpoint = searchTerm ? `/tutors/?search=${searchTerm}&role=${role}` : `/tutors/?limit=1000&role=${role}`;
            const res = await api.get(endpoint);
            setTutors(res.data);

            setShowPayModal(false);
            setPayAmount('');
            alert('Pago registrado correctamente');
        } catch (error) {
            console.error(error);
            alert('Error al registrar pago');
        }
    };

    const handleUpdateDiscount = async () => {
        if (!selectedTutor) return;
        try {
            const val = parseFloat(newDiscount);
            if (isNaN(val) || val < 0 || val > 100) {
                alert('Por favor ingrese un porcentaje válido (0-100)');
                return;
            }

            const res = await api.put(`/tutors/${selectedTutor.id || selectedTutor._id}`, {
                discount_percent: val
            });

            setSelectedTutor(res.data);
            setTutors(tutors.map(t => (t.id || t._id) === (res.data.id || res.data._id) ? res.data : t));
            setIsEditingDiscount(false);
        } catch (error) {
            console.error("Error updating discount", error);
            alert('Error al actualizar descuento');
        }
    };

    const handleCreateTutor = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            await api.post('/tutors/', newTutor);
            setNewTutor({
                first_name: '', last_name: '', phone: '+56 9 ', email: '', notes: '', is_client: true, is_tutor: false
            });
            setShowCreateModal(false);
            const role = "client";
            const res = await api.get(searchTerm ? `/tutors/?search=${searchTerm}&role=${role}` : `/tutors/?limit=1000&role=${role}`);
            setTutors(res.data);
            alert('Cliente creado');
        } catch (error) {
            console.error(error);
        }
    };

    const handleDeleteClient = async () => {
        if (!selectedTutor) return;
        if (!confirm('¿Eliminar cliente?')) return;
        try {
            await api.delete(`/tutors/${selectedTutor.id || selectedTutor._id}`);
            setSelectedTutor(null);
            const role = "client";
            const res = await api.get(searchTerm ? `/tutors/?search=${searchTerm}&role=${role}` : `/tutors/?limit=1000&role=${role}`);
            setTutors(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <User className="text-blue-400" /> Clientes
                </h1>
                <div className="flex items-center gap-3">
                    {hasRole('admin') && (
                        <FileImporter label="Clientes" endpoint="/api/v1/import/tutors" onSuccess={() => { }} />
                    )}
                </div>
            </div>

            <div className="flex flex-col gap-4 mb-6">
                <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 flex flex-col md:flex-row gap-4 items-center">
                    <div className="relative flex-1 w-full">
                        <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                        <input
                            type="text"
                            placeholder="Buscar por nombre, teléfono o email..."
                            className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                            value={searchTerm}
                            onChange={e => setSearchTerm(e.target.value)}
                        />
                    </div>
                    {hasRole('admin') && (
                        <button
                            onClick={() => setShowCreateModal(true)}
                            className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2"
                        >
                            <Plus size={20} /> Nuevo Cliente
                        </button>
                    )}
                </div>

                <div className="flex gap-2">
                    {['all', 'debt', 'discount'].map(f => (
                        <button
                            key={f}
                            onClick={() => setFilterBy(f as any)}
                            className={`px-4 py-2 rounded-lg text-sm font-medium ${filterBy === f ? 'bg-slate-800 text-white' : 'bg-white border'}`}
                        >
                            {f === 'all' ? 'Todos' : f === 'debt' ? 'Con Deuda' : 'Con Descuento'}
                        </button>
                    ))}
                </div>
            </div>

            <div className="flex gap-6 flex-col lg:flex-row">
                <div className="flex-1 space-y-3">
                    {loading ? <p>Cargando...</p> : tutors.map(tutor => (
                        <div
                            key={tutor.id || tutor._id}
                            onClick={() => handleViewTutor(tutor)}
                            className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer hover:border-blue-300 ${selectedTutor?._id === (tutor.id || tutor._id) || selectedTutor?.id === (tutor.id || tutor._id) ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}`}
                        >
                            <div className="flex justify-between items-center">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full text-blue-600 relative">
                                        <User size={20} />
                                        {tutor.debt > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{tutor.first_name} {tutor.last_name}</h3>
                                        <p className="text-sm text-gray-500">{formatPhoneNumber(tutor.phone)}</p>
                                    </div>
                                </div>
                            </div>
                        </div>
                    ))}
                </div>

                <div className="w-full lg:w-1/3">
                    {selectedTutor ? (
                        <div className="bg-white rounded-xl shadow-sm border p-6 sticky top-6">
                            <div className="flex justify-between mb-4">
                                <h2 className="text-xl font-bold">{selectedTutor.first_name} {selectedTutor.last_name}</h2>
                                {hasRole('admin') && (
                                    <button onClick={handleDeleteClient} className="text-red-600">
                                        <Trash2 size={20} />
                                    </button>
                                )}
                            </div>

                            <div className="space-y-4">
                                <div className="flex gap-3">
                                    <Phone size={18} className="text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Teléfono</p>
                                        <p className="font-medium">{formatPhoneNumber(selectedTutor.phone)}</p>
                                    </div>
                                </div>
                                <div className="flex gap-3">
                                    <Mail size={18} className="text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Email</p>
                                        <p className="font-medium">{selectedTutor.email || '-'}</p>
                                    </div>
                                </div>

                                <div className="bg-blue-50 p-3 rounded-lg border">
                                    <p className="text-xs font-bold text-blue-800">Total Gastado</p>
                                    <p className="text-lg font-bold text-blue-600">${(selectedTutor.total_spent || selectedTutor.stats?.total_spent || 0).toLocaleString()}</p>
                                </div>

                                <div className={`p-4 rounded-lg border ${selectedTutor.debt > 0 ? 'bg-red-50' : 'bg-green-50'}`}>
                                    <div className="flex justify-between">
                                        <p className="text-sm font-bold">Deuda Actual</p>
                                        {selectedTutor.debt > 0 && hasRole('admin') && (
                                            <button onClick={() => { setPayAmount(selectedTutor.debt.toString()); setShowPayModal(true); }}>
                                                <Edit size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <p className="text-2xl font-bold">${(selectedTutor.debt || 0).toLocaleString()}</p>
                                </div>

                                <div className="bg-green-50 p-4 rounded-lg border">
                                    <div className="flex justify-between">
                                        <p className="text-sm font-bold">Descuento</p>
                                        {hasRole('admin') && (
                                            <button onClick={() => setIsEditingDiscount(!isEditingDiscount)}>
                                                <Edit size={16} />
                                            </button>
                                        )}
                                    </div>
                                    {isEditingDiscount ? (
                                        <div className="flex gap-2 mt-1">
                                            <input type="number" className="w-20 border rounded" value={newDiscount} onChange={e => setNewDiscount(e.target.value)} />
                                            <button onClick={handleUpdateDiscount} className="text-xs font-bold">Guardar</button>
                                        </div>
                                    ) : <p className="text-2xl font-bold text-green-600">{selectedTutor.discount_percent || 0}%</p>}
                                </div>
                            </div>

                            {/* Purchase History Module (Expandable) */}
                            <div className="mt-8 pt-6 border-t border-gray-100">
                                <button
                                    onClick={() => setShowHistory(!showHistory)}
                                    className="w-full flex justify-between items-center mb-2 hover:bg-gray-50 p-2 rounded-lg transition-colors group"
                                >
                                    <h3 className="font-bold text-gray-800 flex items-center gap-2">
                                        <ShoppingBag size={18} className="text-primary" />
                                        Historial de Compras
                                    </h3>
                                    <div className="flex items-center gap-2 text-gray-400">
                                        <span className="text-xs font-medium">{purchaseHistory.length} registros</span>
                                        {showHistory ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                                    </div>
                                </button>

                                {showHistory && (
                                    <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 animate-in slide-in-from-top-2 duration-200">
                                        {purchaseHistory.length > 0 ? (
                                            Object.entries(
                                                purchaseHistory.reduce((acc: any, sale: any) => {
                                                    const date = new Date(sale.created_at).toLocaleDateString('es-CL', {
                                                        day: '2-digit', month: '2-digit', year: 'numeric'
                                                    });
                                                    if (!acc[date]) acc[date] = [];
                                                    acc[date].push(sale);
                                                    return acc;
                                                }, {})
                                            ).sort((a, b) => {
                                                // Sort by date descending
                                                const dateA = a[0].split('/').reverse().join('');
                                                const dateB = b[0].split('/').reverse().join('');
                                                return dateB.localeCompare(dateA);
                                            }).map(([date, sales]: [string, any]) => (
                                                <div key={date} className="space-y-2">
                                                    <button
                                                        onClick={() => setExpandedDate(expandedDate === date ? null : date)}
                                                        className="w-full flex justify-between items-center p-2 bg-indigo-50/50 rounded-lg text-indigo-700 font-bold text-xs hover:bg-indigo-50 transition-colors"
                                                    >
                                                        <span>{date}</span>
                                                        <span className="flex items-center gap-1">
                                                            {sales.length} {sales.length === 1 ? 'venta' : 'ventas'}
                                                            {expandedDate === date ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                                                        </span>
                                                    </button>

                                                    {expandedDate === date && (
                                                        <div className="space-y-2 pl-2 animate-in slide-in-from-top-1 duration-200">
                                                            {sales.map((sale: any) => (
                                                                <div key={sale._id} className="border rounded-lg text-[10px] bg-white shadow-sm overflow-hidden">
                                                                    <div
                                                                        className="p-2 flex justify-between items-center cursor-pointer hover:bg-gray-50"
                                                                        onClick={() => setExpandedSale(expandedSale === sale._id ? null : sale._id)}
                                                                    >
                                                                        <div className="flex flex-col">
                                                                            <span className="text-gray-400 font-mono">#{sale._id.slice(-4).toUpperCase()}</span>
                                                                            <span className="font-medium text-gray-500 uppercase">
                                                                                {sale.payment_method === 'CASH' ? 'EFECTIVO' :
                                                                                    sale.payment_method === 'DEBIT' ? 'DÉBITO' :
                                                                                        sale.payment_method === 'CREDIT' ? 'CRÉDITO' :
                                                                                            sale.payment_method === 'TRANSFER' ? 'TRANSFERENCIA' :
                                                                                                sale.payment_method === 'DEBT' || sale.payment_method === 'DUE' ? 'DEUDA' :
                                                                                                    sale.payment_method}
                                                                            </span>
                                                                        </div>
                                                                        <div className="flex items-center gap-2">
                                                                            <span className="font-bold text-green-600 font-mono text-xs">${sale.total?.toLocaleString()}</span>
                                                                            {expandedSale === sale._id ? <ChevronUp size={12} /> : <ChevronDown size={12} />}
                                                                        </div>
                                                                    </div>
                                                                    {expandedSale === sale._id && (
                                                                        <div className="p-2 border-t bg-gray-50/30">
                                                                            {sale.items?.map((item: any, idx: number) => (
                                                                                <div key={idx} className="flex justify-between py-1 border-b border-gray-100 last:border-0">
                                                                                    <span className="text-gray-600 truncate mr-2" title={item.name}>{item.name} <span className="text-gray-400">x{item.quantity}</span></span>
                                                                                    <span className="font-medium shrink-0">${item.total?.toLocaleString()}</span>
                                                                                </div>
                                                                            ))}
                                                                        </div>
                                                                    )}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    )}
                                                </div>
                                            ))
                                        ) : (
                                            <p className="text-center text-gray-400 text-xs py-4 italic">Sin compras registradas</p>
                                        )}
                                    </div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl border border-dashed p-8 text-center text-gray-400">
                            <User size={48} className="mx-auto mb-2 opacity-20" />
                            <p>Selecciona un tutor</p>
                        </div>
                    )}
                </div>
            </div>

            {showPayModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl p-6 w-full max-w-sm">
                        <h3 className="font-bold mb-4">Registrar Pago</h3>
                        <input type="number" className="w-full border rounded p-2 mb-4" value={payAmount} onChange={e => setPayAmount(e.target.value)} />
                        <div className="flex gap-3">
                            <button onClick={() => setShowPayModal(false)} className="px-4 py-2 border rounded">Cancelar</button>
                            <button onClick={handlePayDebt} className="flex-1 bg-green-600 text-white rounded px-4 py-2">Confirmar</button>
                        </div>
                    </div>
                </div>
            )}

            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl p-6 w-full max-w-md relative">
                        <button onClick={() => setShowCreateModal(false)} className="absolute top-4 right-4"><X /></button>
                        <h2 className="text-xl font-bold mb-4">Nuevo Cliente</h2>
                        <form onSubmit={handleCreateTutor} className="space-y-4">
                            <div className="grid grid-cols-2 gap-4">
                                <input placeholder="Nombre" className="border p-2 rounded" value={newTutor.first_name} onChange={e => setNewTutor({ ...newTutor, first_name: e.target.value })} required />
                                <input placeholder="Apellido" className="border p-2 rounded" value={newTutor.last_name} onChange={e => setNewTutor({ ...newTutor, last_name: e.target.value })} required />
                            </div>
                            <input placeholder="Teléfono" className="w-full border p-2 rounded" value={newTutor.phone} onChange={e => setNewTutor({ ...newTutor, phone: e.target.value })} required />
                            <input placeholder="Email" className="w-full border p-2 rounded" value={newTutor.email} onChange={e => setNewTutor({ ...newTutor, email: e.target.value })} />
                            <button type="submit" className="w-full bg-primary text-white py-2 rounded font-bold">Crear</button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clients;
