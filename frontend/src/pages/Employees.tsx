import { useState, useEffect } from 'react';
import api from '../api/axios';
import {
    Search, Edit, UserPlus, Trash2, User, Shield
} from 'lucide-react';
import EmployeeFormModal from '../components/EmployeeFormModal';

const Employees = () => {
    const [users, setUsers] = useState<any[]>([]);
    const [loading, setLoading] = useState(false);
    const [searchTerm, setSearchTerm] = useState('');
    const [isModalOpen, setIsModalOpen] = useState(false);
    const [userToEdit, setUserToEdit] = useState<any>(null);

    const fetchUsers = async () => {
        setLoading(true);
        try {
            const res = await api.get('/auth/users'); // Assuming this endpoint returns all users
            setUsers(res.data);
        } catch (error) {
            console.error("Error fetching users", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchUsers();
    }, []);

    const handleCreate = () => {
        setUserToEdit(null);
        setIsModalOpen(true);
    };

    const handleEdit = (user: any) => {
        setUserToEdit(user);
        setIsModalOpen(true);
    };

    const handleDelete = async (id: string, name: string) => {
        if (!confirm(`¿Estás seguro de que deseas eliminar al empleado ${name}?`)) return;

        try {
            await api.delete(`/auth/users/${id}`);
            alert('Empleado eliminado correctamente');
            fetchUsers();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.detail || 'Error al eliminar');
        }
    };

    const getRoleBadge = (role: string) => {
        switch (role) {
            case 'admin': return <span className="bg-red-100 text-red-700 px-2 py-1 rounded-full text-xs font-bold flex items-center gap-1 w-fit"><Shield size={10} /> Admin</span>;
            case 'veterinarian': return <span className="bg-blue-100 text-blue-700 px-2 py-1 rounded-full text-xs font-bold w-fit">Veterinario</span>;
            case 'groomer': return <span className="bg-purple-100 text-secondary px-2 py-1 rounded-full text-xs font-bold w-fit">Peluquero</span>;
            case 'seller': return <span className="bg-green-100 text-green-700 px-2 py-1 rounded-full text-xs font-bold w-fit">Vendedor</span>;
            default: return <span className="bg-gray-100 text-gray-700 px-2 py-1 rounded-full text-xs font-bold w-fit">Asistente</span>;
        }
    };

    const rolePriority: { [key: string]: number } = {
        'admin': 1,
        'veterinarian': 2,
        'seller': 3,
        'groomer': 4
    };

    const filteredUsers = users.filter(u =>
        u.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
        (u.email || '').toLowerCase().includes(searchTerm.toLowerCase())
    ).sort((a, b) => {
        const priorityA = rolePriority[a.role] || 99;
        const priorityB = rolePriority[b.role] || 99;
        return priorityA - priorityB;
    });

    return (
        <div className="p-6">
            <h1 className="text-2xl font-bold text-gray-900 mb-6 flex items-center gap-2">
                <User className="text-blue-400" /> Empleados
            </h1>

            {/* Actions Bar */}
            <div className="flex flex-col md:flex-row gap-4 mb-6 bg-white p-4 rounded-xl shadow-sm border border-gray-200 items-center">
                <div className="relative flex-1 w-full">
                    <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                    <input
                        type="text"
                        placeholder="Buscar..."
                        className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500"
                        value={searchTerm}
                        onChange={e => setSearchTerm(e.target.value)}
                    />
                </div>

                <button
                    onClick={handleCreate}
                    className="bg-primary text-white px-4 py-2 rounded-lg flex items-center gap-2 hover:opacity-90 transition-opacity whitespace-nowrap"
                >
                    <UserPlus size={20} />
                    Nuevo Empleado
                </button>
            </div>

            {/* Table */}
            <div className="bg-white rounded-xl shadow-sm border border-brand-accent/20 overflow-hidden">
                <table className="w-full text-left">
                    <thead className="bg-brand-surface text-gray-500 font-medium border-b border-brand-accent/20">
                        <tr>
                            <th className="px-6 py-3">Apellidos</th>
                            <th className="px-6 py-3">Nombre</th>
                            <th className="px-6 py-3">Email</th>
                            <th className="px-6 py-3">Rol</th>
                            <th className="px-6 py-3">Teléfono</th>
                            <th className="px-6 py-3 text-center">Acciones</th>
                        </tr>
                    </thead>
                    <tbody className="divide-y divide-gray-100 text-sm">
                        {loading && <tr><td colSpan={6} className="p-8 text-center text-gray-500">Cargando...</td></tr>}

                        {!loading && filteredUsers.map((user, idx) => (
                            <tr key={user.id} className="hover:bg-brand-surface/50 transition-colors group">
                                <td className="px-6 py-4 font-medium text-gray-900">{user.last_name || '-'}</td>
                                <td className="px-6 py-4 text-gray-600">{user.name}</td>
                                <td className="px-6 py-4 text-gray-600">{user.email}</td>
                                <td className="px-6 py-4">{getRoleBadge(user.role)}</td>
                                <td className="px-6 py-4 text-gray-600">{user.phone || '-'}</td>
                                <td className="px-6 py-4 text-center">
                                    <div className="flex justify-center gap-2 opacity-100">
                                        <button
                                            onClick={() => handleEdit(user)}
                                            className="p-1 px-2 border rounded text-blue-500 hover:bg-blue-50"
                                        >
                                            <Edit size={14} />
                                        </button>
                                        <button
                                            onClick={() => handleDelete(user.id, user.name)}
                                            className="p-1 px-2 border rounded text-red-500 hover:bg-red-50"
                                        >
                                            <Trash2 size={14} />
                                        </button>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
                {!loading && filteredUsers.length === 0 && (
                    <div className="p-8 text-center text-gray-500">No se encontraron empleados.</div>
                )}
            </div>
            {/* Modal */}
            <EmployeeFormModal
                isOpen={isModalOpen}
                onClose={() => setIsModalOpen(false)}
                onSuccess={fetchUsers}
                userToEdit={userToEdit}
            />
        </div>
    );
};

export default Employees;
