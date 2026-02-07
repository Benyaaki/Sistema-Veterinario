import { useState, useEffect } from 'react';
import { X, Save, Eye, EyeOff } from 'lucide-react';
import api from '../api/axios';
import { formatPhoneNumber, capitalizeWords, cleanName, validateName, validatePhone } from '../utils/formatters';

interface EmployeeFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    userToEdit?: any;
}

const ALL_PERMISSIONS = [
    { id: 'ventas', label: 'Ventas (General)' },
    { id: 'inventory', label: 'Inventario' },
    { id: 'stock', label: 'Stock Sucursales' },
    { id: 'reception', label: 'Recepción' },
    { id: 'dispatch', label: 'Despachos' },
    { id: 'clients', label: 'Clientes' },
    { id: 'suppliers', label: 'Proveedores' },
    { id: 'agenda', label: 'Agenda Veterinaria' },
    { id: 'tutors', label: 'Tutores' },
    { id: 'patients', label: 'Pacientes' },
    { id: 'employees', label: 'Empleados' },
    { id: 'reports', label: 'Reportes' },
    { id: 'activity', label: 'Historial Actividades' },
];

const ROLE_PRESETS: Record<string, string[]> = {
    'admin': ['ventas', 'inventory', 'stock', 'reception', 'dispatch', 'clients', 'suppliers', 'agenda', 'tutors', 'patients', 'employees', 'reports', 'activity'],
    'seller': ['ventas', 'inventory', 'stock', 'reception', 'dispatch', 'clients', 'agenda', 'tutors', 'patients'],
    'veterinarian': ['ventas', 'inventory', 'stock', 'clients', 'agenda', 'tutors', 'patients'],
    'groomer': ['ventas', 'inventory', 'stock', 'agenda'],
    'assistant': []
};

const EmployeeFormModal = ({ isOpen, onClose, onSuccess, userToEdit }: EmployeeFormModalProps) => {
    const [formData, setFormData] = useState({
        name: '',
        last_name: '',
        email: '',
        phone: '',
        role: 'assistant',
        branch_id: '',
        password: '',
        permissions: [] as string[],
        is_active: true,
        is_blocked: false
    });
    const [branches, setBranches] = useState<any[]>([]);
    const [showPassword, setShowPassword] = useState(false);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            loadBranches();
            if (userToEdit) {
                // Determine initial permissions: use saved or fallback to role preset
                let initialPermissions = userToEdit.permissions || [];
                if (initialPermissions.length === 0 && userToEdit.role) {
                    initialPermissions = ROLE_PRESETS[userToEdit.role] || [];
                }

                setFormData({
                    name: userToEdit.name || '',
                    last_name: userToEdit.last_name || '',
                    email: userToEdit.email || '',
                    phone: userToEdit.phone || '',
                    role: userToEdit.role || 'seller',
                    branch_id: userToEdit.branch_id || '',
                    password: '', // Password blank on edit
                    permissions: initialPermissions,
                    is_active: userToEdit.is_active !== undefined ? userToEdit.is_active : true,
                    is_blocked: userToEdit.is_blocked || false
                });
            } else {
                setFormData({
                    name: '',
                    last_name: '',
                    email: '',
                    phone: '',
                    role: 'seller',
                    branch_id: '',
                    password: '',
                    permissions: ROLE_PRESETS['seller'] || [],
                    is_active: true,
                    is_blocked: false
                });
            }
        }
    }, [isOpen, userToEdit]);

    const loadBranches = async () => {
        try {
            const res = await api.get('/branches/');
            setBranches(res.data);
        } catch (error) {
            console.error(error);
        }
    };

    const handleRoleChange = (newRole: string) => {
        setFormData(prev => ({
            ...prev,
            role: newRole,
            permissions: ROLE_PRESETS[newRole] || []
        }));
    };

    const togglePermission = (permId: string) => {
        setFormData(prev => {
            const exists = prev.permissions.includes(permId);
            if (exists) {
                return { ...prev, permissions: prev.permissions.filter(p => p !== permId) };
            } else {
                return { ...prev, permissions: [...prev.permissions, permId] };
            }
        });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        // Strict Validation
        if (!validateName(formData.name)) {
            alert('El nombre solo debe contener letras');
            return;
        }
        if (formData.last_name && !validateName(formData.last_name)) {
            alert('El apellido solo debe contener letras');
            return;
        }
        if (!validatePhone(formData.phone)) {
            alert('El teléfono debe tener el formato: +56 9 XXXX XXXX');
            return;
        }
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!emailRegex.test(formData.email)) {
            alert('Por favor, ingresa un correo electrónico válido (ejemplo@correo.com)');
            return;
        }

        setLoading(true);

        try {
            if (userToEdit) {
                // Update
                const updateData: any = { ...formData };
                if (!updateData.password) delete updateData.password; // Don't send empty password

                await api.put(`/users/${userToEdit.id}/full`, updateData);
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
            <div className="bg-white rounded-xl shadow-lg w-full max-w-4xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">
                        {userToEdit ? 'Editar Empleado' : 'Nuevo Empleado'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <div className="flex flex-col md:flex-row">
                    {/* Left Column: Basic Info */}
                    <form onSubmit={handleSubmit} className="p-6 space-y-4 flex-1 border-r border-gray-100">
                        <h3 className="font-semibold text-gray-700 mb-2">Información Personal</h3>
                        <div className="grid grid-cols-1 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Nombre *</label>
                                <input
                                    required
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={formData.name}
                                    onChange={e => setFormData({ ...formData, name: capitalizeWords(cleanName(e.target.value)) })}
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Apellidos</label>
                                <input
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={formData.last_name}
                                    onChange={e => setFormData({ ...formData, last_name: capitalizeWords(cleanName(e.target.value)) })}
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 gap-4">
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
                                    onChange={e => setFormData({ ...formData, phone: formatPhoneNumber(e.target.value) })}
                                    placeholder="+56 9 XXXX XXXX"
                                />
                            </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Rol *</label>
                                <select
                                    className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                    value={formData.role}
                                    onChange={e => handleRoleChange(e.target.value)}
                                >
                                    <option value="seller">Vendedor/a</option>
                                    <option value="admin">Administrador/a</option>
                                    <option value="veterinarian">Veterinario/a</option>
                                    <option value="groomer">Peluquero/a</option>
                                </select>
                                <p className="text-xs text-gray-500 mt-1">Al cambiar el rol se reiniciarán los permisos.</p>
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

                        {userToEdit && (
                            <div className="pt-4 border-t border-gray-200">
                                <h3 className="font-semibold text-gray-700 mb-3">Estado de la cuenta</h3>
                                <div className="space-y-3">
                                    <label className="flex items-center gap-3 p-3 rounded-lg border bg-gray-50 cursor-pointer hover:bg-white transition-colors">
                                        <input
                                            type="checkbox"
                                            className="w-4 h-4 text-blue-600 rounded"
                                            checked={formData.is_active}
                                            onChange={e => setFormData({ ...formData, is_active: e.target.checked })}
                                        />
                                        <div>
                                            <p className="text-sm font-medium text-gray-800">Cuenta Activa</p>
                                            <p className="text-xs text-gray-500">Si se desactiva, el empleado no podrá iniciar sesión.</p>
                                        </div>
                                    </label>

                                    {formData.is_blocked && (
                                        <label className="flex items-center gap-3 p-3 rounded-lg border border-red-200 bg-red-50 cursor-pointer">
                                            <input
                                                type="checkbox"
                                                className="w-4 h-4 text-red-600 rounded"
                                                checked={!formData.is_blocked}
                                                onChange={e => setFormData({ ...formData, is_blocked: !e.target.checked })}
                                            />
                                            <div>
                                                <p className="text-sm font-medium text-red-800">Desbloquear Cuenta</p>
                                                <p className="text-xs text-red-600">Esta cuenta fue bloqueada automáticamente por intentos fallidos.</p>
                                            </div>
                                        </label>
                                    )}
                                </div>
                            </div>
                        )}

                        <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6 md:hidden">
                            <button type="button" onClick={onClose} className="px-4 py-2 border border-gray-300 rounded-lg">Cancelar</button>
                            <button type="submit" className="px-4 py-2 bg-primary text-white rounded-lg">Guardar</button>
                        </div>
                    </form>

                    {/* Right Column: Permissions */}
                    <div className="p-6 bg-gray-50 flex-1 overflow-y-auto max-h-[600px]">
                        <h3 className="font-semibold text-gray-700 mb-4 flex items-center justify-between">
                            <span>Otorgar Módulos</span>
                            <span className="text-xs font-normal bg-blue-100 text-blue-700 px-2 py-1 rounded-full">
                                {formData.permissions.length} seleccionados
                            </span>
                        </h3>
                        <p className="text-sm text-gray-500 mb-4">
                            Seleccione manualmente los módulos a los que este empleado tendrá acceso. Estos permisos anulan los predeterminados del rol.
                        </p>

                        <div className="grid grid-cols-1 gap-2">
                            {ALL_PERMISSIONS.map(perm => (
                                <label
                                    key={perm.id}
                                    className={`flex items-center p-3 rounded-lg border transition-all cursor-pointer ${formData.permissions.includes(perm.id)
                                        ? 'bg-white border-blue-500 shadow-sm'
                                        : 'bg-gray-100 border-transparent hover:bg-gray-200'
                                        }`}
                                >
                                    <input
                                        type="checkbox"
                                        className="w-4 h-4 text-blue-600 rounded border-gray-300 focus:ring-blue-500"
                                        checked={formData.permissions.includes(perm.id)}
                                        onChange={() => togglePermission(perm.id)}
                                    />
                                    <span className="ml-3 text-sm font-medium text-gray-700">{perm.label}</span>
                                </label>
                            ))}
                        </div>
                    </div>
                </div>

                {/* Footer Actions (Desktop) */}
                <div className="hidden md:flex justify-end gap-3 p-6 border-t border-gray-200 bg-white rounded-b-xl">
                    <button
                        type="button"
                        onClick={onClose}
                        className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 bg-white font-medium"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleSubmit}
                        disabled={loading}
                        className="px-6 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 font-medium flex items-center gap-2 shadow-sm transition-colors"
                    >
                        <Save size={18} />
                        {loading ? 'Guardando...' : (userToEdit ? 'Actualizar Permisos' : 'Crear Empleado')}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default EmployeeFormModal;
