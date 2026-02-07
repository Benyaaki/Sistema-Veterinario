import { useEffect, useState } from 'react';
import { useParams, Link, useNavigate, useSearchParams } from 'react-router-dom';
import api from '../../api/axios';
import { ArrowLeft, FileText, Activity, Beaker, Pill, Edit2, Image as ImageIcon, Calendar } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import ConsultationsTab from './tabs/ConsultationsTab';
import ExamsTab from './tabs/ExamsTab';
import PrescriptionsTab from './tabs/PrescriptionsTab';
import SummaryTab from './tabs/SummaryTab';
import GalleryTab from './tabs/GalleryTab';

const PatientDetail = () => {
    const { id } = useParams();
    const [searchParams] = useSearchParams();
    const navigate = useNavigate();
    const { hasPermission } = useAuth();
    const [patient, setPatient] = useState<any>(null);
    const [activeTab, setActiveTab] = useState(searchParams.get('tab') || 'summary');
    const canListPatients = hasPermission('patients');

    useEffect(() => {
        const tab = searchParams.get('tab');
        if (tab) setActiveTab(tab);
    }, [searchParams]);

    useEffect(() => {
        api.get(`/patients/${id}`)
            .then(({ data }) => setPatient(data))
            .catch(() => navigate('/pacientes'));
    }, [id, navigate]);

    if (!patient) return <div className="p-8 text-center">Cargando...</div>;

    const renderTab = () => {
        switch (activeTab) {
            case 'summary': return <SummaryTab patient={patient} />;
            case 'consultations': return <ConsultationsTab
                patientId={patient._id}
                selectedConsultationId={searchParams.get('consultationId') || undefined}
                onClearSelection={() => {
                    const newParams = new URLSearchParams(searchParams);
                    newParams.delete('consultationId');
                    navigate({ search: newParams.toString() }, { replace: true });
                }}
            />;
            case 'exams': return <ExamsTab patientId={patient._id} />;
            case 'prescriptions': return <PrescriptionsTab patientId={patient._id} />;
            case 'gallery': return <GalleryTab patientId={patient._id} />;
            default: return null;
        }
    };

    return (
        <div>
            {/* Header */}
            <div className="mb-6">
                <button
                    onClick={() => navigate(canListPatients ? '/pacientes' : '/agenda')}
                    className="flex items-center text-gray-500 hover:text-gray-900 mb-2 transition-colors"
                >
                    {canListPatients ? (
                        <>
                            <ArrowLeft className="w-4 h-4 mr-1" /> Volver a Pacientes
                        </>
                    ) : (
                        <>
                            <Calendar className="w-4 h-4 mr-1" /> Volver a Agenda
                        </>
                    )}
                </button>
                <div className="flex items-center justify-between">
                    <div>
                        <h1 className="text-3xl font-bold text-gray-900">{patient.name}</h1>
                        <p className="text-gray-500">{patient.species} - {patient.breed} - {patient.sex} {patient.weight && `- ${patient.weight}kg`}</p>
                    </div>
                    {canListPatients && (
                        <Link
                            to={`/pacientes/editar/${patient._id}`}
                            className="flex items-center space-x-2 bg-white border border-gray-300 text-gray-700 px-4 py-2 rounded-lg hover:bg-gray-50 transition-colors shadow-sm"
                        >
                            <Edit2 className="w-4 h-4" />
                            <span className="font-medium">Editar Información</span>
                        </Link>
                    )}
                </div>
            </div>

            {/* Tabs */}
            <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="border-b overflow-x-auto">
                    <nav className="flex space-x-0 min-w-max">
                        <TabButton
                            active={activeTab === 'summary'}
                            onClick={() => setActiveTab('summary')}
                            icon={FileText}
                            label="Resumen"
                        />
                        <TabButton
                            active={activeTab === 'consultations'}
                            onClick={() => setActiveTab('consultations')}
                            icon={Activity}
                            label="Consultas"
                        />
                        <TabButton
                            active={activeTab === 'exams'}
                            onClick={() => setActiveTab('exams')}
                            icon={Beaker}
                            label="Exámenes"
                        />
                        <TabButton
                            active={activeTab === 'prescriptions'}
                            onClick={() => setActiveTab('prescriptions')}
                            icon={Pill}
                            label="Recetas"
                        />
                        <TabButton
                            active={activeTab === 'gallery'}
                            onClick={() => setActiveTab('gallery')}
                            icon={ImageIcon}
                            label="Galería"
                        />
                    </nav>
                </div>

                <div className="p-6">
                    {renderTab()}
                </div>
            </div>
        </div>
    );
};

const TabButton = ({ active, onClick, icon: Icon, label }: any) => (
    <button
        onClick={onClick}
        className={`flex items-center px-6 py-4 border-b-2 font-medium text-sm transition-colors focus:outline-none ${active
            ? 'border-primary text-primary bg-brand-surface/50'
            : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50'
            }`}
    >
        <Icon className={`w-4 h-4 mr-2 ${active ? 'text-primary' : 'text-gray-400'}`} />
        {label}
    </button>
);

export default PatientDetail;
