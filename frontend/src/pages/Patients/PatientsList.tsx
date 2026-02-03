import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../../api/axios';
import { Plus, Search, Eye, Trash2, Dog } from 'lucide-react';

interface Patient {
    _id: string;
    name: string;
    species: string;
    breed: string;
    tutor_name?: string; // Need populate or fetch
}

const PatientsList = () => {
    const [patients, setPatients] = useState<Patient[]>([]);
    const [loading, setLoading] = useState(true);
    const [search, setSearch] = useState('');

    const fetchPatients = async () => {
        setLoading(true);
        try {
            const { data } = await api.get('/patients', {
                params: { search }
            });
            // Ideally backend expands tutor, or we fetch it. 
            // For now, assuming backend returns IDs, and we might display "Tutor ID" or expand in backend.
            // Backend Patient.find_all(fetch_links=True) helps if Link used, but we used IDs manually.
            // Beanie with manual IDs doesn't auto-fetch. We need aggregation or separate fetch.
            // For MVP, just show Name/Species/Breed.
            setPatients(data);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        const timeout = setTimeout(fetchPatients, 300);
        return () => clearTimeout(timeout);
    }, [search]);

    const handleDelete = async (id: string) => {
        if (!confirm('¿Estás seguro?')) return;
        try {
            await api.delete(`/patients/${id}`);
            fetchPatients();
        } catch (error) {
            alert('Error');
        }
    };

    return (
        <div>
            <div className="flex justify-between items-center mb-6">
                <h1 className="text-2xl font-bold text-gray-900 flex items-center gap-2">
                    <Dog className="text-blue-400" /> Pacientes
                </h1>
            </div>

            <div className="bg-white rounded-xl shadow-sm border border-brand-accent/20 overflow-hidden">
                <div className="p-4 border-b border-brand-accent/20">
                    <div className="flex flex-col md:flex-row gap-4 items-center">
                        <div className="relative flex-1 w-full">
                            <Search className="absolute left-3 top-2.5 text-gray-400" size={18} />
                            <input
                                type="text"
                                placeholder="Buscar paciente..."
                                value={search}
                                onChange={(e) => setSearch(e.target.value)}
                                className="w-full pl-10 pr-4 py-2 border rounded-lg outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 transition-shadow"
                            />
                        </div>
                        <Link
                            to="/pacientes/crear"
                            className="bg-primary hover:opacity-90 text-white px-4 py-2 rounded-lg flex items-center space-x-2 transition-colors shadow-sm whitespace-nowrap"
                        >
                            <Plus className="w-4 h-4" />
                            <span>Nuevo Paciente</span>
                        </Link>
                    </div>
                </div>

                <div className="overflow-x-auto">
                    <table className="w-full text-left">
                        <thead className="bg-brand-surface text-gray-500 font-medium border-b border-brand-accent/20">
                            <tr>
                                <th className="px-6 py-3">Nombre</th>
                                <th className="px-6 py-3">Especie</th>
                                <th className="px-6 py-3">Raza</th>
                                <th className="px-6 py-3 text-right">Acciones</th>
                            </tr>
                        </thead>
                        <tbody className="divide-y divide-gray-100">
                            {loading ? (
                                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">Cargando...</td></tr>
                            ) : patients.length === 0 ? (
                                <tr><td colSpan={4} className="px-6 py-8 text-center text-gray-500">No hay pacientes.</td></tr>
                            ) : (
                                patients.map((patient) => (
                                    <tr key={patient._id} className="hover:bg-brand-surface/50 transition-colors">
                                        <td className="px-6 py-4 font-medium text-gray-900">{patient.name}</td>
                                        <td className="px-6 py-4 text-gray-600">
                                            <span className={`px-2 py-1 rounded-full text-xs font-medium ${patient.species === 'Perro' ? 'bg-primary/10 text-primary' :
                                                patient.species === 'Gato' ? 'bg-secondary/10 text-secondary' :
                                                    'bg-gray-100 text-gray-800'
                                                }`}>
                                                {patient.species}
                                            </span>
                                        </td>
                                        <td className="px-6 py-4 text-gray-600">{patient.breed}</td>
                                        <td className="px-6 py-4 text-right space-x-2">
                                            <Link
                                                to={`/pacientes/${patient._id}`}
                                                className="inline-block p-2 text-blue-600 hover:bg-blue-50 rounded-lg"
                                                title="Ver Ficha"
                                            >
                                                <Eye className="w-4 h-4" />
                                            </Link>
                                            {/* Edit could be separate or inside detail */}
                                            <button
                                                onClick={() => handleDelete(patient._id)}
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

export default PatientsList;
