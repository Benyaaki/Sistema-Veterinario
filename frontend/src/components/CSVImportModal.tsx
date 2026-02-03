import { useState } from 'react';
import { Upload, X, CheckCircle, AlertCircle, FileText } from 'lucide-react';
import api from '../api/axios';

interface CSVImportModalProps {
    isOpen: boolean;
    onClose: () => void;
    endpoint: string;
    title: string;
    onSuccess: () => void;
    templateFields?: string[];
}

const CSVImportModal = ({ isOpen, onClose, endpoint, title, onSuccess, templateFields }: CSVImportModalProps) => {
    const [file, setFile] = useState<File | null>(null);
    const [importing, setImporting] = useState(false);
    const [result, setResult] = useState<any>(null);
    const [dragActive, setDragActive] = useState(false);

    if (!isOpen) return null;

    const handleDrag = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (e.type === "dragenter" || e.type === "dragover") {
            setDragActive(true);
        } else if (e.type === "dragleave") {
            setDragActive(false);
        }
    };

    const handleDrop = (e: React.DragEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setDragActive(false);

        if (e.dataTransfer.files && e.dataTransfer.files[0]) {
            handleFile(e.dataTransfer.files[0]);
        }
    };

    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        e.preventDefault();
        if (e.target.files && e.target.files[0]) {
            handleFile(e.target.files[0]);
        }
    };

    const handleFile = (file: File) => {
        if (file.type !== 'text/csv' && !file.name.endsWith('.csv')) {
            alert('Por favor selecciona un archivo CSV válido');
            return;
        }
        setFile(file);
        setResult(null);
    };

    const handleImport = async () => {
        if (!file) return;

        setImporting(true);
        setResult(null);

        try {
            const formData = new FormData();
            formData.append('file', file);

            const res = await api.post(endpoint, formData, {
                headers: {
                    'Content-Type': 'multipart/form-data'
                }
            });

            setResult({
                success: true,
                data: res.data
            });

            setTimeout(() => {
                onSuccess();
                handleClose();
            }, 2000);
        } catch (error: any) {
            console.error(error);
            setResult({
                success: false,
                error: error.response?.data?.detail || 'Error al importar el archivo'
            });
        } finally {
            setImporting(false);
        }
    };

    const handleClose = () => {
        setFile(null);
        setResult(null);
        onClose();
    };

    const downloadTemplate = () => {
        if (!templateFields || templateFields.length === 0) return;

        const csvContent = templateFields.join(',') + '\n';
        const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
        const link = document.createElement('a');
        link.href = URL.createObjectURL(blob);
        link.download = `plantilla_${title.toLowerCase().replace(/\s+/g, '_')}.csv`;
        link.click();
    };

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800 flex items-center gap-2">
                        <Upload size={24} className="text-primary" />
                        Importar {title}
                    </h2>
                    <button onClick={handleClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                {/* Content */}
                <div className="p-6 space-y-6">
                    {/* Template Download */}
                    {templateFields && templateFields.length > 0 && (
                        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                            <div className="flex items-start gap-3">
                                <FileText size={20} className="text-blue-600 mt-0.5" />
                                <div className="flex-1">
                                    <h3 className="font-semibold text-blue-900 mb-1">Plantilla CSV</h3>
                                    <p className="text-sm text-blue-700 mb-2">
                                        Descarga la plantilla para asegurarte de que tu archivo tiene el formato correcto.
                                    </p>
                                    <button
                                        onClick={downloadTemplate}
                                        className="text-sm text-blue-600 hover:underline font-medium"
                                    >
                                        Descargar Plantilla
                                    </button>
                                </div>
                            </div>
                        </div>
                    )}

                    {/* File Upload */}
                    <div
                        className={`border-2 border-dashed rounded-lg p-8 text-center transition-colors ${dragActive
                            ? 'border-primary bg-brand-surface'
                            : 'border-gray-300 hover:border-gray-400'
                            }`}
                        onDragEnter={handleDrag}
                        onDragLeave={handleDrag}
                        onDragOver={handleDrag}
                        onDrop={handleDrop}
                    >
                        <Upload size={48} className="mx-auto text-gray-400 mb-4" />
                        <p className="text-gray-600 mb-2">
                            Arrastra tu archivo CSV aquí o haz clic para seleccionar
                        </p>
                        <input
                            type="file"
                            accept=".csv"
                            onChange={handleChange}
                            className="hidden"
                            id="csv-upload"
                        />
                        <label
                            htmlFor="csv-upload"
                            className="inline-block px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 cursor-pointer transition-colors"
                        >
                            Seleccionar Archivo
                        </label>
                    </div>

                    {/* Selected File */}
                    {file && (
                        <div className="bg-gray-50 border border-gray-200 rounded-lg p-4 flex items-center justify-between">
                            <div className="flex items-center gap-3">
                                <FileText size={24} className="text-gray-600" />
                                <div>
                                    <p className="font-medium text-gray-800">{file.name}</p>
                                    <p className="text-sm text-gray-500">
                                        {(file.size / 1024).toFixed(2)} KB
                                    </p>
                                </div>
                            </div>
                            <button
                                onClick={() => setFile(null)}
                                className="text-red-500 hover:text-red-700"
                            >
                                <X size={20} />
                            </button>
                        </div>
                    )}

                    {/* Result */}
                    {result && (
                        <div
                            className={`border rounded-lg p-4 ${result.success
                                ? 'bg-green-50 border-green-200'
                                : 'bg-red-50 border-red-200'
                                }`}
                        >
                            <div className="flex items-start gap-3">
                                {result.success ? (
                                    <CheckCircle size={24} className="text-green-600 mt-0.5" />
                                ) : (
                                    <AlertCircle size={24} className="text-red-600 mt-0.5" />
                                )}
                                <div className="flex-1">
                                    <h3
                                        className={`font-semibold mb-1 ${result.success ? 'text-green-900' : 'text-red-900'
                                            }`}
                                    >
                                        {result.success ? '¡Importación Exitosa!' : 'Error en la Importación'}
                                    </h3>
                                    {result.success ? (
                                        <div className="text-sm text-green-700">
                                            <p>Registros importados: {result.data?.success || 0}</p>
                                            {result.data?.errors > 0 && (
                                                <p className="text-yellow-700">
                                                    Registros con errores: {result.data.errors}
                                                </p>
                                            )}
                                        </div>
                                    ) : (
                                        <p className="text-sm text-red-700">{result.error}</p>
                                    )}
                                </div>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 p-6 border-t border-gray-200">
                    <button
                        onClick={handleClose}
                        className="px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors"
                    >
                        Cancelar
                    </button>
                    <button
                        onClick={handleImport}
                        disabled={!file || importing}
                        className={`px-4 py-2 rounded-lg transition-colors ${file && !importing
                            ? 'bg-primary text-white hover:opacity-90'
                            : 'bg-gray-300 text-gray-500 cursor-not-allowed'
                            }`}
                    >
                        {importing ? 'Importando...' : 'Importar'}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default CSVImportModal;
