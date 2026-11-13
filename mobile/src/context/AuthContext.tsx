import {
    createContext,
    useContext,
    useEffect,
    useState,
    type ReactNode,
} from "react";

import { authService } from "../services/auth.service";

// 1. Definimos qué información compartirá el contexto.
interface AuthContextType {
    token: string | null;
    isLoading: boolean;
    signIn: (email: string, password: string) => Promise<void>;
    signOut: () => Promise<void>;
}

// 2. Creamos el contexto.
const AuthContext = createContext<AuthContextType | undefined>(undefined);

// 3. Creamos el proveedor.
export function AuthProvider({ children }: { children: ReactNode }) {
    const [token, setToken] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

  // 4. Recuperar la sesión al iniciar la aplicación.
    useEffect(() => {
        
        let active = true;
        async function restaurarSesion() {
            try {
                const savedToken = await authService.getToken();
                if (active) {
                    setToken(savedToken);
                }
            } catch {
                if (active) {
                    setToken(null);
                }
            } finally {
                if (active) {
                    setIsLoading(false);
                }
            }
        }

        void restaurarSesion();

        return () => {
            active = false;
        };
    }, []);

    // 5. Iniciar sesión.
    async function signIn(email: string, password: string) {
        const newToken = await authService.login(email, password);
        setToken(newToken);
    }

    // 6. Cerrar sesión.
    async function signOut() {
        await authService.logout();
        setToken(null);
    }

    return (
        <AuthContext.Provider
        value={{
            token,
            isLoading,
            signIn,
            signOut,
        }}
        >
        {children}
        </AuthContext.Provider>
    );
}

// 7. Hook personalizado para utilizar el contexto.
export function useAuth() {
    const context = useContext(AuthContext);
    if (context === undefined) {
        throw new Error("useAuth debe utilizarse dentro de AuthProvider");
    }
    return context;
}
