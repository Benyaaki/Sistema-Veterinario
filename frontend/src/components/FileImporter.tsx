import React, { useRef, useState } from 'react';
import { Upload, CheckCircle, AlertCircle, Loader2 } from 'lucide-react';
import axios from 'axios';

interface FileImporterProps {
    label: string;
    endpoint: string;
    onSuccess?: () => void;
}

const FileImporter: React.FC<FileImporterProps> = ({ label, endpoint, onSuccess }) => {
    const fileInputRef = useRef<HTMLInputElement>(null);
    const [deleteExisting, setDeleteExisting] = useState(false);
    const [isUploading, setIsUploading] = useState(false);
    const [status, setStatus] = useState<'idle' | 'success' | 'error'>('idle');
    const [message, setMessage] = useState('');

    const handleFileChange = async (event: React.ChangeEvent<HTMLInputElement>) => {
        const file = event.target.files?.[0];
        if (!file) return;

        if (!file.name.endsWith('.txt') && !file.name.endsWith('.csv')) {
            setStatus('error');
            setMessage('Solo se permiten archivos .txt o .csv');
            return;
        }

        const confirmReset = !deleteExisting || window.confirm('¿Estás seguro de que deseas eliminar TODOS los registros actuales antes de importar? Esta acción no se puede deshacer.');
        if (!confirmReset) {
            if (fileInputRef.current) fileInputRef.current.value = '';
            return;
        }

        setIsUploading(true);
        setStatus('idle');
        setMessage('');

        const formData = new FormData();
        formData.append('file', file);

        try {
            // Send delete_existing as a query parameter
            const response = await axios.post(`http://localhost:8000${endpoint}?delete_existing=${deleteExisting}`, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data',
                }
            });
            setStatus('success');
            setMessage(response?.data?.message || 'Importación exitosa');
            if (onSuccess) onSuccess();
        } catch (error: any) {
            console.error("Import error:", error);
            setStatus('error');
            const errorMsg = error.response?.data?.detail || error.message || 'Error al importar archivo';
            setMessage(typeof errorMsg === 'string' ? errorMsg : 'Error en el servidor');
        } finally {
            setIsUploading(false);
            // Reset input
            if (fileInputRef.current) {
                fileInputRef.current.value = '';
            }
        }
    };

    const triggerFileInput = () => {
        fileInputRef.current?.click();
    };

    return (
        <div className="flex flex-col items-end gap-2 text-sm">
            <input
                type="file"
                accept=".txt,.csv"
                ref={fileInputRef}
                onChange={handleFileChange}
                className="hidden"
            />

            <div className="flex items-center gap-4">
                <label className="flex items-center gap-2 cursor-pointer group">
                    <input
                        type="checkbox"
                        checked={deleteExisting}
                        onChange={(e) => setDeleteExisting(e.target.checked)}
                        className="w-4 h-4 rounded border-gray-300 text-red-600 focus:ring-red-500"
                    />
                    <span className="text-[10px] text-gray-500 group-hover:text-red-600 transition-colors">
                        Eliminar anteriores
                    </span>
                </label>

                <button
                    onClick={triggerFileInput}
                    disabled={isUploading}
                    className="flex items-center gap-2 text-white px-3 py-2 rounded-md transition-colors disabled:opacity-50 bg-primary hover:opacity-90 shadow-sm"
                >
                    {isUploading ? (
                        <Loader2 className="w-4 h-4 animate-spin" />
                    ) : (
                        <Upload className="w-4 h-4" />
                    )}
                    Importar {label} (CSV/TXT)
                </button>
            </div>

            {status === 'success' && (
                <span className="text-green-600 flex items-center gap-1 text-xs animate-fade-in">
                    <CheckCircle className="w-3 h-3" /> {message}
                </span>
            )}

            {status === 'error' && (
                <span className="text-red-600 flex items-center gap-1 text-xs animate-fade-in">
                    <AlertCircle className="w-3 h-3" /> {message}
                </span>
            )}
        </div>
    );
};

export default FileImporter;
