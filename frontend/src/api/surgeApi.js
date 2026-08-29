import hospitalApi from './hospitalApi';

export const surgeApi = {
  getSurgeStatus: async () => {
    try {
      const cap = await hospitalApi.getCapacity();
      return {
        status: cap?.surge_status || 'normal',
        is_surge_active: cap?.surge_status === 'critical' || cap?.surge_status === 'tier_2' || cap?.surge_status === 'disaster',
        surge_tier: cap?.surge_status || 'normal',
      };
    } catch {
      return { status: 'normal', is_surge_active: false, surge_tier: 'normal' };
    }
  },

  toggleSurgeMode: async (isActiveOrTier, reason = '') => {
    const tier = typeof isActiveOrTier === 'string' ? isActiveOrTier : (isActiveOrTier ? 'critical' : 'normal');
    const updated = await hospitalApi.updateCapacity({ surge_status: tier });
    return {
      success: true,
      is_surge_active: tier !== 'normal',
      surge_tier: updated?.surge_status || tier,
      reason,
    };
  },
};

export default surgeApi;
