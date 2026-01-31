import { Link } from 'react-router-dom';

const SummaryTab = ({ patient }: any) => {
    return (
        <div className="space-y-6">
            <h3 className="text-lg font-bold text-gray-900">Información del Paciente</h3>
            <div className="bg-gray-50 rounded-lg p-6 border grid grid-cols-1 md:grid-cols-2 gap-y-4 gap-x-8">
                <div>
                    <span className="block text-sm text-gray-500">Nombre</span>
                    <span className="font-medium">{patient.name}</span>
                </div>
                <div>
                    <div>
                        <span className="block text-sm text-gray-500">Tutor</span>
                        {patient.tutor ? (
                            <Link to={`/tutores/${patient.tutor._id || patient.tutor_id}`} className="font-medium text-blue-600 hover:underline">
                                {patient.tutor.full_name}
                            </Link>
                        ) : (
                            <span className="text-gray-400">-</span>
                        )}
                    </div>

                    {patient.tutor2 && (
                        <div className="mt-4">
                            <span className="block text-sm text-gray-500">Tutor Secundario</span>
                            <Link to={`/tutores/${patient.tutor2._id || patient.tutor2_id}`} className="font-medium text-blue-600 hover:underline">
                                {patient.tutor2.full_name}
                            </Link>
                        </div>
                    )}
                </div>
                <div>
                    <span className="block text-sm text-gray-500">Especie / Raza</span>
                    <span className="font-medium">{patient.species} / {patient.breed}</span>
                </div>
                <div>
                    <span className="block text-sm text-gray-500">Sexo / Color</span>
                    <span className="font-medium">{patient.sex} / {patient.color}</span>
                </div>
                <div>
                    <span className="block text-sm text-gray-500">Fecha Nacimiento</span>
                    <span className="font-medium">{patient.birth_date ? new Date(patient.birth_date).toLocaleDateString() : '-'}</span>
                </div>
                <div>
                    <span className="block text-sm text-gray-500">Peso</span>
                    <span className="font-medium">{patient.weight || '-'} kg</span>
                </div>
                <div className="col-span-1 md:col-span-2">
                    <span className="block text-sm text-gray-500">Alergias</span>
                    <span className="font-medium text-red-600">{patient.allergies || 'Ninguna conocida'}</span>
                </div>
                <div className="col-span-1 md:col-span-2">
                    <span className="block text-sm text-gray-500">Notas</span>
                    <p className="font-medium text-gray-700 whitespace-pre-wrap">{patient.notes || '-'}</p>
                </div>
            </div>
        </div>
    );
};

export default SummaryTab;
