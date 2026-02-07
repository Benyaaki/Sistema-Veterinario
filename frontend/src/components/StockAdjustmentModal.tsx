import { useState, useEffect } from 'react';
import { X, Save } from 'lucide-react';
import { inventoryService, type Product } from '../api/services';

interface StockAdjustmentModalProps {
    isOpen: boolean;
    onClose: () => void;
    onSuccess: () => void;
    product: Product | undefined;
    branchId: string | undefined;
    branchName: string | undefined;
    currentQuantity: number;
}

const StockAdjustmentModal = ({
    isOpen,
    onClose,
    onSuccess,
    product,
    branchId,
    branchName,
    currentQuantity
}: StockAdjustmentModalProps) => {
    const [newQuantity, setNewQuantity] = useState<number>(0);
    const [reason, setReason] = useState('Ajuste Manual de Inventario');
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (isOpen) {
            setNewQuantity(currentQuantity);
            setReason('Ajuste Manual de Inventario');
        }
    }, [isOpen, currentQuantity]);

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();
        if (!product || !branchId || newQuantity < 0) return;

        setLoading(true);
        try {
            const diff = newQuantity - currentQuantity;

            if (diff === 0) {
                onClose();
                return;
            }

            if (diff > 0) {
                // IN movement
                await inventoryService.createMovement({
                    type: 'IN',
                    product_id: product.id || product._id!,
                    to_branch_id: branchId,
                    quantity: diff,
                    reason: reason
                } as any);
            } else {
                // OUT movement
                await inventoryService.createMovement({
                    type: 'OUT',
                    product_id: product.id || product._id!,
                    from_branch_id: branchId,
                    quantity: Math.abs(diff),
                    reason: reason
                } as any);
            }

            alert('Inventario actualizado exitosamente');
            onSuccess();
            onClose();
        } catch (error: any) {
            console.error(error);
            alert(error.response?.data?.detail || 'Error al actualizar inventario');
        } finally {
            setLoading(false);
        }
    };

    if (!isOpen || !product) return null;

    return (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white rounded-xl shadow-lg w-full max-w-md">
                <div className="flex justify-between items-center p-6 border-b border-gray-200">
                    <h2 className="text-xl font-bold text-gray-800">Ajustar Inventario</h2>
                    <button onClick={onClose} className="text-gray-400 hover:text-gray-600">
                        <X size={24} />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="p-6 space-y-4">
                    <div className="bg-gray-50 p-4 rounded-lg space-y-2">
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-bold">Sucursal</span>
                            <div className="text-sm font-medium text-gray-900">{branchName}</div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-bold">Producto</span>
                            <div className="text-sm font-medium text-gray-900">{product.name}</div>
                        </div>
                        <div>
                            <span className="text-xs text-gray-500 uppercase font-bold">Cantidad Actual</span>
                            <div className="text-lg font-bold text-gray-900">{currentQuantity}</div>
                        </div>
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Nueva Cantidad *</label>
                        <input
                            required
                            type="number"
                            min="0"
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            value={newQuantity}
                            onChange={e => setNewQuantity(Number(e.target.value))}
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-gray-700 mb-1">Concepto / Razón</label>
                        <input
                            type="text"
                            required
                            className="w-full px-3 py-2 border rounded-lg focus:ring-2 focus:ring-primary outline-none"
                            value={reason}
                            onChange={e => setReason(e.target.value)}
                        />
                    </div>

                    <div className="pt-2 text-sm text-gray-500 italic">
                        El sistema calculará automáticamente la diferencia y creará un movimiento de entrada o salida.
                    </div>

                    <div className="flex justify-end gap-3 pt-4 border-t border-gray-200 mt-4">
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
                            {loading ? 'Guardando...' : 'Actualizar Inventario'}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
};

export default StockAdjustmentModal;
