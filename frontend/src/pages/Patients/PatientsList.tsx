import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { Plus, Search, Eye, Trash2, Dog, ChevronLeft, ChevronRight } from 'lucide-react';
import { patientsService } from '../../api/services';
import api from '../../api/axios';

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
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPatients, setTotalPatients] = useState(0);
    const itemsPerPage = 200;

    const fetchPatients = async () => {
        setLoading(true);
        try {
            const res = await patientsService.getAll({
                search,
                page: currentPage,
                limit: itemsPerPage
            });
            setPatients(res.items);
            setTotalPatients(res.total);
        } catch (error) {
            console.error(error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        setCurrentPage(1);
    }, [search]);

    useEffect(() => {
        const timeout = setTimeout(fetchPatients, 300);
        return () => clearTimeout(timeout);
    }, [search, currentPage]);

    const totalPages = Math.ceil(totalPatients / itemsPerPage);

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

                {/* Pagination */}
                {totalPages > 1 && (
                    <div className="flex items-center justify-between border-t border-gray-200 bg-white px-4 py-3 sm:px-6">
                        <div className="flex flex-1 justify-between sm:hidden">
                            <button
                                onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                disabled={currentPage === 1}
                                className="relative inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Anterior
                            </button>
                            <button
                                onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                disabled={currentPage === totalPages}
                                className="relative ml-3 inline-flex items-center rounded-md border border-gray-300 bg-white px-4 py-2 text-sm font-medium text-gray-700 hover:bg-gray-50 disabled:opacity-50"
                            >
                                Siguiente
                            </button>
                        </div>
                        <div className="hidden sm:flex sm:flex-1 sm:items-center sm:justify-between">
                            <div>
                                <p className="text-sm text-gray-700">
                                    Mostrando <span className="font-medium">{(currentPage - 1) * itemsPerPage + 1}</span> a <span className="font-medium">{Math.min(currentPage * itemsPerPage, totalPatients)}</span> de{' '}
                                    <span className="font-medium">{totalPatients}</span> pacientes
                                </p>
                            </div>
                            <div>
                                <nav className="isolate inline-flex -space-x-px rounded-md shadow-sm" aria-label="Pagination">
                                    <button
                                        onClick={() => setCurrentPage(p => Math.max(1, p - 1))}
                                        disabled={currentPage === 1}
                                        className="relative inline-flex items-center rounded-l-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <ChevronLeft className="h-5 w-5" />
                                    </button>
                                    {[...Array(Math.min(5, totalPages))].map((_, i) => {
                                        let pageNum = currentPage;
                                        if (currentPage <= 3) pageNum = i + 1;
                                        else if (currentPage >= totalPages - 2) pageNum = totalPages - 4 + i;
                                        else pageNum = currentPage - 2 + i;

                                        if (pageNum <= 0 || pageNum > totalPages) return null;

                                        return (
                                            <button
                                                key={pageNum}
                                                onClick={() => setCurrentPage(pageNum)}
                                                className={`relative inline-flex items-center px-4 py-2 text-sm font-semibold ${currentPage === pageNum ? 'bg-blue-600 text-white' : 'text-gray-900 ring-1 ring-inset ring-gray-300 hover:bg-gray-50'}`}
                                            >
                                                {pageNum}
                                            </button>
                                        );
                                    })}
                                    <button
                                        onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))}
                                        disabled={currentPage === totalPages}
                                        className="relative inline-flex items-center rounded-r-md px-2 py-2 text-gray-400 ring-1 ring-inset ring-gray-300 hover:bg-gray-50 focus:z-20 focus:outline-offset-0 disabled:opacity-50"
                                    >
                                        <ChevronRight className="h-5 w-5" />
                                    </button>
                                </nav>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
};

export default PatientsList;
