import { useState, useEffect } from 'react';
import api from '../api/axios';
import { useBranch } from '../context/BranchContext';
import {
    Search, Edit, Plus, Trash2, Building2, MapPin, X
} from 'lucide-react';

const Branches = () => {
    const { refreshBranches } = useBranch();
    const [branches, setBranches] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [branchToEdit, setBranchToEdit] = useState<any>(null);

    // Form State
    const [formData, setFormData] = useState({
        name: '',
        address: '',
        phone: '+56 9 ',
        supports_grooming: false,
        supports_veterinary: true,
        is_active: true
    });

    const fetchBranches = async () => {
        setLoading(true);
        try {
            const res = await api.get('/branches');
            setBranches(res.data);
        } catch (error) {
            console.error("Error fetching branches", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, []);

    const handleCreate = () => {
        setBranchToEdit(null);
        setFormData({
            name: '',
            address: '',
            phone: '+56 9 ',
            supports_grooming: false,
            supports_veterinary: true,
            is_active: true
        });
        setIsModalOpen(true);
    };

    const handleEdit = (branch: any) => {
        setBranchToEdit(branch);
        setFormData({
            name: branch.name,
            address: branch.address || '',
            phone: branch.phone || '+56 9 ',
            supports_grooming: branch.supports_grooming || false,
            supports_veterinary: branch.supports_veterinary !== undefined ? branch.supports_veterinary : true,
            is_active: branch.is_active !== undefined ? branch.is_active : true
        });
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar la sucursal "${name}"?`)) return;

        try {
            await api.delete(`/branches/${id}`);
            alert('Sucursal eliminada correctamente');
            fetchBranches();
            refreshBranches(); // Sync throughout app
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.detail || 'Error al eliminar');
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        try {
            if (branchToEdit) {
                await api.put(`/branches/${branchToEdit.id || branchToEdit._id}`, formData);
                alert('Sucursal actualizada correctamente');
            } else {
                await api.post('/branches', formData);
                alert('Sucursal creada correctamente');
            }
            setIsModalOpen(false);
            fetchBranches();
            refreshBranches(); // Sync throughout app
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.detail || 'Error al guardar');
        }
    };

    const filteredBranches = branches.filter(b =>
        b.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (b.address || '').toLowerCase().includes(searchTerm.toLowerCase())
    );

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <Building2 className="text-blue-400" /> Sucursales
            </h1>

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar por nombre o dirección..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <button
                    onClick={handleCreate}
                    className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                    <Plus size={20} />
                    Nueva Sucursal
                </button>
            </div>

            {/* Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {loading && <div className="col-span-full py-12 text-center text-gray-500">Cargando...</div>}

                {!loading && filteredBranches.map((branch) => (
                    <div key={branch.id || branch._id} className="bg-white rounded-xl shadow-sm border border-gray-200 overflow-hidden hover:border-blue-300 transition-colors group">
                        <div className="p-6">
                            <div className="flex justify-between items-start mb-4">
                                <div className="bg-blue-50 p-3 rounded-lg text-blue-600">
                                    <Building2 size={24} />
                                </div>
                                <div className="flex gap-2">
                                    <button
                                        onClick={() => handleEdit(branch)}
                                        className="p-1.5 text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-transparent hover:border-blue-100"
                                    >
                                        <Edit size={18} />
                                    </button>
                                    <button
                                        onClick={() => handleDelete(branch.id || branch._id, branch.name)}
                                        className="p-1.5 text-red-600 hover:bg-red-50 rounded-lg transition-colors border border-transparent hover:border-red-100"
                                    >
                                        <Trash2 size={18} />
                                    </button>
                                </div>
                            </div>

                            <h3 className="text-xl font-bold text-gray-900 mb-1">{branch.name}</h3>
                            <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                                <MapPin size={14} />
                                <span className="truncate">{branch.address || 'Sin dirección'}</span>
                            </div>
                            {branch.phone && (
                                <div className="flex items-center gap-2 text-gray-500 text-sm mb-4">
                                    <div className="w-[14px] flex justify-center">
                                        <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="lucide lucide-phone"><path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z" /></svg>
                                    </div>
                                    <span className="truncate">{branch.phone}</span>
                                </div>
                            )}

                            <div className="space-y-2 mt-4 border-t pt-4">
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 font-medium">Peluquería:</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${branch.supports_grooming ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {branch.supports_grooming ? 'Activa' : 'Inactiva'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm">
                                    <span className="text-gray-600 font-medium">Veterinaria:</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${branch.supports_veterinary ? 'bg-green-100 text-green-700' : 'bg-red-100 text-red-700'}`}>
                                        {branch.supports_veterinary ? 'Activa' : 'Inactiva'}
                                    </span>
                                </div>
                                <div className="flex justify-between items-center text-sm pt-1 border-t border-dashed">
                                    <span className="text-gray-600 font-medium">Estado General:</span>
                                    <span className={`px-2 py-0.5 rounded text-xs font-bold ${branch.is_active ? 'bg-blue-100 text-blue-700' : 'bg-gray-100 text-gray-700'}`}>
                                        {branch.is_active ? 'Operativa' : 'No Operativa'}
                                    </span>
                                </div>
                            </div>
                        </div>
                    </div>
                ))}

                {!loading && filteredBranches.length === 0 && (
                    <div className="col-span-full py-12 text-center text-gray-500 italic">No se encontraron sucursales.</div>
                )}
            </div>

            {/* Modal */}
            {isModalOpen && (
                <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
                    <div className="bg-white rounded-2xl shadow-xl w-full max-w-md overflow-hidden relative" onClick={e => e.stopPropagation()}>
                        <div className="p-6 border-b border-gray-100 flex justify-between items-center bg-gray-50">
                            <h2 className="text-xl font-bold text-gray-900">
                                {branchToEdit ? 'Editar Sucursal' : 'Nueva Sucursal'}
                            </h2>
                            <button onClick={() => setIsModalOpen(false)} className="text-gray-400 hover:text-gray-600">
                                <X size={24} />
                            </button>
                        </div>

                        <form onSubmit={handleSubmit} className="p-6 space-y-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre</label>
                                <input
                                    required
                                    type="text"
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Dirección</label>
                                <input
                                    type="text"
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.address}
                                    onChange={e => setFormData({ ...formData, address: e.target.value })}
                                />
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono / WhatsApp</label>
                                <input
                                    type="text"
                                    placeholder="+56 9 ..."
                                    className="w-full px-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500"
                                    value={formData.phone}
                                    onChange={e => setFormData({ ...formData, phone: e.target.value })}
                                />
                            </div>

                            <div className="flex flex-col gap-3 pt-2">
                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.supports_grooming ? 'bg-secondary' : 'bg-gray-200'}`}>
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={formData.supports_grooming}
                                            onChange={e => setFormData({ ...formData, supports_grooming: e.target.checked })}
                                        />
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.supports_grooming ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Ofrece Peluquería</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.supports_veterinary ? 'bg-blue-500' : 'bg-gray-200'}`}>
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={formData.supports_veterinary}
                                            onChange={e => setFormData({ ...formData, supports_veterinary: e.target.checked })}
                                        />
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.supports_veterinary ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Ofrece Veterinaria</span>
                                </label>

                                <label className="flex items-center gap-2 cursor-pointer group">
                                    <div className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${formData.is_active ? 'bg-green-500' : 'bg-gray-200'}`}>
                                        <input
                                            type="checkbox"
                                            className="sr-only"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        />
                                        <span className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${formData.is_active ? 'translate-x-6' : 'translate-x-1'}`} />
                                    </div>
                                    <span className="text-sm font-medium text-gray-700 group-hover:text-gray-900">Sucursal Activa</span>
                                </label>
                            </div>

                            <div className="flex gap-3 pt-6">
                                <button
                                    type="button"
                                    onClick={() => setIsModalOpen(false)}
                                    className="flex-1 px-4 py-2 bg-gray-100 text-gray-700 font-bold rounded-lg hover:bg-gray-200 transition-colors"
                                >
                                    Cancelar
                                </button>
                                <button
                                    type="submit"
                                    className="flex-1 px-4 py-2 bg-primary text-white font-bold rounded-lg hover:opacity-90 transition-opacity"
                                >
                                    {branchToEdit ? 'Actualizar' : 'Crear'}
                                </button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    );
};

export default Branches;
