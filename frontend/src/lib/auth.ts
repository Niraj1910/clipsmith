import { useQuery, useQueryClient } from '@tanstack/react-query';
import { api, ApiError } from './api';
import type { UserDto } from '@clipper/shared/dto';

export function useAuth() {
  const queryClient = useQueryClient();

  const { data, isLoading } = useQuery<UserDto | null>({
    queryKey: ['me'],
    queryFn: async () => {
      try {
        const res = await api.getMe();
        return res.user;
      } catch (err) {
        if (err instanceof ApiError && err.code === 'UNAUTHENTICATED') {
          return null;
        }
        return null;
      }
    },
    retry: false,
    staleTime: 1000 * 60 * 5,
  });

  const logout = async () => {
    try {
      await api.logout();
    } finally {
      queryClient.clear();
    }
  };

  return {
    user: data ?? null,
    isLoading,
    isLoggedIn: !!data,
    logout,
  };
}
