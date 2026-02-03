import { useState, useEffect } from 'react';
import { X, Save, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';

interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userToEdit?: any;
}

const EmployeeFormModal = ({ isOpen, onClose, onSuccess, userToEdit }: EmployeeFormModalProps) => {
    const [formData, setFormData] = useState({
        name: '',
        last_name: '',
        email: '',
        phone: '',
        role: 'assistant',
        branch_id: '',
        password: ''
    });
    const [branches, setBranches] = useState<any[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadBranches();
            if (userToEdit) {
                setFormData({
                    name: userToEdit.name || '',
                    last_name: userToEdit.last_name || '',
                    email: userToEdit.email || '',
                    phone: userToEdit.phone || '',
                    role: userToEdit.role || 'seller',
                    branch_id: userToEdit.branch_id || '',
                    password: '' // Password blank on edit
                });
            } else {
                setFormData({
                    name: '',
                    last_name: '',
                    email: '',
                    phone: '',
                    role: 'seller',
                    branch_id: '',
                    password: ''
                });
            }
        }
    }, [isOpen, userToEdit]);

    const loadBranches = async () => {
        try {
            const res = await api.get('/branches');
            setBranches(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (userToEdit) {
                // Update
                const updateData: any = { ...formData };
                if (!updateData.password) delete updateData.password; // Don't send empty password

                await api.put(`/auth/users/${userToEdit.id}/full`, updateData);
                alert('Empleado actualizado correctamente');
            } else {
                // Create
                await api.post('/auth/register', formData);
                alert('Empleado creado correctamente');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.detail || 'Error al guardar');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">
                        {userToEdit ? 'Editar Empleado' : 'Nuevo Empleado'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                            <input
                                required
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                            <input
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.last_name}
                                onChange={e => setFormData({ ...formData, last_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Email *</label>
                            <input
                                required
                                type="email"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.email}
                                onChange={e => setFormData({ ...formData, email: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Teléfono</label>
                            <input
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.phone}
                                onChange={e => setFormData({ ...formData, phone: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.role}
                                onChange={e => setFormData({ ...formData, role: e.target.value })}
                            >
                                <option value="seller">Vendedor</option>
                                <option value="admin">Administrador</option>
                                <option value="veterinarian">Veterinario</option>
                                <option value="groomer">Peluquero</option>
                            </select>
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Sucursal</label>
                            <select
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.branch_id}
                                onChange={e => setFormData({ ...formData, branch_id: e.target.value })}
                            >
                                <option value="">Sin Sucursal Asignada</option>
                                {branches.map(b => (
                                    <option key={b._id || b.id} value={b._id || b.id}>{b.name}</option>
                                ))}
                            </select>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">
                            {userToEdit ? 'Contraseña' : 'Contraseña *'}
                        </label>
                        <div className="relative">
                            <input
                                type={showPassword ? "text" : "password"}
                                required={!userToEdit}
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none pr-10"
                                value={formData.password}
                                onChange={e => setFormData({ ...formData, password: e.target.value })}
                            />
                            <button
                                type="button"
                                className="absolute right-3 top-2.5 text-gray-400 hover:text-gray-600"
                                onClick={() => setShowPassword(!showPassword)}
                            >
                                {showPassword ? <EyeOff size={18} /> : <Eye size={18} />}
                            </button>
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 bg-white font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 font-medium flex items-center gap-2"
                        >
                            <Save size={18} />
                            {loading ? 'Guardando...' : (userToEdit ? 'Actualizar' : 'Crear Empleado')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default EmployeeFormModal;
