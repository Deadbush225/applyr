import type { JobApplication, ApplicationResumeSettings, ApplicantReference } from '../types'

const API_BASE_URL = 
// 'http://localhost:8000'
  // import.meta.env.VITE_API_BASE_URL ?? 
  'https://eliazar.heliohost.us/backend'

const requestJson = async <T>(
  url: string,
  body: Record<string, unknown>,
  token?: string,
) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: JSON.stringify(body),
  })

  const payload = (await response.json()) as T

  if (!response.ok || !(payload as { success?: boolean }).success) {
    const message = (payload as { message?: string }).message || 'Request failed'
    throw new Error(message)
  }

  return payload
}

const requestJsonWithMethod = async <T>(
  url: string,
  method: 'DELETE' | 'POST',
  body?: Record<string, unknown>,
  token?: string,
) => {
  // For DELETE requests, append token as query parameter as a fallback
  // (some servers strip Authorization header for DELETE requests)
  let finalUrl = url
  if (method === 'DELETE' && token && !url.includes('token=')) {
    const separator = url.includes('?') ? '&' : '?'
    finalUrl = `${url}${separator}token=${encodeURIComponent(token)}`
  }

  const headers: Record<string, string> = {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  }
  
  // Only include Content-Type if there's a body
  if (body) {
    headers['Content-Type'] = 'application/json'
  }

  const response = await fetch(finalUrl, {
    method,
    headers,
    body: body ? JSON.stringify(body) : undefined,
  })

  const payload = (await response.json()) as T

  if (!response.ok || !(payload as { success?: boolean }).success) {
    const message = (payload as { message?: string }).message || 'Request failed'
    throw new Error(message)
  }

  return payload
}

type ApplicationPayload = {
  jobApplication: JobApplication & {
    agreesToDrugTest?: boolean
    JobApplicationStatus?: string
  }
  references?: ApplicantReference[]
  resumeSettings?: ApplicationResumeSettings
}

type ApplicationStatusPayload = {
  jobApplication: {
    JobApplicationId: string
    JobApplicationStatus: string
  }
}

export const createApplication = async (payload: ApplicationPayload, token?: string) =>
  requestJson(`${API_BASE_URL}/api/applications/create.php`, payload, token)

export const updateApplication = async (
  payload: ApplicationPayload | ApplicationStatusPayload,
  token?: string,
) => requestJson(`${API_BASE_URL}/api/applications/update.php`, payload, token)

export const deleteApplication = async (jobApplicationId: string | number, token?: string) =>
  requestJson(`${API_BASE_URL}/api/applications/delete.php`, { jobApplicationId: String(jobApplicationId) }, token)

export const deleteNestedItem = async (type: 'education' | 'employment' | 'certificate' | 'training' | 'reference', id: string | number, token?: string) =>
  requestJsonWithMethod(
    `${API_BASE_URL}/api/delete_nested.php?type=${encodeURIComponent(type)}&id=${encodeURIComponent(String(id))}`,
    'DELETE',
    undefined,
    token,
  )

export const getResumeSettings = async (jobApplicationId: string | number, token?: string) =>
  requestJson<{ success: boolean; data: ApplicationResumeSettings }>(
    `${API_BASE_URL}/api/applications/get.php`,
    { jobApplicationId: String(jobApplicationId) },
    token,
  )

export const getApplicationsForApplicant = async (applicantId: string | number, token?: string) =>
  requestJson<{
    success: boolean
    data: Array<
      JobApplication & {
        resumeTemplate?: ApplicationResumeSettings['resumeTemplate']
        previewFont?: string
        settingsLastUpdated?: string
      }
    >
  }>(`${API_BASE_URL}/api/applications/list.php`, { applicantId: String(applicantId) }, token)
