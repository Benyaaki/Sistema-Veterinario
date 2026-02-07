import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import { Plus, Download, Trash2, FilePlus, Edit2 } from 'lucide-react';
import { useForm } from 'react-hook-form';

const ExamsTab = ({ patientId }: { patientId: string }) => {
    const [exams, setExams] = useState<any[]>([]);
    const [showForm, setShowForm] = useState(false);
    const [editingExam, setEditingExam] = useState<any>(null);

    const fetchExams = () => {
        api.get(`/exams/patient/${patientId}`).then(({ data }) => setExams(data));
    };

    useEffect(() => {
        fetchExams();
    }, [patientId]);

    return (
        <div className="space-y-6">
            <div className="flex justify-between items-center">
                <h3 className="text-lg font-bold text-gray-900">Exámenes Médicos</h3>
                <button
                    onClick={() => setShowForm(!showForm)}
                    className="flex items-center space-x-2 text-sm font-medium text-blue-600 hover:bg-blue-50 px-3 py-2 rounded-lg transition-colors"
                >
                    <Plus className="w-4 h-4" />
                    <span>{showForm ? 'Cancelar' : 'Nuevo Examen'}</span>
                </button>
            </div>

            {showForm && (
                <ExamForm patientId={patientId} onSuccess={() => { setShowForm(false); fetchExams(); }} />
            )}

            {editingExam && (
                <ExamForm
                    patientId={patientId}
                    exam={editingExam}
                    onSuccess={() => { setEditingExam(null); fetchExams(); }}
                    onCancel={() => setEditingExam(null)}
                />
            )}

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {exams.length === 0 ? (
                    <p className="col-span-2 text-gray-500 italic">No hay exámenes registrados.</p>
                ) : (
                    exams.map(ex => (
                        <div key={ex._id} className="bg-white border rounded-lg p-4">
                            <div className="flex justify-between items-start mb-2">
                                <div>
                                    <h4 className="font-bold text-gray-900">{ex.type}</h4>
                                    <p className="text-xs text-gray-500">{new Date(ex.date).toLocaleDateString()}</p>
                                </div>
                                <div className="flex space-x-2">
                                    <button onClick={() => setEditingExam(ex)} className="text-gray-400 hover:text-blue-500 transition-colors">
                                        <Edit2 className="w-4 h-4" />
                                    </button>
                                    <button onClick={async () => { if (confirm('¿Eliminar este examen?')) { await api.delete(`/exams/${ex._id}`); fetchExams(); } }} className="text-gray-400 hover:text-red-500 transition-colors">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                            {ex.result_text && <p className="text-sm text-gray-700 mb-3">{ex.result_text}</p>}

                            <div className="space-y-2">
                                {ex.files && ex.files.length > 0 && (
                                    <div className="space-y-2 mt-3">
                                        <p className="text-xs font-semibold text-gray-500 uppercase">Archivos Adjuntos:</p>
                                        {ex.files.map((file: any) => (
                                            <div key={file.id} className="flex items-start justify-between bg-gray-50 p-2 rounded border">
                                                <div className="flex-1 mr-2">
                                                    <div className="flex items-center space-x-2">
                                                        <span className="text-sm font-medium text-gray-700 truncate">{file.original_name}</span>
                                                        <FileDownload fileId={file.id} />
                                                    </div>
                                                    {file.comment && <p className="text-xs text-gray-500 mt-0.5 italic">"{file.comment}"</p>}
                                                </div>
                                            </div>
                                        ))}
                                    </div>
                                )}

                                <FileUpload examId={ex._id} onSuccess={fetchExams} />
                            </div>
                        </div>
                    ))
                )}
            </div>
        </div>
    );
};

const FileDownload = ({ fileId }: { fileId: string }) => {
    const handleDownload = async () => {
        try {
            const response = await api.get(`/files/${fileId}`, { responseType: 'blob' });
            const url = window.URL.createObjectURL(new Blob([response.data]));
            const link = document.createElement('a');
            link.href = url;
            // Best effort filename or server Content-Disposition
            const contentDisposition = response.headers['content-disposition'];
            let fileName = 'archivo';
            if (contentDisposition) {
                const fileNameMatch = contentDisposition.match(/filename="?(.+)"?/);
                if (fileNameMatch && fileNameMatch.length === 2) fileName = fileNameMatch[1];
            }
            link.setAttribute('download', fileName);
            document.body.appendChild(link);
            link.click();
            link.remove();
        } catch (e) {
            alert('Error al descargar');
        }
    };

    return (
        <button onClick={handleDownload} className="text-blue-600 hover:text-blue-800 p-1 rounded hover:bg-blue-100" title="Descargar">
            <Download className="w-4 h-4" />
        </button>
    );
}

const FileUpload = ({ examId, onSuccess }: any) => {
    const [file, setFile] = useState<File | null>(null);
    const [comment, setComment] = useState("");
    const [uploading, setUploading] = useState(false);

    const handleFileChange = (e: any) => {
        if (e.target.files[0]) setFile(e.target.files[0]);
    };

    const handleUpload = async () => {
        if (!file) return;
        setUploading(true);
        const formData = new FormData();
        formData.append('file', file);
        if (comment) formData.append('comment', comment);

        try {
            await api.post(`/exams/${examId}/files`, formData, {
                headers: { 'Content-Type': 'multipart/form-data' }
            });
            setFile(null);
            setComment("");
            onSuccess();
        } catch {
            alert('Error al subir');
        } finally {
            setUploading(false);
        }
    };

    if (!file) {
        return (
            <div className="mt-2">
                <label className="flex items-center text-xs text-gray-500 hover:text-blue-600 cursor-pointer transition-colors duration-200">
                    <FilePlus className="w-4 h-4 mr-1" /> Adjuntar archivo
                    <input type="file" className="hidden" onChange={handleFileChange} />
                </label>
            </div>
        );
    }

    return (
        <div className="mt-3 bg-blue-50 p-3 rounded-lg border border-blue-100">
            <p className="text-xs font-semibold text-blue-800 mb-2 truncate">Adjuntar: {file.name}</p>
            <input
                type="text"
                placeholder="Comentario (opcional)"
                className="w-full text-xs px-2 py-1 border rounded mb-2 focus:ring-1 focus:ring-blue-500 outline-none"
                value={comment}
                onChange={(e) => setComment(e.target.value)}
            />
            <div className="flex space-x-2">
                <button
                    onClick={handleUpload}
                    disabled={uploading}
                    className="flex-1 bg-blue-600 text-white text-xs py-1 rounded hover:bg-blue-700 disabled:opacity-50"
                >
                    {uploading ? 'Subiendo...' : 'Subir'}
                </button>
                <button
                    onClick={() => { setFile(null); setComment(""); }}
                    disabled={uploading}
                    className="px-2 py-1 text-xs text-gray-500 hover:text-gray-700 border rounded bg-white"
                >
                    Cancelar
                </button>
            </div>
        </div>
    )
}

const ExamForm = ({ patientId, exam, onSuccess, onCancel }: any) => {
    const { register, handleSubmit } = useForm({
        defaultValues: exam ? {
            type: exam.type,
            result_text: exam.result_text
        } : {}
    });
    const [pendingFiles, setPendingFiles] = useState<{ file: File, comment: string }[]>([]);
    const [saving, setSaving] = useState(false);

    // Temp state for new file input
    const [tempFile, setTempFile] = useState<File | null>(null);
    const [tempComment, setTempComment] = useState("");

    const addFile = () => {
        if (tempFile) {
            setPendingFiles([...pendingFiles, { file: tempFile, comment: tempComment }]);
            setTempFile(null);
            setTempComment("");
        }
    }

    const removeFile = (index: number) => {
        setPendingFiles(pendingFiles.filter((_, i) => i !== index));
    }

    const onSubmit = async (data: any) => {
        setSaving(true);
        try {
            let examId = exam?._id;

            if (exam) {
                // Update existing
                await api.put(`/exams/${exam._id}`, data);
            } else {
                // 1. Create Exam
                const res = await api.post('/exams', { ...data, patient_id: patientId });
                examId = res.data._id;
            }

            // 2. Upload Files if any
            if (pendingFiles.length > 0 && examId) {
                for (const pf of pendingFiles) {
                    const formData = new FormData();
                    formData.append('file', pf.file);
                    if (pf.comment) formData.append('comment', pf.comment);

                    await api.post(`/exams/${examId}/files`, formData, {
                        headers: { 'Content-Type': 'multipart/form-data' }
                    });
                }
            }

            onSuccess();
        } catch (error) {
            console.error(error);
            alert('Error al guardar el examen o los archivos.');
        } finally {
            setSaving(false);
        }
    };

    return (
        <div className="bg-white p-6 rounded-lg border-2 border-blue-500 shadow-lg mb-6 animate-in slide-in-from-top duration-300">
            <div className="flex justify-between items-center mb-4">
                <h4 className="font-bold text-gray-900">{exam ? 'Editar Examen' : 'Registrar Nuevo Examen'}</h4>
                {onCancel && (
                    <button onClick={onCancel} className="text-gray-400 hover:text-gray-600 transition-colors">
                        <Plus className="w-5 h-5 rotate-45" />
                    </button>
                )}
            </div>
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Tipo de Examen</label>
                    <input {...register('type')} placeholder="Ej. Hemograma, Radiografía..." className="w-full px-3 py-2 border rounded-md text-sm" required />
                </div>

                <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">Resultados / Notas</label>
                    <textarea {...register('result_text')} placeholder="Descripción de los resultados..." className="w-full px-3 py-2 border rounded-md text-sm" rows={3} />
                </div>

                {/* File Selection Section */}
                <div className="border-t pt-4">
                    <label className="block text-sm font-medium text-gray-700 mb-2">Adjuntar Archivos (Opcional)</label>

                    {/* List of pending files */}
                    {pendingFiles.length > 0 && (
                        <div className="mb-3 space-y-2">
                            {pendingFiles.map((pf, idx) => (
                                <div key={idx} className="flex justify-between items-center bg-white p-2 rounded border text-sm">
                                    <div className="truncate">
                                        <span className="font-medium">{pf.file.name}</span>
                                        {pf.comment && <span className="text-gray-500 italic ml-2">- {pf.comment}</span>}
                                    </div>
                                    <button type="button" onClick={() => removeFile(idx)} className="text-red-500 hover:text-red-700">
                                        <Trash2 className="w-4 h-4" />
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Add File Inputs */}
                    <div className="bg-gray-100 p-3 rounded-md flex flex-col md:flex-row gap-2 items-start md:items-center">
                        <label className="cursor-pointer bg-white border border-gray-300 text-gray-700 px-3 py-1.5 rounded text-sm hover:bg-gray-50 flex items-center">
                            <FilePlus className="w-4 h-4 mr-2" />
                            {tempFile ? tempFile.name : "Seleccionar Archivo"}
                            <input type="file" className="hidden" onChange={(e) => e.target.files && setTempFile(e.target.files[0])} />
                        </label>

                        <input
                            type="text"
                            placeholder="Comentario para este archivo..."
                            className="flex-1 px-3 py-1.5 border rounded text-sm"
                            value={tempComment}
                            onChange={(e) => setTempComment(e.target.value)}
                        />

                        <button
                            type="button"
                            onClick={addFile}
                            disabled={!tempFile}
                            className="bg-gray-600 text-white px-3 py-1.5 rounded text-sm hover:bg-gray-700 disabled:opacity-50"
                        >
                            Agregar
                        </button>
                    </div>
                </div>

                <div className="pt-2">
                    <button
                        type="submit"
                        disabled={saving}
                        className={`w-full ${exam ? 'bg-blue-600' : 'bg-primary'} text-white py-2 rounded-lg font-medium hover:opacity-90 disabled:opacity-50 flex justify-center items-center shadow-sm transition-all`}
                    >
                        {saving ? 'Guardando...' : (exam ? 'Actualizar Examen' : 'Guardar Examen y Archivos')}
                    </button>
                </div>
            </form>
        </div>
    )
}

export default ExamsTab;
