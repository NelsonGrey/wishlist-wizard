import { useMutation } from '@tanstack/react-query';
import { apiRequest } from '@/lib/queryClient';

export const useDeleteAccount = () => {
  return useMutation({
    mutationFn: () => apiRequest('/api/account', { method: 'DELETE' }),
  });
};
