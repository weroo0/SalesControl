import { useCallback } from "react";

import { useAuth } from "@/context/AuthContext";

import { ApiError, apiRequest, type AuthenticatedRequest } from "@/services/api";

export function useAuthenticatedRequest(): AuthenticatedRequest {
    const {token, signOut} = useAuth();

    const request = useCallback<AuthenticatedRequest>(
        async <T> (
            path: string,
            options: RequestInit = {},
        ): Promise<T> => {
            if (!token) {
                throw new ApiError(401, 'No existe una sesión activa');
            }

            try {
                return await apiRequest<T>(path, options, token);
            } catch (error) {
                if (error instanceof ApiError && error.status === 401) {
                    try {
                        await signOut();
                    } catch (storageError) {
                        console.warn('No se pudo eliminar el token almacenado', storageError);
                    }
                }

                throw error;
            }
        }, [token, signOut],
    );

    return request;
}