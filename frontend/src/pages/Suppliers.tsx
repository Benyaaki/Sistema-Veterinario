import { useState, useEffect } from 'react';
import api from '../api/axios';
import { Search, Phone, Mail, Info, Building, Plus, X, Trash2 } from 'lucide-react';
import FileImporter from '../components/FileImporter';
import { useAuth } from '../context/AuthContext';
import { formatPhoneNumber, validatePhone } from '../utils/formatters';

const Suppliers = () => {
    const { hasRole } = useAuth();
    const [suppliers, setSuppliers] = useState<any[]>([]);
    const [searchTerm, setSearchTerm] = useState('');
    const [loading, setLoading] = useState(false);
    const [selectedSupplier, setSelectedSupplier] = useState<any>(null);
    const [showCreateModal, setShowCreateModal] = useState(false);
    const [newSupplier, setNewSupplier] = useState({
        name: '',
        email: '',
        phone: '',
        address: '',
        rut: ''
    });

    const fetchSuppliers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/suppliers');
            setSuppliers(res.data);
        } catch (error) {
            console.error("Error fetching suppliers", error);
        } finally {
            setLoading(false);
        }
    };

    const handleCreateSupplier = async (e: React.FormEvent) => {
        e.preventDefault();

        // Validation
        if (newSupplier.phone && !validatePhone(newSupplier.phone)) {
            alert('El teléfono debe tener el formato: +56 9 XXXX XXXX');
            return;
        }

        try {
            await api.post('/suppliers', newSupplier);
            alert('Proveedor creado correctamente');
            setShowCreateModal(false);
            setNewSupplier({ name: '', email: '', phone: '', address: '', rut: '' });
            fetchSuppliers();
        } catch (error) {
            console.error(error);
            alert('Error al crear proveedor');
        }
    };

    const handleDeleteSupplier = async () => {
        if (!selectedSupplier) return;
        if (!confirm(`¿Estás seguro de eliminar el proveedor ${selectedSupplier.name}?`)) return;

        try {
            await api.delete(`/suppliers/${selectedSupplier._id || selectedSupplier.id}`);
            setSelectedSupplier(null);
            fetchSuppliers();
            alert('Proveedor eliminado correctamente');
        } catch (error) {
            console.error(error);
            alert('Error al eliminar proveedor');
        }
    };

    useEffect(() => {
        fetchSuppliers();
    }, []);

    const filteredSuppliers = suppliers.filter(s =>
        (s.name?.toLowerCase() || '').includes(searchTerm.toLowerCase()) ||
        (s.email?.toLowerCase() || '').includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6">
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Building className="text-blue-400" /> Proveedores
                </h1>
                <div className="flex items-center gap-3">
                    {hasRole('admin') && (
                        <FileImporter label="Proveedores" endpoint="/api/v1/import/suppliers" onSuccess={fetchSuppliers} />
                    )}
                </div>
            </div>

            {/* Search */}
            <div className="bg-white p-4 rounded-xl shadow-sm border border-gray-200 mb-6 flex flex-col md:flex-row gap-4 items-center">
                <div className="flex items-center gap-2 flex-1 w-full border rounded-lg px-3 py-2 focus-within:ring-2 focus-within:ring-blue-500 focus-within:border-blue-500">
                    <Search className="text-gray-400" size={20} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o empresa..."
                        className="flex-1 outline-none text-gray-700 bg-transparent"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>
                <button
                    onClick={() => setShowCreateModal(true)}
                    className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                    <Plus size={20} />
                    Nuevo Proveedor
                </button>
            </div>



            <div className="flex gap-6 flex-col lg:flex-row">
                {/* List */}
                <div className="flex-1 space-y-3">
                    {loading ? <p>Cargando...</p> : filteredSuppliers.map(supplier => (
                        <div
                            key={supplier.id || supplier._id}
                            onClick={() => setSelectedSupplier(supplier)}
                            className={`bg-white p-4 rounded-xl shadow-sm border cursor-pointer hover:border-blue-300 transition-all
                                ${selectedSupplier?._id === (supplier.id || supplier._id) ? 'border-blue-500 ring-1 ring-blue-500' : 'border-gray-200'}
                            `}
                        >
                            <div className="flex items-center gap-3">
                                <div className="bg-amber-100 p-2 rounded-full text-amber-600">
                                    <Building size={20} />
                                </div>
                                <div>
                                    <h3 className="font-bold text-gray-800">{supplier.name}</h3>
                                    <p className="text-sm text-gray-500">{supplier.contact_name}</p>
                                </div>
                            </div>
                        </div>
                    ))}
                    {!loading && filteredSuppliers.length === 0 && (
                        <p className="text-gray-500 text-center py-8">No se encontraron proveedores</p>
                    )}
                </div>

                {/* Details Panel */}
                <div className="w-full lg:w-1/3">
                    {selectedSupplier ? (
                        <div className="bg-white rounded-xl shadow-sm border border-gray-200 p-6 sticky top-6">
                            <div className="flex justify-between items-start mb-4">
                                <h2 className="text-xl font-bold text-gray-900">{selectedSupplier.name}</h2>
                                <button
                                    onClick={handleDeleteSupplier}
                                    className="p-2 text-red-600 hover:bg-red-50 rounded-lg transition-colors"
                                    title="Eliminar Proveedor"
                                >
                                    <Trash2 size={20} />
                                </button>
                            </div>

                            <div className="space-y-4">

                                <div className="flex items-start gap-3 text-gray-700">
                                    <Phone size={18} className="mt-1 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Teléfono</p>
                                        <p className="font-medium">{selectedSupplier.phone || '-'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 text-gray-700">
                                    <Mail size={18} className="mt-1 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Email</p>
                                        <p className="font-medium">{selectedSupplier.email || '-'}</p>
                                    </div>
                                </div>

                                <div className="flex items-start gap-3 text-gray-700">
                                    <Info size={18} className="mt-1 text-gray-400" />
                                    <div>
                                        <p className="text-xs text-gray-500">Dirección</p>
                                        <p className="font-medium">{selectedSupplier.address || '-'}</p>
                                    </div>
                                </div>
                            </div>

                            <div className="mt-6 pt-4 border-t text-right">
                                {/* Placeholder for edit/delete */}
                                <button className="text-amber-600 text-sm font-semibold hover:underline">Editar Información</button>
                            </div>
                        </div>
                    ) : (
                        <div className="bg-gray-50 rounded-xl border border-dashed border-gray-300 p-8 text-center text-gray-400">
                            <Building size={48} className="mx-auto mb-2 opacity-20" />
                            <p>Selecciona un proveedor para ver detalles</p>
                        </div>
                    )}
                </div>
            </div>
            {/* Create Modal */}
            {showCreateModal && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-xl shadow-xl w-full max-w-md overflow-hidden">
                        <div className="p-4 border-b flex justify-between items-center bg-gray-50">
                            <h3 className="font-bold text-gray-800">Nuevo Proveedor</h3>
                            <button onClick={() => setShowCreateModal(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={20} />
                            </button>
                        </div>
                        <form onSubmit={handleCreateSupplier} className="p-4 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre Empresa *</label>
                                <input
                                    type="text"
                                    required
                                    maxLength={50}
                                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newSupplier.name}
                                    onChange={e => setNewSupplier({ ...newSupplier, name: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">RUT</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newSupplier.rut}
                                    onChange={e => setNewSupplier({ ...newSupplier, rut: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newSupplier.phone}
                                    onChange={e => setNewSupplier({ ...newSupplier, phone: formatPhoneNumber(e.target.value) })}
                                    placeholder="+56 9 XXXX XXXX"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Email</label>
                                <input
                                    type="email"
                                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newSupplier.email}
                                    onChange={e => setNewSupplier({ ...newSupplier, email: e.target.value })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                <input
                                    type="text"
                                    className="w-full px-3 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    value={newSupplier.address}
                                    onChange={e => setNewSupplier({ ...newSupplier, address: e.target.value })}
                                />
                            </div>
                            <button
                                type="submit"
                                className="w-full bg-blue-600 text-white py-2 rounded-lg font-medium hover:bg-blue-700 transition-colors"
                            >
                                Crear Proveedor
                            </button>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Suppliers;
