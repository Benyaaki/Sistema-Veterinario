import { createContext, useContext, useState, useEffect, type ReactNode } from 'react';
import api from '../api/axios';


interface User {
    id: string;
    name: string;
    email: string;
    role: string; // Deprecated but might come from legacy endpoints
    roles?: string[]; // New System
    permissions?: string[]; // Granular Permissions
    signature_file_id: string | null;
}

interface AuthContextType {
    user: User | null;
    isAuthenticated: boolean;
    isLoading: boolean;
    login: (token: string) => Promise<void>;
    logout: () => void;
    hasRole: (role: string) => boolean;
    hasAnyRole: (roles: string[]) => boolean;
    hasPermission: (permission: string) => boolean;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export const AuthProvider = ({ children }: { children: ReactNode }) => {
    const [user, setUser] = useState<User | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    const fetchUser = async () => {
        setIsLoading(true);
        try {
            // Force timeout of 15s to allow backend cold start
            const { data } = await api.get('/auth/me', { timeout: 15000 });
            setUser(data);
        } catch (error) {
            console.error("Auth Check Failed:", error);
            localStorage.removeItem('token');
            setUser(null);
        } finally {
            setIsLoading(false);
        }
    };

    useEffect(() => {
        const token = localStorage.getItem('token');
        if (token) fetchUser();
        else setIsLoading(false);
    }, []);

    const login = async (token: string) => {
        localStorage.setItem('token', token);
        await fetchUser();
    };

    const logout = () => {
        localStorage.removeItem('token');
        setUser(null);
    };

    const hasRole = (role: string) => {
        if (!user) return false;
        // Support Super Admin Override
        if (user.roles?.includes('superadmin') || user.role === 'superadmin') return true;

        return user.roles?.includes(role) || user.role === role;
    };

    const hasAnyRole = (roles: string[]) => {
        if (!user) return false;
        if (user.roles?.includes('superadmin') || user.role === 'superadmin') return true;

        return roles.some(r => user.roles?.includes(r) || user.role === r);
    };

    const ROLE_DEFAULTS: Record<string, string[]> = {
        'admin': ['ventas', 'inventory', 'stock', 'reception', 'dispatch', 'clients', 'suppliers', 'agenda', 'tutors', 'patients', 'employees', 'reports', 'activity'],
        'seller': ['ventas', 'inventory', 'stock', 'reception', 'dispatch', 'clients', 'agenda', 'tutors', 'patients'],
        'veterinarian': ['ventas', 'inventory', 'stock', 'clients', 'agenda', 'tutors', 'patients'],
        'groomer': ['ventas', 'inventory', 'stock', 'agenda'],
        'assistant': []
    };

    const hasPermission = (permission: string) => {
        if (!user) return false;
        if (user.roles?.includes('superadmin') || user.role === 'superadmin') return true;
        if (user.roles?.includes('admin') || user.role === 'admin') return true; // Admin has all by default?

        // If manual permissions are set, use them
        if (user.permissions && user.permissions.length > 0) {
            return user.permissions.includes(permission);
        }

        // Fallback to role defaults
        const role = user.role || 'assistant';
        const defaults = ROLE_DEFAULTS[role] || [];
        return defaults.includes(permission);
    };

    return (
        <AuthContext.Provider value={{ user, isAuthenticated: !!user, isLoading, login, logout, hasRole, hasAnyRole, hasPermission }}>
            {children}
        </AuthContext.Provider>
    );
};


export const useAuth = () => {
    const context = useContext(AuthContext);
    if (!context) {
        throw new Error('useAuth must be used within an AuthProvider');
    }
    return context;
};
