import { useBranch } from '../context/BranchContext';
import { Building2 } from 'lucide-react';

const BranchSelector = () => {
    const { currentBranch, branches, setBranch, isLoading } = useBranch();

    if (isLoading) return <div className="text-xs text-secondary-400">Cargando sucursales...</div>;

    // If user has no branch selected but branches exist, force valid one?
    // Usually handled by context, but we can ensure here.

    return (
        <div className="flex items-center gap-2 px-4 py-2 bg-brand-surface mx-4 border border-brand-accent/50 rounded-lg">
            <Building2 size={16} className="text-primary" />
            <select
                className="bg-transparent text-sm font-semibold text-gray-800 outline-none cursor-pointer w-full"
                value={currentBranch?.id || currentBranch?._id || ''}
                onChange={(e) => {
                    const found = branches.find(b => (b.id || b._id) === e.target.value);
                    if (found) setBranch(found);
                }}
            >
                <option value="" disabled>Seleccionar Sucursal</option>
                {branches.map(b => (
                    <option key={b.id || b._id} value={b.id || b._id}>
                        {b.name}
                    </option>
                ))}
            </select>
        </div>
    );
};

export default BranchSelector;
