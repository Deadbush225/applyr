import type { Education, EmploymentHistory, Certificate, Training } from '../types'

export type AuthUser = {
  id: number | string
  email: string
  name?: string
}

export type AuthSession = {
  token: string
  user: AuthUser
}

export type ApplicantProfilePayload = {
  applicantId: number | string
  applicantName: string
  homeAddress: string
  phoneNumber: string
  emailAddress: string
  linkedInUrl: string
  citizenshipStatus: string
  hasCriminalHistory: boolean | null
  education?: Education[]
  employmentHistory?: EmploymentHistory[]
  certificates?: Certificate[]
  trainings?: Training[]
}

export type ProfileSyncPayload = {
  applicantId: number | string
  education?: Array<Omit<Education, 'educationId'> & { educationId?: number | string | null }>
  employmentHistory?: Array<Omit<EmploymentHistory, 'EmploymentHistoryId'> & { EmploymentHistoryId?: number | string | null }>
  certificates?: Array<Omit<Certificate, 'certificateId'> & { certificateId?: number | string | null }>
  trainings?: Array<Omit<Training, 'trainingId'> & { trainingId?: number | string | null }>
}

type AuthResponse = {
  success: boolean
  data?: {
    token: string
    user: AuthUser
  }
  message?: string
}

const API_BASE_URL = 
// 'http://localhost:8000'
  //import.meta.env.VITE_API_BASE_URL ?? 
  'https://eliazar.heliohost.us/backend';

const endpoints = {
  login: '/api/auth/login.php',
  register: '/api/auth/register.php',
  profile: '/api/auth/profile.php',
  updateProfile: '/api/auth/update_profile.php',
  syncProfile: '/api/auth/sync_profile.php',
}

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

  if (!response.ok || !(payload as AuthResponse).success) {
    const message = (payload as AuthResponse).message || 'Request failed'
    throw new Error(message)
  }

  return payload
}

export const loginUser = async (email: string, password: string) => {
  const payload = await requestJson<AuthResponse>(`${API_BASE_URL}${endpoints.login}`, {
    email,
    password,
  })

  if (!payload.data?.token || !payload.data?.user) {
    throw new Error(payload.message || 'Login failed')
  }

  return payload.data
}

export const registerUser = async (name: string, email: string, password: string) => {
  const payload = await requestJson<AuthResponse>(`${API_BASE_URL}${endpoints.register}`, {
    name,
    email,
    password,
  })

  if (!payload.data?.token || !payload.data?.user) {
    throw new Error(payload.message || 'Signup failed')
  }

  return payload.data
}

export const getApplicantProfile = async (applicantId: number | string) => {
  const payload = await requestJson<{ success: boolean; data: ApplicantProfilePayload }>(
    `${API_BASE_URL}${endpoints.profile}`,
    { applicantId },
  )

  if (!payload.data) {
    throw new Error('Unable to load applicant profile')
  }

  return payload.data
}

export const updateApplicantProfile = async (payloadBody: {
  applicantId: number | string
  applicantName: string
  homeAddress: string
  phoneNumber: string
  emailAddress: string
  linkedInUrl: string
  citizenshipStatus: string
  hasCriminalHistory: boolean | null
  currentPassword?: string
  newPassword?: string
}) => {
  const payload = await requestJson<{ success: boolean; data: ApplicantProfilePayload }>(
    `${API_BASE_URL}${endpoints.updateProfile}`,
    payloadBody,
  )

  if (!payload.data) {
    throw new Error('Unable to update applicant profile')
  }

  return payload.data
}

export const syncApplicantProfile = async (payloadBody: ProfileSyncPayload, token?: string) => {
  const payload = await requestJson<{ success: boolean; data?: ProfileSyncPayload }>(
    `${API_BASE_URL}${endpoints.syncProfile}`,
    payloadBody,
    token,
  )

  if (!payload.success) {
    throw new Error('Unable to sync applicant profile')
  }

  return payload
}
