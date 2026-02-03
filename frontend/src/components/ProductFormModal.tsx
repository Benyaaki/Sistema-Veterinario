import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { productsService, type Product } from '../api/services';

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productToEdit?: Product;
}

const ProductFormModal = ({ isOpen, onClose, onSuccess, productToEdit }: ProductFormModalProps) => {
    const [formData, setFormData] = useState<Partial<Product>>({
        name: '',
        sku: '',
        category: '',
        supplier_name: '',
        purchase_price: 0,
        sale_price: 0,
        tax_percent: 19,
        stock_alert_threshold: 5,
        kind: 'PRODUCT',
        is_active: true
    });
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (productToEdit) {
                setFormData({
                    name: productToEdit.name || '',
                    sku: productToEdit.sku || '',
                    category: (productToEdit as any).category || '',
                    supplier_name: (productToEdit as any).supplier_name || '',
                    purchase_price: productToEdit.purchase_price || 0,
                    sale_price: productToEdit.sale_price || 0,
                    tax_percent: productToEdit.tax_percent || 19,
                    stock_alert_threshold: productToEdit.stock_alert_threshold || 5,
                    kind: productToEdit.kind || 'PRODUCT',
                    is_active: productToEdit.is_active ?? true
                });
            } else {
                setFormData({
                    name: '',
                    sku: '',
                    category: '',
                    supplier_name: '',
                    purchase_price: 0,
                    sale_price: 0,
                    tax_percent: 19,
                    stock_alert_threshold: 5,
                    kind: 'PRODUCT',
                    is_active: true
                });
            }
        }
    }, [isOpen, productToEdit]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (productToEdit && (productToEdit.id || productToEdit._id)) {
                await productsService.update(productToEdit.id || productToEdit._id!, formData);
                alert('Producto actualizado correctamente');
            } else {
                // Ensure required fields for creation
                if (!formData.name || !formData.sale_price) {
                    alert('Nombre y Precio de Venta son obligatorios');
                    setLoading(false);
                    return;
                }
                await productsService.create(formData as Product);
                alert('Producto creado correctamente');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.detail || 'Error al guardar producto');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-3xl max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">
                        {productToEdit ? 'Editar Producto' : 'Nuevo Producto'}
                    </h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    {/* Basic Info */}
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Artículo *</label>
                            <input
                                required
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">UPC/EAN/ISBN (SKU)</label>
                            <input
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.sku}
                                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                            <input
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.category}
                                onChange={e => setFormData({ ...formData, category: e.target.value })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Compañía (Proveedor)</label>
                            <input
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.supplier_name}
                                onChange={e => setFormData({ ...formData, supplier_name: e.target.value })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Compra (Neto)</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.purchase_price}
                                onChange={e => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Precio de Venta (Bruto) *</label>
                            <input
                                required
                                type="number"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.sale_price}
                                onChange={e => setFormData({ ...formData, sale_price: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Alerta de Stock Bajo</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.stock_alert_threshold}
                                onChange={e => setFormData({ ...formData, stock_alert_threshold: Number(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-6">
                        <button
                            type="button"
                            onClick={onClose}
                            className="px-4 py-2 border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-50 bg-white font-medium"
                        >
                            Cancelar
                        </button>
                        <button
                            type="submit"
                            disabled={loading}
                            className="px-4 py-2 bg-primary text-white rounded-lg hover:opacity-90 font-medium flex items-center gap-2"
                        >
                            <Save size={18} />
                            {loading ? 'Guardando...' : (productToEdit ? 'Actualizar Producto' : 'Crear Producto')}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default ProductFormModal;
