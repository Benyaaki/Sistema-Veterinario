import { useEffect, useState } from 'react';
import api from '../../../api/axios';
import { Image as ImageIcon, ZoomIn, X, Trash2 } from 'lucide-react';

const GalleryTab = ({ patientId }: { patientId: string }) => {
    const [images, setImages] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedImage, setSelectedImage] = useState<string | null>(null);

    const fetchImages = async () => {
        try {
            // Fetch all consultations for the patient
            const { data: consultations } = await api.get(`/consultations/patient/${patientId}`);

            // Aggregate all file IDs with metadata
            const allImages: any[] = [];
            consultations.forEach((c: any) => {
                if (c.file_ids && c.file_ids.length > 0) {
                    c.file_ids.forEach((fileId: string) => {
                        allImages.push({
                            id: fileId,
                            url: `${api.defaults.baseURL}/files/${fileId}`, // Assuming this endpoint serves the file
                            consultationDate: c.date,
                            consultationReason: c.reason,
                            consultationId: c._id // Needed for deletion key
                        });
                    });
                }
            });

            setImages(allImages);
        } catch (error) {
            console.error("Error fetching gallery", error);
        } finally {
            setLoading(false);
        }
    };

    useEffect(() => {
        fetchImages();
    }, [patientId]);

    const handleDelete = async (consultationId: string, fileId: string, e: React.MouseEvent) => {
        e.stopPropagation(); // Prevents opening the lightbox
        if (confirm("¿Estás seguro de que quieres eliminar esta imagen?")) {
            try {
                await api.delete(`/consultations/${consultationId}/files/${fileId}`);
                await fetchImages(); // Refresh gallery
            } catch (error) {
                console.error("Error deleting image", error);
                alert("Error al eliminar la imagen");
            }
        }
    };

    if (loading) return <div className="p-8 text-center text-gray-400">Cargando galería...</div>;

    if (images.length === 0) {
        return (
            <div className="flex flex-col items-center justify-center p-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                <div className="p-4 bg-gray-100 rounded-full mb-3">
                    <ImageIcon className="w-8 h-8 text-gray-400" />
                </div>
                <h3 className="text-gray-900 font-medium">Sin imágenes</h3>
                <p className="text-gray-500 text-sm mt-1">Sube fotos en las consultas para verlas aquí.</p>
            </div>
        );
    }

    return (
        <div>
            <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-4">
                {images.map((img, index) => (
                    <div
                        key={`${img.id}-${index}`}
                        className="group relative aspect-square bg-gray-100 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-all"
                        onClick={() => setSelectedImage(img.url)}
                    >
                        <img
                            src={img.url}
                            alt={`Consulta ${img.consultationReason}`}
                            className="w-full h-full object-cover"
                            onError={(e) => { (e.target as HTMLImageElement).src = 'https://via.placeholder.com/300?text=Error'; }}
                        />
                        <div className="absolute inset-0 bg-black/0 group-hover:bg-black/30 transition-colors flex items-center justify-center">
                            <ZoomIn className="w-8 h-8 text-white opacity-0 group-hover:opacity-100 transform scale-75 group-hover:scale-100 transition-all pointer-events-none" />
                        </div>

                        {/* Delete Button */}
                        <button
                            onClick={(e) => handleDelete(img.consultationId, img.id, e)}
                            className="absolute top-2 right-2 bg-red-500/80 hover:bg-red-600 text-white p-1.5 rounded-full opacity-0 group-hover:opacity-100 transition-opacity z-10"
                            title="Eliminar imagen"
                        >
                            <Trash2 className="w-4 h-4" />
                        </button>

                        <div className="absolute bottom-0 left-0 right-0 bg-gradient-to-t from-black/80 to-transparent p-2 opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none">
                            <p className="text-white text-xs font-semibold truncate">{new Date(img.consultationDate).toLocaleDateString()}</p>
                            <p className="text-gray-300 text-[10px] truncate">{img.consultationReason}</p>
                        </div>
                    </div>
                ))}
            </div>

            {/* Lightbox */}
            {selectedImage && (
                <div className="fixed inset-0 z-[60] bg-black/90 flex items-center justify-center p-4 animate-fade-in">
                    <button
                        onClick={() => setSelectedImage(null)}
                        className="absolute top-4 right-4 text-white/50 hover:text-white transition-colors"
                    >
                        <X className="w-8 h-8" />
                    </button>
                    <img
                        src={selectedImage}
                        alt="Zoom"
                        className="max-w-full max-h-[90vh] object-contain rounded-lg shadow-2xl"
                    />
                </div>
            )}
        </div>
    );
};

export default GalleryTab;
