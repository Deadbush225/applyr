import type { Applicant, JobApplication } from '../types'

const API_BASE_URL =
  import.meta.env.VITE_API_BASE_URL ?? 'https://eliazar.heliohost.us/backend'

const requestJson = async <T>(
  url: string,
  body: Record<string, unknown>,
) => {
  const response = await fetch(url, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
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

type ApplicationPayload = {
  applicant: Applicant
  jobApplication: JobApplication & {
    agreesToDrugTest?: boolean
    JobApplicationStatus?: string
  }
}

export const createApplication = async (payload: ApplicationPayload) =>
  requestJson(`${API_BASE_URL}/api/applications/create.php`, payload)

export const updateApplication = async (payload: ApplicationPayload) =>
  requestJson(`${API_BASE_URL}/api/applications/update.php`, payload)

export const deleteApplication = async (jobApplicationId: string) =>
  requestJson(`${API_BASE_URL}/api/applications/delete.php`, { jobApplicationId })
