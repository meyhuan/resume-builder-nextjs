function normalizeBaseUrl(value: string | undefined): string {
  const trimmed = value?.trim()
  if (!trimmed) {
    throw new Error('Missing required environment variable: NEXT_PUBLIC_JAVA_API_BASE_URL')
  }
  return trimmed.replace(/\/+$/, '')
}

export function getPublicJavaApiBaseUrl(): string {
  return normalizeBaseUrl(process.env.NEXT_PUBLIC_JAVA_API_BASE_URL)
}

export function getServerJavaApiBaseUrl(): string {
  return getPublicJavaApiBaseUrl()
}
