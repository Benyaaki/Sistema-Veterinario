import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Plus, Search, Edit2, Trash2 } from 'lucide-react';

interface Tutor {
    _id: string;
    full_name: string;
    phone: string;
    email?: string;
}

const TutorsList = () => {
    const [tutors, setTutors] = useState<Tutor[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchTutors = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/tutors', {
                params: { search }
            });
            setTutors(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        // Debounce search could be better, but simple effect for now
        const timeout = setTimeout(fetchTutors, 300);
        return () => clearTimeout(timeout);
    }, [search]);

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro de eliminar este tutor?')) return;
        try {
            await api.delete(`/tutors/${id}`);
            fetchTutors();
        } catch (error) {
            alert('Error al eliminar');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900">Tutores</h1>
                <Link
                    to="/tutores/crear"
                    className="bg-primary hover:opacity-90 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm"
                >
                    <Plus className="w-4 h-4" />
                    <span>Nuevo Tutor</span>
                </Link>
            </div>

            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="p-4 border-b">
                    <div className="relative">
                        <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
                        <input
                            type="text"
                            placeholder="Buscar por nombre o teléfono..."
                            value={search}
                            onChange={(e) => setSearch(e.target.value)}
                            className="w-full pl-10 pr-4 py-2 border rounded-lg focus:ring-2 focus:ring-primary focus:border-primary outline-none"
                        />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-gray-50 text-gray-500 font-medium border-b">
                            <tr>
                                <th className="px-6 py-3">Nombre</th>
                                <th className="px-6 py-3">Teléfono</th>
                                <th className="px-6 py-3">Email</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        Cargando...
                                    </td>
                                </tr>
                            ) : tutors.length === 0 ? (
                                <tr>
                                    <td colSpan={4} className="px-6 py-8 text-center text-gray-500">
                                        No se encontraron tutores.
                                    </td>
                                </tr>
                            ) : (
                                tutors.map((tutor) => (
                                    <tr key={tutor._id} className="hover:bg-gray-50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{tutor.full_name}</td>
                                        <td className="px-6 py-4 text-gray-600">{tutor.phone}</td>
                                        <td className="px-6 py-4 text-gray-600">{tutor.email || '-'}</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <Link
                                                to={`/tutores/${tutor._id}`}
                                                className="inline-block p-2 text-primary hover:bg-brand-surface rounded-lg"
                                            >
                                                <Edit2 className="w-4 h-4" />
                                            </Link>
                                            <button
                                                onClick={() => handleDelete(tutor._id)}
                                                className="inline-block p-2 text-red-600 hover:bg-red-50 rounded-lg"
                                            >
                                                <Trash2 className="w-4 h-4" />
                                            </button>
                                        </td>
                                    </tr>
                                ))
                            )}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};

export default TutorsList;
