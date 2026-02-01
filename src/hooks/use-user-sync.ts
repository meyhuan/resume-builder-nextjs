'use client';

import { syncUserAction } from '@/app/actions';
import { logger } from '@/utils/logger';

export const useUserSync = () => {
  const syncUser = async (userData: { wxId: string; name?: string; avatar?: string; email?: string }) => {
    try {
      logger.info('Sync', `Syncing user to DB: ${userData.wxId}`);
      const result = await syncUserAction(userData);
      
      if (result.success) {
        logger.success('Sync', `User synced successfully: ${result.user?.id}`);
        return result.user;
      } else {
        logger.error('Sync', `Failed to sync user: ${result.error}`);
        return null;
      }
    } catch (error: unknown) {
      logger.error('Sync', 'Error in syncUser', error);
      return null;
    }
  };

  return { syncUser };
};
