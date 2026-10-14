import { AxiosError, AxiosHeaders, type AxiosResponse } from 'axios'

export function httpError(
  status: number,
  data: unknown = {},
  headers: Record<string, string> = {},
): AxiosError {
  const config = { headers: new AxiosHeaders() }
  const response: AxiosResponse = {
    status,
    statusText: '',
    data,
    headers: new AxiosHeaders(headers),
    config,
  }
  return new AxiosError('Request failed', undefined, config, null, response)
}
