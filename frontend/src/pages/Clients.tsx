
import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, Phone, Mail, Edit, User, Dog, Plus, X } from 'lucide-react';
import FileImporter from '../components/FileImporter';
import { useAuth } from '../context/AuthContext';

const Clients = () => {
    const { hasRole } = useAuth();
    const [tutors, setTutors] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedTutor, setSelectedTutor] = useState<any>(null);
    const [tutorPets, setTutorPets] = useState<any[]>([]);
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
        full_name: '',
        phone: '',
        email: '',
        address: '',
        notes: ''
    });
    useEffect(() => {
        const fetchTutors = async () => {
            setLoading(true);
            try {
                // If search term exists, use it. Otherwise defaults to limit=50 (or whatever backend default)
                let endpoint = searchTerm
                    ? `/tutors?search=${searchTerm}`
                    : '/tutors?limit=100';

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

        const delay = setTimeout(fetchTutors, 300); // 300ms debounce
        return () => clearTimeout(delay);
    }, [searchTerm, filterBy]);

    const handleViewTutor = async (tutor: any) => {
        setSelectedTutor(tutor);
        setNewDiscount(tutor.discount_percent?.toString() || '0');
        setIsEditingDiscount(false);
        try {
            const res = await api.get(`/tutors/${tutor.id || tutor._id}/details`);
            // The details endpoint returns { tutor, patients, consultations, stats }
            if (res.data.patients) {
                setTutorPets(res.data.patients);
            }
            // Merge returned stats and debt into selectedTutor
            if (res.data.stats) {
                setSelectedTutor((prev: any) => ({
                    ...prev,
                    stats: res.data.stats,
                    debt: res.data.tutor.debt // Ensure we have latest debt
                }));
            }
        } catch (error) {
            console.error(error);
            setTutorPets([]);
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

            // Refresh details
            handleViewTutor(selectedTutor);

            // Also refresh list so if we switch back the debt is somewhat updated (though list might not show it yet)
            const endpoint = searchTerm
                ? `/tutors?search=${searchTerm}`
                : '/tutors?limit=100';
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

            // Update local state
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
            await api.post('/tutors', newTutor);
            setNewTutor({
                full_name: '',
                phone: '',
                email: '',
                address: '',
                notes: ''
            });
            setShowCreateModal(false);
            alert('Cliente creado correctamente');

            // Refresh list
            const endpoint = searchTerm ? `/tutors?search=${searchTerm}` : '/tutors?limit=100';
            const res = await api.get(endpoint);
            setTutors(res.data);
        } catch (error) {
            console.error(error);
            alert('Error al crear cliente');
        }
    };

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <User className="text-blue-400" /> Tutores / Clientes
                </h1>
                <div className="flex items-center gap-3">
                    {hasRole('admin') && (
                        <FileImporter label="Clientes" endpoint="/api/v1/import/tutors" onSuccess={() => { /* reload */ }} />
                    )}
                </div>
            </div>

            {/* Search and Actions */}
            {/* Search and Actions */}
            {/* Search and Actions */}
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
                    <button
                        onClick={() => setShowCreateModal(true)}
                        className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap"
                    >
                        <Plus size={20} />
                        Nuevo Cliente
                    </button>
                </div>

                {/* Filters */}
                <div className="flex gap-2">
                    <button
                        onClick={() => setFilterBy('all')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterBy === 'all' ? 'bg-slate-800 text-white' : 'bg-white text-slate-600 border border-slate-200 hover:bg-slate-50'}`}
                    >
                        Todos
                    </button>
                    <button
                        onClick={() => setFilterBy('debt')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterBy === 'debt' ? 'bg-blue-700 text-white' : 'bg-white text-blue-700 border border-blue-200 hover:bg-blue-50'}`}
                    >
                        Con Deuda
                    </button>
                    <button
                        onClick={() => setFilterBy('discount')}
                        className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors ${filterBy === 'discount' ? 'bg-sky-500 text-white' : 'bg-white text-sky-600 border border-sky-200 hover:bg-sky-50'}`}
                    >
                        Con Descuento
                    </button>
                </div>
            </div>

            <div className="flex gap-6 flex-col lg:flex-row">
                {/* List */}
                <div className="flex-1 space-y-3">
                    {loading ? <p className="text-center py-4 text-gray-500">Buscando...</p> : tutors.map(tutor => (
                        <div
                            key={tutor.id || tutor._id}
                            onClick={() => handleViewTutor(tutor)}
                            className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer hover:border-blue-300 transition-all
                                ${selectedTutor?._id === (tutor.id || tutor._id) || selectedTutor?.id === (tutor.id || tutor._id)
                                    ? 'border-blue-500 ring-1 ring-blue-500'
                                    : 'border-gray-200'}
                            `}
                        >
                            <div className="flex justify-between items-center w-full">
                                <div className="flex items-center gap-3">
                                    <div className="bg-blue-100 p-2 rounded-full text-blue-600 relative">
                                        <User size={20} />
                                        {tutor.debt > 0 && <span className="absolute top-0 right-0 w-2.5 h-2.5 bg-red-500 rounded-full border-2 border-white"></span>}
                                    </div>
                                    <div>
                                        <h3 className="font-bold text-gray-800">{tutor.full_name || tutor.name}</h3>
                                        <p className="text-sm text-gray-500">{tutor.phone}</p>
                                    </div>
                                </div>
                                <div className="flex flex-col items-end gap-1">
                                    {/* Only red dot on avatar is requested for debt. Texts removed. */}
                                    {/* Discount? "No me gustan aparezcan esos datos de deuda y descuento" - Removing badge */}

                                    {/* Keeping only Total Spent if positive? Or remove everything? */}
                                    {/* User said: "no me gustan aparezcan esos datos de deuda y descuento en esa parte" */}
                                    {/* Assuming Total Spent is also noise? Let's check user request again: "no me gustan aparezcan esos datos de deuda y descuento" */}
                                    {/* I will remove Debt and Discount text. I will leave Total Spent? User didn't complain about it specifically but "esos datos" might imply all extra info. */}
                                    {/* Safe bet: Remove text badges. Keep Red Dot. Keep Total Spent?? */}
                                    {/* "pero si el punto rojo sobre la foto de perfil". */}
                                    {/* Let's remove Discount and Debt text. Keep Total Spent subtle? Or just remove all for a cleaner look? */}
                                    {/* I'll hide all "extra" text in the list item, keeping it clean as requested. Detail view has it all. */}
                                </div>
                            </div>
                        </div>
                    ))}
                    {!loading && tutors.length === 0 && (
                        <p className="text-gray-500 text-center py-8">No se encontraron clientes</p>
                    )}
                </div>

                {/* Details Panel */}
                <div className="w-full lg:w-1/3">
                    {selectedTutor ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                            <h2 className="text-xl font-bold text-gray-900 mb-4">{selectedTutor.full_name || selectedTutor.name}</h2>

                            <div className="space-y-4">
                                <div className="flex items-start gap-3 text-gray-700">
                                    <Phone size={18} className="mt-1 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Teléfono</p>
                                        <p className="font-medium">{selectedTutor.phone || 'No registrado'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 text-gray-700">
                                    <Mail size={18} className="mt-1 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Email</p>
                                        <p className="font-medium">{selectedTutor.email || 'No registrado'}</p>
                                    </div>
                                </div>

                                {/* Stats Grid */}
                                <div className="mb-3">
                                    <div className="bg-blue-50 p-3 rounded-lg border border-blue-100">
                                        <p className="text-xs text-blue-800 font-bold">Total Gastado</p>
                                        <p className="text-lg font-bold text-blue-600">
                                            ${(selectedTutor.total_spent || selectedTutor.stats?.total_spent || 0).toLocaleString()}
                                        </p>
                                    </div>
                                </div>

                                {/* Debt Section */}
                                <div className={`p-4 rounded-lg border ${selectedTutor.debt > 0 ? 'bg-red-50 border-red-100' : 'bg-green-50 border-green-100'}`}>
                                    <div className="flex justify-between items-start mb-1">
                                        <p className={`text-sm font-bold ${selectedTutor.debt > 0 ? 'text-red-800' : 'text-gray-600'}`}>
                                            Deuda Actual
                                        </p>
                                        {selectedTutor.debt > 0 && (
                                            <button
                                                onClick={() => {
                                                    setPayAmount(selectedTutor.debt.toString());
                                                    setShowPayModal(true);
                                                }}
                                                className="text-red-600 hover:text-red-800"
                                                title="Registrar Pago"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        )}
                                    </div>
                                    <p className={`text-2xl font-bold ${selectedTutor.debt > 0 ? 'text-red-600' : 'text-green-600'}`}>
                                        ${(selectedTutor.debt || 0).toLocaleString()}
                                    </p>
                                </div>

                                {/* Pay Modal */}
                                {showPayModal && (
                                    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                                        <div className="bg-white rounded-xl shadow-xl p-6 w-full max-w-sm" onClick={e => e.stopPropagation()}>
                                            <h3 className="text-lg font-bold text-gray-800 mb-4">Registrar Pago de Deuda</h3>

                                            <div className="mb-4">
                                                <label className="block text-sm text-gray-600 mb-1">Monto a Pagar</label>
                                                <div className="flex items-center border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500">
                                                    <span className="text-gray-500 mr-2">$</span>
                                                    <input
                                                        type="number"
                                                        className="w-full outline-none font-bold text-lg"
                                                        value={payAmount}
                                                        onChange={e => setPayAmount(e.target.value)}
                                                        autoFocus
                                                    />
                                                </div>
                                                <p className="text-xs text-gray-500 mt-2">
                                                    Deuda Total: ${(selectedTutor.debt || 0).toLocaleString()}
                                                </p>
                                            </div>

                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => setShowPayModal(false)}
                                                    className="flex-1 py-2 text-gray-600 font-medium hover:bg-gray-100 rounded-lg"
                                                >
                                                    Cancelar
                                                </button>
                                                <button
                                                    onClick={handlePayDebt}
                                                    className="flex-1 py-2 bg-green-600 text-white font-bold rounded-lg hover:bg-green-700"
                                                >
                                                    Confirmar Pago
                                                </button>
                                            </div>
                                        </div>
                                    </div>
                                )}

                                {/* Discount Section */}
                                <div className="bg-green-50 p-4 rounded-lg border border-green-100">
                                    <div className="flex justify-between items-start mb-1">
                                        <p className="text-sm text-green-800 font-bold">Descuento Cliente</p>
                                        {!isEditingDiscount ? (
                                            <button
                                                onClick={() => setIsEditingDiscount(true)}
                                                className="text-green-600 hover:text-green-800"
                                            >
                                                <Edit size={16} />
                                            </button>
                                        ) : (
                                            <div className="flex gap-2">
                                                <button onClick={handleUpdateDiscount} className="text-green-700 font-bold text-xs">Guardar</button>
                                                <button onClick={() => setIsEditingDiscount(false)} className="text-gray-500 text-xs">Cancelar</button>
                                            </div>
                                        )}
                                    </div>

                                    {!isEditingDiscount ? (
                                        <p className="text-2xl font-bold text-green-600">{selectedTutor.discount_percent || 0}%</p>
                                    ) : (
                                        <div className="flex items-center gap-2 mt-1">
                                            <input
                                                type="number"
                                                className="w-20 p-1 border rounded text-lg font-bold text-green-600"
                                                value={newDiscount}
                                                onChange={e => setNewDiscount(e.target.value)}
                                            />
                                            <span className="text-green-600 font-bold">%</span>
                                        </div>
                                    )}
                                </div>

                                <div className="pt-4 border-t">
                                    <h3 className="font-bold text-gray-800 mb-3 flex items-center gap-2">
                                        <Dog size={18} /> Mascotas
                                    </h3>
                                    {tutorPets.length > 0 ? (
                                        <div className="space-y-2">
                                            {tutorPets.map(pet => (
                                                <div key={pet._id} className="bg-gray-50 p-2 rounded text-sm flex justify-between items-center">
                                                    <span className="font-medium text-gray-700">{pet.name}</span>
                                                    <span className="text-xs text-gray-500 bg-white px-2 py-0.5 rounded border">{pet.species}</span>
                                                </div>
                                            ))}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-gray-500 italic">No tiene mascotas registradas.</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
                            <User size={48} className="mx-auto mb-2 opacity-20" />
                            <p>Selecciona un tutor para ver detalles</p>
                        </div>
                    )}
                </div>
            </div>
            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
                    <div className="bg-white rounded-xl shadow-lg w-full max-w-md p-6 relative">
                        <button
                            onClick={() => setShowCreateModal(false)}
                            className="absolute top-4 right-4 text-gray-400 hover:text-gray-600"
                        >
                            <X className="w-5 h-5" />
                        </button>
                        <h2 className="text-xl font-bold text-gray-900 mb-4">Nuevo Cliente</h2>
                        <form onSubmit={handleCreateTutor} className="space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Completo</label>
                                <input
                                    required
                                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500"
                                    value={newTutor.full_name}
                                    onChange={e => setNewTutor({ ...newTutor, full_name: e.target.value })}
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-4">
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                    <input
                                        required
                                        className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500"
                                        value={newTutor.phone}
                                        onChange={e => setNewTutor({ ...newTutor, phone: e.target.value })}
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                    <input
                                        type="email"
                                        className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500"
                                        value={newTutor.email}
                                        onChange={e => setNewTutor({ ...newTutor, email: e.target.value })}
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                <input
                                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 ring-blue-500"
                                    value={newTutor.address}
                                    onChange={e => setNewTutor({ ...newTutor, address: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-primary text-white py-2 rounded-lg font-bold hover:opacity-90"
                            >
                                Crear Cliente
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Clients;
