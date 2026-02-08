import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { productsService, type Product } from '../api/services';
import CreatableSelect from 'react-select/creatable';
import { capitalizeWords } from '../utils/formatters';
import { useBranch } from '../context/BranchContext';

interface ProductFormModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    productToEdit?: Product;
}

const ProductFormModal = ({ isOpen, onClose, onSuccess, productToEdit }: ProductFormModalProps) => {
    const { currentBranch } = useBranch();
    const [formData, setFormData] = useState<Partial<Product> & { stock?: number }>({
        external_id: undefined,
        name: '',
        sku: '',
        category: '',
        supplier_name: '',
        purchase_price: 0,
        sale_price: 0,
        tax_percent: 19,
        avatar: '',
        stock_alert_threshold: 5,
        kind: 'PRODUCT',
        is_active: true,
        stock: 0
    });
    const [categories, setCategories] = useState<string[]>([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            if (productToEdit) {
                setFormData({
                    external_id: productToEdit.external_id,
                    name: productToEdit.name || '',
                    sku: productToEdit.sku || '',
                    category: productToEdit.category || '',
                    supplier_name: productToEdit.supplier_name || '',
                    purchase_price: productToEdit.purchase_price || 0,
                    sale_price: productToEdit.sale_price || 0,
                    tax_percent: productToEdit.tax_percent || 0,
                    avatar: productToEdit.avatar || '',
                    stock_alert_threshold: productToEdit.stock_alert_threshold || 5,
                    kind: productToEdit.kind || 'PRODUCT',
                    is_active: productToEdit.is_active ?? true,
                    stock: (productToEdit as any).stockQty || productToEdit.stock || 0
                });
            } else {
                setFormData({
                    external_id: undefined,
                    name: '',
                    sku: '',
                    category: '',
                    supplier_name: '',
                    purchase_price: 0,
                    sale_price: 0,
                    tax_percent: 19,
                    avatar: '',
                    stock_alert_threshold: 5,
                    kind: 'PRODUCT',
                    is_active: true,
                    stock: 0
                });
            }
        }
    }, [isOpen, productToEdit]);

    useEffect(() => {
        if (isOpen) {
            loadCategories();
        }
    }, [isOpen]);

    const loadCategories = async () => {
        try {
            const data = await productsService.getCategories();
            setCategories(data);
        } catch (error) {
            console.error("Error loading categories", error);
        }
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        setLoading(true);

        try {
            if (productToEdit && (productToEdit.id || productToEdit._id)) {
                // Include branch_id for stock update
                const updatePayload = {
                    ...formData,
                    branch_id: currentBranch?.id || (currentBranch as any)._id
                };
                await productsService.update(productToEdit.id || productToEdit._id!, updatePayload);
                alert('Producto actualizado correctamente');
            } else {
                // Ensure required fields for creation
                if (!formData.name || !formData.sale_price) {
                    alert('Nombre y Precio de Venta son obligatorios');
                    setLoading(false);
                    return;
                }
                await productsService.create({
                    ...formData,
                    branch_id: currentBranch?.id || (currentBranch as any)._id
                } as Product);
                alert('Producto creado correctamente');
            }
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            const detail = error.response?.data?.detail;
            if (Array.isArray(detail)) {
                const messages = detail.map((err: any) => `${err.loc.join('.')}: ${err.msg}`).join('\n');
                alert(`Error de validación:\n${messages}`);
            } else if (typeof detail === 'string') {
                alert(detail);
            } else {
                alert('Error al guardar producto');
            }
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
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div className="md:col-span-1">
                            <label className="block text-sm font-medium text-gray-700 mb-1">ID (Externo)</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none bg-gray-50 font-mono"
                                value={formData.external_id || ''}
                                onChange={e => setFormData({ ...formData, external_id: e.target.value ? Number(e.target.value) : undefined })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre del Artículo *</label>
                            <input
                                required
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                maxLength={80}
                                value={formData.name}
                                onChange={e => setFormData({ ...formData, name: capitalizeWords(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">UPC/EAN/ISBN (SKU)</label>
                            <input
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none font-mono"
                                value={formData.sku}
                                onChange={e => setFormData({ ...formData, sku: e.target.value })}
                            />
                        </div>
                        <div className="md:col-span-2">
                            <label className="block text-sm font-medium text-gray-700 mb-1">Imagen URL (Avatar)</label>
                            <input
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.avatar}
                                onChange={e => setFormData({ ...formData, avatar: e.target.value })}
                                placeholder="https://..."
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Categoría</label>
                            <CreatableSelect
                                isClearable
                                placeholder="Seleccionar o crear categoría..."
                                noOptionsMessage={() => "No se encontraron categorías"}
                                formatCreateLabel={(inputValue) => `Crear "${inputValue}"`}
                                options={[...new Set([...categories, 'Veterinaria', 'Peluquería'])].sort().map(c => ({ value: c, label: c }))}
                                value={formData.category ? { value: formData.category, label: formData.category } : null}
                                onChange={(newValue: any) => setFormData({ ...formData, category: newValue ? capitalizeWords(newValue.value) : '' })}
                                className="text-sm"
                                styles={{
                                    control: (base) => ({
                                        ...base,
                                        borderRadius: '0.5rem',
                                        borderColor: '#e5e7eb',
                                        '&:hover': { borderColor: '#5B9AA8' }
                                    })
                                }}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Nombre de la Compañía (Proveedor)</label>
                            <input
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                maxLength={80}
                                value={formData.supplier_name}
                                onChange={e => setFormData({ ...formData, supplier_name: capitalizeWords(e.target.value) })}
                            />
                        </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Impuesto %</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                value={formData.tax_percent}
                                onChange={e => setFormData({ ...formData, tax_percent: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Compra (Neto)</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                max={99999999}
                                value={formData.purchase_price}
                                onChange={e => setFormData({ ...formData, purchase_price: Number(e.target.value) })}
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Venta (Bruto) *</label>
                            <input
                                required
                                type="number"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none font-bold"
                                max={99999999}
                                value={formData.sale_price}
                                onChange={e => setFormData({ ...formData, sale_price: Number(e.target.value) })}
                            />
                        </div>
                        {formData.kind === 'PRODUCT' && !['veterinaria', 'peluquería', 'peluqueria'].includes(formData.category?.toLowerCase() || '') && (
                            <div>
                                <label className="block text-sm font-medium text-gray-700 mb-1">Stock Actual</label>
                                <input
                                    type="number"
                                    className="w-full px-3 py-2 border border-blue-200 bg-blue-50 rounded-lg focus:ring-2 focus:ring-primary outline-none font-bold text-blue-800"
                                    max={9999}
                                    value={formData.stock}
                                    onChange={e => setFormData({ ...formData, stock: Number(e.target.value) })}
                                />
                            </div>
                        )}
                        {['veterinaria', 'peluquería', 'peluqueria'].includes(formData.category?.toLowerCase() || '') && (
                            <div className="flex flex-col justify-end">
                                <span className="text-xs text-gray-400 italic mb-1">
                                    Categoría {formData.category?.toLowerCase() === 'veterinaria' ? 'Veterinaria' : 'Peluquería'}
                                </span>
                                <div className="px-3 py-2 border rounded-lg bg-gray-50 text-gray-400 text-sm font-mono text-center">
                                    SIN STOCK ({formData.category?.toLowerCase() === 'veterinaria' ? 'TRATAMIENTO' : 'SERVICIO'})
                                </div>
                            </div>
                        )}
                        <div>
                            <label className="block text-sm font-medium text-gray-700 mb-1">Mínimo</label>
                            <input
                                type="number"
                                className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                                max={9999}
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
