/** Keep local browser-automation users isolated from the external Java identity service. */
export function isLocalE2eIdentity(wxId: string): boolean {
  if (process.env.E2E_AUTH_ENABLED !== 'true') return false
  const configured = String(process.env.E2E_AUTH_DEFAULT_WX_ID || 'e2e_default_user').trim()
  return wxId === configured
}

export function localE2eVipResponse() {
  return {
    status: 100,
    result: 'success',
    data: {
      isVip: true,
      vipStatus: 1,
      vipType: 'e2e',
      freeExportCount: 99,
    },
  }
}
