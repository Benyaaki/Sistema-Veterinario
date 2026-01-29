import React from 'react';
import { X, Calendar, Clock, Smile } from 'lucide-react';

interface Appointment {
    id: string;
    date: string;
    patient_name: string;
    patient_species: string;
    reason: string;
}

interface WelcomeModalProps {
    isOpen: boolean;
    onClose: () => void;
    appointments: Appointment[];
    userName?: string;
}

const WelcomeModal: React.FC<WelcomeModalProps> = ({ isOpen, onClose, appointments, userName = 'Doctor' }) => {
    if (!isOpen) return null;

    const formatDate = (dateString: string) => {
        return new Date(dateString).toLocaleTimeString('es-CL', { hour: '2-digit', minute: '2-digit' });
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50 backdrop-blur-sm animate-fade-in">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-lg overflow-hidden transform transition-all animate-scale-in">
                {/* Header with decorative background */}
                <div className="bg-primary p-6 text-center text-white relative">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 text-white/80 hover:text-white p-1 hover:bg-white/10 rounded-full transition-colors"
                    >
                        <X className="w-6 h-6" />
                    </button>
                    <div className="mx-auto w-16 h-16 bg-white/20 rounded-full flex items-center justify-center mb-4 backdrop-blur-sm">
                        <Smile className="w-8 h-8 text-white" />
                    </div>
                    <h2 className="text-2xl font-bold mb-1">¡Hola, {userName}!</h2>
                    <p className="text-blue-100">Te deseamos un excelente día de trabajo.</p>
                </div>

                {/* Content */}
                <div className="p-6">
                    <div className="flex items-center justify-between mb-4">
                        <h3 className="font-bold text-gray-800 flex items-center">
                            <Calendar className="w-5 h-5 mr-2 text-primary" />
                            Tu agenda para hoy
                        </h3>
                        <span className="text-xs font-semibold bg-blue-50 text-blue-700 px-3 py-1 rounded-full">
                            {appointments.length} Cita{appointments.length !== 1 ? 's' : ''}
                        </span>
                    </div>

                    <div className="max-h-[300px] overflow-y-auto pr-2 space-y-3 custom-scrollbar">
                        {appointments.length === 0 ? (
                            <div className="text-center py-8 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                <p className="text-gray-500 text-sm">No tienes citas programadas para hoy.</p>
                                <p className="text-gray-400 text-xs mt-1">¡Aprovecha para adelantar pendientes!</p>
                            </div>
                        ) : (
                            appointments.map((apt) => (
                                <div key={apt.id} className="flex items-start p-3 bg-gray-50 hover:bg-white border border-transparent hover:border-gray-200 rounded-xl transition-all shadow-sm">
                                    <div className="bg-white p-2 rounded-lg border border-gray-100 flex flex-col items-center justify-center min-w-[60px] mr-3">
                                        <Clock className="w-4 h-4 text-primary mb-1" />
                                        <span className="text-xs font-bold text-gray-700">{formatDate(apt.date)}</span>
                                    </div>
                                    <div>
                                        <h4 className="font-bold text-gray-800 text-sm">
                                            {apt.patient_name}
                                            <span className="font-normal text-gray-500 ml-1 text-xs">({apt.patient_species})</span>
                                        </h4>
                                        <p className="text-xs text-gray-600 mt-0.5 line-clamp-1">{apt.reason}</p>
                                    </div>
                                </div>
                            ))
                        )}
                    </div>

                    <button
                        onClick={onClose}
                        className="w-full mt-6 bg-gray-900 hover:bg-gray-800 text-white font-medium py-3 rounded-xl transition-colors shadow-lg shadow-gray-200"
                    >
                        Comenzar mi día
                    </button>
                </div>
            </div>
        </div>
    );
};

export default WelcomeModal;
