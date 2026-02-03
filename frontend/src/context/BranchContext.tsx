import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/axios';
import { useAuth } from './AuthContext';

export interface Branch {
    id: string; // Pydantic ObjectIDs often returned as 'id' alias in models but let's check backend
    _id?: string;
    name: string;
    address?: string;
    supports_grooming: boolean;
    is_active: boolean;
}

interface BranchContextType {
    currentBranch: Branch | null;
    branches: Branch[];
    isLoading: boolean;
    setBranch: (branch: Branch) => void;
    refreshBranches: () => Promise<void>;
}

const BranchContext = createContext<BranchContextType | undefined>(undefined);

export const BranchProvider = ({ children }: { children: ReactNode }) => {
    const { isAuthenticated } = useAuth();
    const [currentBranch, setCurrentBranch] = useState<Branch | null>(null);
    const [branches, setBranches] = useState<Branch[]>([]);
    const [isLoading, setIsLoading] = useState(true);

    const fetchBranches = async () => {
        // Only fetch if authenticated
        if (!isAuthenticated) {
            setIsLoading(false);
            return;
        }

        try {
            const { data } = await api.get('/branches/', { timeout: 5000 });
            setBranches(data);

            // Try to restore from LocalStorage
            const savedId = localStorage.getItem('activeBranchId');
            if (savedId) {
                const found = data.find((b: Branch) => (b.id || b._id) === savedId);
                if (found) setCurrentBranch(found);
            }

            // If no branch selected but branches exist, select first one
            if (!savedId && data.length > 0) {
                setCurrentBranch(data[0]);
                localStorage.setItem('activeBranchId', data[0].id || data[0]._id || '');
            }
        } catch (error) {
            console.error("Failed to load branches", error);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        fetchBranches();
    }, [isAuthenticated]); // Re-fetch when authentication state changes

    const setBranch = (branch: Branch) => {
        setCurrentBranch(branch);
        localStorage.setItem('activeBranchId', branch.id || branch._id || '');
    };

    return (
        <BranchContext.Provider value={{ currentBranch, branches, isLoading, setBranch, refreshBranches: fetchBranches }}>
            {children}
        </BranchContext.Provider>
    );
};

export const useBranch = () => {
    const context = useContext(BranchContext);
    if (!context) {
        throw new Error('useBranch must be used within a BranchProvider');
    }
    return context;
};
