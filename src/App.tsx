import { useEffect, useState } from 'react'
import { Navigate, Route, Routes, useNavigate } from 'react-router-dom'
import './styles/App.scss'

import ApplicantEditPage from './pages/ApplicantEditPage'
import EditorPage from './pages/EditorPage'
import HomePage from './pages/HomePage'
import NewApplicationModal from './components/modals/NewApplicationModal'
import Navbar from './components/Navbar'
import { updateApplication as syncApplication, getResumeSettings, deleteApplication, getApplicationsForApplicant } from './services/applications'
import { ApplicationPayloadSchema } from './validation/applicationSchema'
import { loginUser, registerUser, getApplicantProfile, updateApplicantProfile, type AuthSession } from './services/auth'
import type {
  Applicant,
  ApplicantReference,
  ApplicationResumeSettings,
  Education,
  EmploymentHistory,
  JobApplication,
  Training,
  Certificate,
} from './types'

const createId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2)}`
}

const createEmptyApplicant = (): Applicant => ({
  applicantId: createId(),
  applicantName: '',
  homeAddress: '',
  phoneNumber: '',
  emailAddress: '',
  linkedInUrl: '',
  citizenshipStatus: '',
  hasCriminalHistory: null,
  agreesToDrugTest: null,
})

const createEmptyApplication = (applicantId: string): JobApplication => ({
  JobApplicationId: createId(),
  applicantId,
  appliedPosition: '',
  JobApplicationDate: new Date().toISOString().slice(0, 10),
  lastUpdated: new Date().toISOString(),
  availableStartDate: '',
  expectedSalary: '',
  resumeFileUrl: '',
  references: [],
  trainings: [],
  certificates: [],
})

const createEducation = (applicantId: string): Education => ({
  educationId: createId(),
  applicantId,
  schoolName: '',
  schoolLocation: '',
  startYear: '',
  endYear: '',
  degreeReceived: '',
  programName: '',
})

const createEmployment = (applicantId: string): EmploymentHistory => ({
  EmploymentHistoryId: createId(),
  applicantId,
  companyName: '',
  workAddress: '',
  workPosition: '',
  reasonForLeaving: null,
  startDate: '',
  endDate: '',
  isEmployed: false,
})

const createReference = (applicantId: string): ApplicantReference => ({
  referenceId: createId(),
  applicantId,
  referenceName: '',
  referenceTitle: '',
  referenceCompany: '',
  referencePhone: '',
  referenceEmail: '',
})

const createTraining = (): Training => ({
  trainingId: createId(),
  trainingTitle: '',
  trainingDescription: '',
  trainingInstructor: '',
  trainingDurationHours: '',
  completionDate: '',
})

const createCertificate = (): Certificate => ({
  certificateId: createId(),
  certificateName: '',
  issuingAuthority: '',
  validityMonths: '',
  dateIssued: '',
})

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

const starterApplicant = createEmptyApplicant()

type ResumeTemplateId = 'classic' | 'compact' | 'modern'

const storageKeys = {
  applicant: 'applyr:applicant',
  jobApplications: 'applyr:job-applications',
  activeJobApplicationId: 'applyr:active-job-application',
  education: 'applyr:education',
  employmentHistory: 'applyr:employment-history',
  references: 'applyr:references',
  trainings: 'applyr:trainings',
  certificates: 'applyr:certificates',
  previewFont: 'applyr:preview-font',
  resumeTemplate: 'applyr:resume-template',
  resumeSettings: 'applyr:resume-settings',
  authSession: 'applyr:auth-session',
}

type StoredApplicant = Partial<Applicant> & { id?: string }
type StoredJobApplication = Partial<JobApplication> & { id?: string }
type StoredEducation = Partial<Education> & { id?: string }
type StoredEmploymentHistory = Partial<EmploymentHistory> & { id?: string }

const getStorageScope = (userId?: string | null) => (userId ? `user:${userId}` : 'guest')

const getScopedStorageKey = (scope: string, key: keyof typeof storageKeys) =>
  `${storageKeys[key]}:${scope}`

const loadStoredValue = <T,>(key: string, fallback: T): T => {
  if (typeof window === 'undefined') {
    return fallback
  }

  const raw = window.localStorage.getItem(key)
  if (!raw) {
    return fallback
  }

  try {
    return JSON.parse(raw) as T
  } catch {
    return fallback
  }
}

const loadScopedValue = <T,>(scope: string, key: keyof typeof storageKeys, fallback: T): T =>
  loadStoredValue<T>(getScopedStorageKey(scope, key), fallback)

const normalizeApplicant = (value: StoredApplicant): Applicant => ({
  ...starterApplicant,
  ...value,
  applicantId: value.applicantId || value.id || starterApplicant.applicantId,
})

const normalizeJobApplication = (
  value: StoredJobApplication,
  applicantId: string,
  fallbackId: string,
): JobApplication => ({
  ...createEmptyApplication(applicantId),
  ...value,
  JobApplicationId: value.JobApplicationId || value.id || fallbackId,
  applicantId,
  references: value.references ?? [],
  trainings: value.trainings ?? [],
  certificates: value.certificates ?? [],
  lastUpdated:
    value.lastUpdated ||
    value.JobApplicationDate ||
    new Date().toISOString(),
})

const normalizeBackendApplication = (
  value: JobApplication & { previewFont?: string; resumeTemplate?: ApplicationResumeSettings['resumeTemplate'] },
  fallbackApplicantId: string,
): JobApplication => ({
  ...createEmptyApplication(fallbackApplicantId),
  ...value,
  applicantId: value.applicantId || fallbackApplicantId,
  references: value.references ?? [],
  trainings: value.trainings ?? [],
  certificates: value.certificates ?? [],
  lastUpdated: value.lastUpdated || value.JobApplicationDate || new Date().toISOString(),
})
function App() {
  const storedAuthSession = loadStoredValue<AuthSession | null>(storageKeys.authSession, null)
  const initialStorageScope = getStorageScope(storedAuthSession?.user.id)
  const initialApplicant = normalizeApplicant(
    loadScopedValue<StoredApplicant>(initialStorageScope, 'applicant', starterApplicant),
  )

  const initialJobApplications = loadScopedValue<StoredJobApplication[]>(
    initialStorageScope,
    'jobApplications',
    [createEmptyApplication(initialApplicant.applicantId)],
  ).map((application, index) =>
    normalizeJobApplication(
      application,
      initialApplicant.applicantId,
      index === 0
        ? createEmptyApplication(initialApplicant.applicantId).JobApplicationId
        : createId(),
    ),
  )
  const initialActiveJobApplicationId =
    loadScopedValue<string>(
      initialStorageScope,
      'activeJobApplicationId',
      initialJobApplications[0]?.JobApplicationId ?? '',
    ) || initialJobApplications[0]?.JobApplicationId || ''

  const initialEducation = loadScopedValue<StoredEducation[]>(
    initialStorageScope,
    'education',
    [],
  )
    .map((entry) => ({
      educationId: entry.educationId || entry.id || createId(),
      applicantId: entry.applicantId || initialApplicant.applicantId,
      schoolName: entry.schoolName || '',
      schoolLocation: entry.schoolLocation || '',
      startYear: entry.startYear || '',
      endYear: entry.endYear || '',
      degreeReceived: entry.degreeReceived || '',
      programName: entry.programName || '',
    }))

  const initialEmploymentHistory = loadScopedValue<StoredEmploymentHistory[]>(
    initialStorageScope,
    'employmentHistory',
    [],
  )
    .map((entry) => ({
      EmploymentHistoryId: entry.EmploymentHistoryId || entry.id || createId(),
      applicantId: entry.applicantId || initialApplicant.applicantId,
      companyName: entry.companyName || '',
      workAddress: entry.workAddress || '',
      workPosition: entry.workPosition || '',
      reasonForLeaving: entry.reasonForLeaving ?? null,
      startDate: entry.startDate || '',
      endDate: entry.endDate || '',
      isEmployed: entry.isEmployed ?? false,
    }))

  const initialResumeSettingsMap = loadScopedValue<Record<string, ApplicationResumeSettings>>(
    initialStorageScope,
    'resumeSettings',
    {},
  )

  const initialPreviewFont = loadScopedValue<string>(
    initialStorageScope,
    'previewFont',
    'Times New Roman',
  )
  const initialResumeTemplate = loadScopedValue<ResumeTemplateId>(
    initialStorageScope,
    'resumeTemplate',
    'classic',
  )

  const [applicant, setApplicant] = useState<Applicant>(initialApplicant)
  const [jobApplications, setJobApplications] = useState<JobApplication[]>(initialJobApplications)
  const [activeJobApplicationId, setActiveJobApplicationId] = useState(initialActiveJobApplicationId)
  const [education, setEducation] = useState<Education[]>(initialEducation)
  const [employmentHistory, setEmploymentHistory] = useState<EmploymentHistory[]>(initialEmploymentHistory)


  // Store settings per JobApplicationId
  const [resumeSettingsMap, setResumeSettingsMap] = useState<Record<string, ApplicationResumeSettings>>(initialResumeSettingsMap)

  // Current settings for the active application (fallback to defaults)
  const [previewFont, setPreviewFont] = useState<string>(initialPreviewFont)
  const [resumeTemplate, setResumeTemplate] = useState<ResumeTemplateId>(initialResumeTemplate)

  const [uploadState, setUploadState] = useState({ uploading: false, message: '' })
  const [authSession, setAuthSession] = useState<AuthSession | null>(storedAuthSession)
  const [authError, setAuthError] = useState('')
  const [isAuthLoading, setIsAuthLoading] = useState(false)
  const [registrationMessage, setRegistrationMessage] = useState('')
  const storageScope = getStorageScope(authSession?.user.id)
  const [hydratedStorageScope, setHydratedStorageScope] = useState(storageScope)
  const [isProfileHydrated, setIsProfileHydrated] = useState(!storedAuthSession?.user.id)
  const [showNewAppModal, setShowNewAppModal] = useState(false)
  const navigate = useNavigate()

  const touchActiveApplication = () => {
    setJobApplications((prev) =>
      prev.map((app) =>
        app.JobApplicationId === activeJobApplicationId
          ? { ...app, lastUpdated: new Date().toISOString() }
          : app
      )
    )
  }

  const linkApplicantId = (newApplicantId: string) => {
    setEducation((prev) => prev.map((item) => ({ ...item, applicantId: newApplicantId })))
    setEmploymentHistory((prev) => prev.map((item) => ({ ...item, applicantId: newApplicantId })))
    setJobApplications((prev) =>
      prev.map((item) => ({ ...item, applicantId: newApplicantId })),
    )
    touchActiveApplication()
  }

  const updateApplicant = <K extends keyof Applicant>(key: K, value: Applicant[K]) => {
    setApplicant((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'applicantId') {
        linkApplicantId(String(value))
      }
      return next
    })
    touchActiveApplication()
  }

  const updateApplication = <K extends keyof JobApplication>(
    key: K,
    value: JobApplication[K],
  ) => {
    setJobApplications((prev) =>
      prev.map((application) =>
        application.JobApplicationId === activeJobApplicationId
          ? { ...application, [key]: value, lastUpdated: new Date().toISOString() }
          : application,
      ),
    )
  }

  const addJobApplication = () => {
    const next = createEmptyApplication(applicant.applicantId)
    setJobApplications((prev) => [...prev, next])
    setActiveJobApplicationId(next.JobApplicationId)
    return next.JobApplicationId
  }

  const deleteJobApplication = async (jobApplicationId: string) => {
    try {
      await deleteApplication(jobApplicationId)
      setJobApplications((prev) => {
        const remaining = prev.filter((app) => app.JobApplicationId !== jobApplicationId)
        if (jobApplicationId === activeJobApplicationId) {
          setActiveJobApplicationId(remaining[0]?.JobApplicationId ?? '')
        }
        return remaining
      })
      setResumeSettingsMap((prev) => {
        const next = { ...prev }
        delete next[jobApplicationId]
        return next
      })
    } catch (error) {
      console.error('Failed to delete application:', error)
    }
  }

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    setEducation((prev) =>
      prev.map((item, current) => (current === index ? { ...item, [field]: value } : item)),
    )
    touchActiveApplication()
  }

  const updateEmployment = (index: number, field: keyof EmploymentHistory, value: string) => {
    setEmploymentHistory((prev) =>
      prev.map((item, current) => (current === index ? { ...item, [field]: value } : item)),
    )
    touchActiveApplication()
  }

  const addEducation = () => {
    setEducation((prev) => [...prev, createEducation(applicant.applicantId)])
    touchActiveApplication()
  }

  const addEmployment = () => {
    setEmploymentHistory((prev) => [...prev, createEmployment(applicant.applicantId)])
    touchActiveApplication()
  }

  const removeEducation = (index: number) => {
    setEducation((prev) => (prev.filter((_, current) => current !== index)))
    touchActiveApplication()
  }

  const removeEmployment = (index: number) => {
    setEmploymentHistory((prev) =>
      prev.filter((_, current) => current !== index),
    )
    touchActiveApplication()
  }

  const reorderEducation = (fromIndex: number, toIndex: number) => {
    setEducation((prev) => moveItem(prev, fromIndex, toIndex))
    touchActiveApplication()
  }

  const reorderEmployment = (fromIndex: number, toIndex: number) => {
    setEmploymentHistory((prev) => moveItem(prev, fromIndex, toIndex))
    touchActiveApplication()
  }

  const updateNestedArray = <K extends 'references' | 'trainings' | 'certificates'>(
    key: K,
    updater: (arr: NonNullable<JobApplication[K]>) => NonNullable<JobApplication[K]>
  ) => {
    setJobApplications(prev => prev.map(app => {
      if (app.JobApplicationId === activeJobApplicationId) {
        return {
          ...app,
          [key]: updater(app[key] || []),
          lastUpdated: new Date().toISOString()
        }
      }
      return app
    }))
  }

  const updateReference = (index: number, field: keyof ApplicantReference, value: string) => 
    updateNestedArray('references', arr => arr.map((item, i) => i === index ? { ...item, [field]: value } : item))
  const updateTraining = (index: number, field: keyof Training, value: string) => 
    updateNestedArray('trainings', arr => arr.map((item, i) => i === index ? { ...item, [field]: value } : item))
  const updateCertificate = (index: number, field: keyof Certificate, value: string) => 
    updateNestedArray('certificates', arr => arr.map((item, i) => i === index ? { ...item, [field]: value } : item))

  const addReference = () => updateNestedArray('references', arr => [...arr, createReference(applicant.applicantId)])
  const addTraining = () => updateNestedArray('trainings', arr => [...arr, createTraining()])
  const addCertificate = () => updateNestedArray('certificates', arr => [...arr, createCertificate()])

  const removeReference = (index: number) => updateNestedArray('references', arr => arr.filter((_, i) => i !== index))
  const removeTraining = (index: number) => updateNestedArray('trainings', arr => arr.filter((_, i) => i !== index))
  const removeCertificate = (index: number) => updateNestedArray('certificates', arr => arr.filter((_, i) => i !== index))

  const reorderReferences = (fromIndex: number, toIndex: number) => updateNestedArray('references', arr => moveItem(arr, fromIndex, toIndex))
  const reorderTrainings = (fromIndex: number, toIndex: number) => updateNestedArray('trainings', arr => moveItem(arr, fromIndex, toIndex))
  const reorderCertificates = (fromIndex: number, toIndex: number) => updateNestedArray('certificates', arr => moveItem(arr, fromIndex, toIndex))

  const activeJobApplication =
    jobApplications.find((application) => application.JobApplicationId === activeJobApplicationId) ??
    jobApplications[0]

  const authenticated = Boolean(authSession?.token)
  const requiresApplicantOnboarding =
    authenticated &&
    isProfileHydrated &&
    (!applicant.homeAddress || !applicant.phoneNumber || !applicant.citizenshipStatus || !applicant.applicantName || applicant.hasCriminalHistory === null)

  const handleLogin = async (email: string, password: string) => {
    setAuthError('')
    setIsAuthLoading(true)
    try {
      const session = await loginUser(email, password)
      console.log('Login successful, received session:', session)
      setAuthSession(session)
      setApplicant((prev) => ({ ...prev, applicantId: session.user.id }))
    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Login failed')
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleSignup = async (name: string, email: string, password: string) => {
    setAuthError('')
    setIsAuthLoading(true)
    try {
      // Register but do not auto-login the user; require explicit login
      await registerUser(name, email, password)
      setRegistrationMessage('Registration successful. Please sign in to continue.')
      setAuthSession(null)

    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Signup failed')
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleLogout = () => {
    setAuthSession(null)
  }

  const saveApplicantProfile = async (payload: {
    applicantName: string
    homeAddress: string
    phoneNumber: string
    emailAddress: string
    linkedInUrl: string
    citizenshipStatus: string
    hasCriminalHistory: boolean | null
    currentPassword: string
    newPassword: string
  }) => {
    if (!applicant.applicantId) {
      throw new Error('Applicant is not loaded.')
    }

    const updated = await updateApplicantProfile({
      applicantId: applicant.applicantId,
      ...payload,
    })

    setApplicant((prev) => ({
      ...prev,
      applicantName: updated.applicantName,
      homeAddress: payload.homeAddress,
      phoneNumber: payload.phoneNumber,
      emailAddress: payload.emailAddress,
      linkedInUrl: payload.linkedInUrl,
      citizenshipStatus: payload.citizenshipStatus,
      hasCriminalHistory: payload.hasCriminalHistory,
    }))

    setAuthSession((prev) =>
      prev
        ? {
            ...prev,
            user: {
              ...prev.user,
              name: updated.applicantName,
              email: updated.emailAddress,
            },
          }
        : prev,
    )
  }

  useEffect(() => {
    const nextScope = getStorageScope(authSession?.user.id)
    const nextApplicant = normalizeApplicant(
      loadScopedValue<StoredApplicant>(nextScope, 'applicant', starterApplicant),
    )
    const nextJobApplications = loadScopedValue<StoredJobApplication[]>(
      nextScope,
      'jobApplications',
      [createEmptyApplication(nextApplicant.applicantId)],
    ).map((application) =>
      normalizeJobApplication(
        application,
        nextApplicant.applicantId,
        createEmptyApplication(nextApplicant.applicantId).JobApplicationId,
      ),
    )

    setApplicant(nextApplicant)
    setJobApplications(nextJobApplications)
    setActiveJobApplicationId(
      loadScopedValue<string>(
        nextScope,
        'activeJobApplicationId',
        nextJobApplications[0]?.JobApplicationId ?? '',
      ) || nextJobApplications[0]?.JobApplicationId || '',
    )
    setEducation(
      loadScopedValue<StoredEducation[]>(nextScope, 'education', []).map((entry) => ({
        educationId: entry.educationId || entry.id || createId(),
        applicantId: entry.applicantId || nextApplicant.applicantId,
        schoolName: entry.schoolName || '',
        schoolLocation: entry.schoolLocation || '',
        startYear: entry.startYear || '',
        endYear: entry.endYear || '',
        degreeReceived: entry.degreeReceived || '',
        programName: entry.programName || '',
      })),
    )
    setEmploymentHistory(
      loadScopedValue<StoredEmploymentHistory[]>(nextScope, 'employmentHistory', []).map((entry) => ({
        EmploymentHistoryId: entry.EmploymentHistoryId || entry.id || createId(),
        applicantId: entry.applicantId || nextApplicant.applicantId,
        companyName: entry.companyName || '',
        workAddress: entry.workAddress || '',
        workPosition: entry.workPosition || '',
        reasonForLeaving: entry.reasonForLeaving ?? null,
        startDate: entry.startDate || '',
        endDate: entry.endDate || '',
        isEmployed: entry.isEmployed ?? false,
      })),
    )
    setResumeSettingsMap(loadScopedValue<Record<string, ApplicationResumeSettings>>(nextScope, 'resumeSettings', {}))
    setPreviewFont(loadScopedValue<string>(nextScope, 'previewFont', 'Times New Roman'))
    setResumeTemplate(loadScopedValue<ResumeTemplateId>(nextScope, 'resumeTemplate', 'classic'))
    setHydratedStorageScope(nextScope)

    if (!authSession?.user.id) {
      setIsProfileHydrated(true)
      return
    }

    let cancelled = false
    setIsProfileHydrated(false)

    void Promise.all([
      getApplicantProfile(authSession.user.id),
      getApplicationsForApplicant(authSession.user.id),
    ])
      .then(([profile, response]) => {
        if (cancelled) {
          return
        }

        setApplicant((prev) => ({
          ...prev,
          ...profile,
          applicantId: profile.applicantId,
          hasCriminalHistory: profile.hasCriminalHistory ?? null,
        }))

        const backendApplications = response.data.map((application) =>
          normalizeBackendApplication(application, profile.applicantId),
        )

        setJobApplications((prev) => {
          const localById = new Map(prev.map((item) => [item.JobApplicationId, item]))
          return backendApplications.map((application) => {
            const local = localById.get(application.JobApplicationId)
            return {
              ...application,
              references: local?.references ?? application.references ?? [],
              trainings: local?.trainings ?? application.trainings ?? [],
              certificates: local?.certificates ?? application.certificates ?? [],
            }
          })
        })

        setResumeSettingsMap(() => {
          const next: Record<string, ApplicationResumeSettings> = {}
          for (const application of response.data) {
            next[application.JobApplicationId] = {
              JobApplicationId: application.JobApplicationId,
              resumeTemplate: application.resumeTemplate || 'classic',
              previewFont: application.previewFont || 'Helvetica',
              lastUpdated: application.settingsLastUpdated,
            }
          }
          return next
        })
      })
      .catch(() => {
        // Keep scoped cache if the backend snapshot is unavailable.
      })
      .finally(() => {
        if (!cancelled) {
          setIsProfileHydrated(true)
        }
      })

    return () => {
      cancelled = true
    }
  }, [authSession?.user.id])

  useEffect(() => {
    if (!jobApplications.some((application) => application.JobApplicationId === activeJobApplicationId)) {
      setActiveJobApplicationId(jobApplications[0]?.JobApplicationId ?? '')
    }
  }, [jobApplications, activeJobApplicationId])

  useEffect(() => {
    if (hydratedStorageScope !== storageScope) {
      return
    }

    window.localStorage.setItem(getScopedStorageKey(storageScope, 'applicant'), JSON.stringify(applicant))
  }, [applicant, storageScope, hydratedStorageScope])

  useEffect(() => {
    if (hydratedStorageScope !== storageScope) {
      return
    }

    window.localStorage.setItem(getScopedStorageKey(storageScope, 'jobApplications'), JSON.stringify(jobApplications))
  }, [jobApplications, storageScope, hydratedStorageScope])

  useEffect(() => {
    if (hydratedStorageScope !== storageScope) {
      return
    }

    window.localStorage.setItem(
      getScopedStorageKey(storageScope, 'activeJobApplicationId'),
      JSON.stringify(activeJobApplicationId),
    )
  }, [activeJobApplicationId, storageScope, hydratedStorageScope])

  useEffect(() => {
    if (hydratedStorageScope !== storageScope) {
      return
    }

    window.localStorage.setItem(getScopedStorageKey(storageScope, 'education'), JSON.stringify(education))
  }, [education, storageScope, hydratedStorageScope])

  useEffect(() => {
    if (hydratedStorageScope !== storageScope) {
      return
    }

    window.localStorage.setItem(getScopedStorageKey(storageScope, 'employmentHistory'), JSON.stringify(employmentHistory))
  }, [employmentHistory, storageScope, hydratedStorageScope])

  useEffect(() => {
    if (hydratedStorageScope !== storageScope) {
      return
    }

    window.localStorage.setItem(getScopedStorageKey(storageScope, 'previewFont'), JSON.stringify(previewFont))
  }, [previewFont, storageScope, hydratedStorageScope])

  useEffect(() => {
    if (hydratedStorageScope !== storageScope) {
      return
    }

    window.localStorage.setItem(getScopedStorageKey(storageScope, 'resumeTemplate'), JSON.stringify(resumeTemplate))
  }, [resumeTemplate, storageScope, hydratedStorageScope])

  useEffect(() => {
    if (hydratedStorageScope !== storageScope) {
      return
    }

    window.localStorage.setItem(getScopedStorageKey(storageScope, 'resumeSettings'), JSON.stringify(resumeSettingsMap))
  }, [resumeSettingsMap, storageScope, hydratedStorageScope])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.authSession, JSON.stringify(authSession))
  }, [authSession])

  // Mouse-follow background blur (updates CSS variables)
  useEffect(() => {
    const onMove = (e: MouseEvent) => {
      document.documentElement.style.setProperty('--mouse-x', `${e.clientX}px`)
      document.documentElement.style.setProperty('--mouse-y', `${e.clientY}px`)
    }
    window.addEventListener('mousemove', onMove)
    return () => window.removeEventListener('mousemove', onMove)
  }, [])

  // Fetch resume settings when active application changes
  useEffect(() => {
    if (!activeJobApplicationId) return

    // If we already have settings cached, use them
    if (resumeSettingsMap[activeJobApplicationId]) {
      const settings = resumeSettingsMap[activeJobApplicationId]
      setPreviewFont(settings.previewFont)
      setResumeTemplate(settings.resumeTemplate as ResumeTemplateId)
      return
    }

    // Otherwise, try to fetch from backend (for authenticated users)
    if (authSession?.token) {
      void getResumeSettings(activeJobApplicationId)
        .then((res) => {
          if (res.data) {
            const settings = res.data
            setResumeSettingsMap((prev) => ({
              ...prev,
              [activeJobApplicationId]: settings,
            }))
            setPreviewFont(settings.previewFont)
            setResumeTemplate(settings.resumeTemplate as ResumeTemplateId)
          }
        })
        .catch(() => {
          // Silently fail and use defaults
        })
    }
  }, [activeJobApplicationId, authSession?.token, resumeSettingsMap])

  // Explicit sync function - only called when user downloads PDF, exits to home, or on session recovery
  const syncCurrentApplication = async () => {
    if (!activeJobApplication) {
      return
    }

    const payload = {
      applicant,
      jobApplication: {
        ...activeJobApplication,
        agreesToDrugTest: applicant.agreesToDrugTest ?? false,
        JobApplicationStatus: 'Pending',
      },
      education,
      employmentHistory,
      trainings: activeJobApplication.trainings || [],
      certificates: activeJobApplication.certificates || [],
      references: activeJobApplication.references || [],
      resumeSettings: {
        JobApplicationId: activeJobApplicationId,
        resumeTemplate,
        previewFont,
      },
    }

    try {
      ApplicationPayloadSchema.parse(payload)
    } catch (err) {
      console.warn('Validation failed for payload, aborting sync:', err)
      return
    }

    await syncApplication(payload).catch(console.error)
  }

  const handleResumeUpload = async (file: File | null) => {
    if (!file) {
      return
    }

    if (file.type !== 'application/pdf') {
      setUploadState({ uploading: false, message: 'Please select a PDF file.' })
      return
    }

    const cloudName = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME
    const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET

    if (!cloudName || !uploadPreset) {
      setUploadState({
        uploading: false,
        message:
          'Cloud upload is not configured. Add VITE_CLOUDINARY_CLOUD_NAME and VITE_CLOUDINARY_UPLOAD_PRESET in your .env file.',
      })
      return
    }

    setUploadState({ uploading: true, message: 'Uploading resume...' })

    try {
      const formData = new FormData()
      formData.append('file', file)
      formData.append('upload_preset', uploadPreset)
      formData.append('folder', 'applyr/resumes')

      const response = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/upload`, {
        method: 'POST',
        body: formData,
      })

      if (!response.ok) {
        throw new Error('Upload failed')
      }

      const payload = (await response.json()) as { secure_url?: string }

      if (!payload.secure_url) {
        throw new Error('Missing uploaded file URL')
      }

      updateApplication('resumeFileUrl', payload.secure_url)
      setUploadState({ uploading: false, message: 'Resume uploaded successfully.' })
    } catch {
      setUploadState({
        uploading: false,
        message: 'Upload could not be completed. Please verify your Cloudinary configuration.',
      })
    }
  }

  return (
    <div className="app-shell">
      <div className="mouse-blur" aria-hidden="true" />
      {/* 1. Place the Navbar here. 
        It will sit at the top of the screen on EVERY route.
      */}
      <Navbar authSession={authSession} onLogout={handleLogout} />

      {/* 2. Your main content area goes below it.
      */}
      <main className="app-content">
      <Routes>
        <Route
          path="/"
          element={
            requiresApplicantOnboarding ? (
              <Navigate to="/applicant" state={{ from: 'onboarding' }} replace />
            ) : (
                <HomePage
                applicant={applicant}
                jobApplications={jobApplications}
                activeJobApplicationId={activeJobApplicationId}
                resumeTemplate={resumeTemplate}
                previewFont={previewFont}
                resumeSettingsMap={resumeSettingsMap}
                education={education}
                employmentHistory={employmentHistory}
                authSession={authSession}
                isAuthLoading={isAuthLoading}
                authError={authError}
                registrationMessage={registrationMessage}
                onLogin={handleLogin}
                onSignup={handleSignup}
                  onAddJobApplication={addJobApplication}
                onRequestNewApplication={() => setShowNewAppModal(true)}
              />
            )
          }
        />
        <Route
          path="/editor/:applicationId?"
          element={
            authenticated ? (
              <EditorPage
                applicant={applicant}
                jobApplication={activeJobApplication}
                jobApplications={jobApplications}
                activeJobApplicationId={activeJobApplicationId}
                onJobApplicationChange={setActiveJobApplicationId}
                onAddJobApplication={addJobApplication}
                education={education}
                employmentHistory={employmentHistory}
                uploadState={uploadState}
                previewFont={previewFont}
                resumeTemplate={resumeTemplate}
                onPreviewFontChange={(font) => {
                  setPreviewFont(font)
                  setResumeSettingsMap((prev) => ({
                    ...prev,
                    [activeJobApplicationId]: {
                      JobApplicationId: activeJobApplicationId,
                      resumeTemplate: resumeTemplate as ResumeTemplateId,
                      previewFont: font,
                    },
                  }))
                  touchActiveApplication()
                }}
                onResumeTemplateChange={(template) => {
                  setResumeTemplate(template)
                  setResumeSettingsMap((prev) => ({
                    ...prev,
                    [activeJobApplicationId]: {
                      JobApplicationId: activeJobApplicationId,
                      resumeTemplate: template,
                      previewFont,
                    },
                  }))
                  touchActiveApplication()
                }}
                updateApplicant={updateApplicant}
                updateApplication={updateApplication}
                updateEducation={updateEducation}
                updateEmployment={updateEmployment}
                updateReference={updateReference}
                updateTraining={updateTraining}
                updateCertificate={updateCertificate}
                addEducation={addEducation}
                removeEducation={removeEducation}
                reorderEducation={reorderEducation}
                addEmployment={addEmployment}
                removeEmployment={removeEmployment}
                reorderEmployment={reorderEmployment}
                addReference={addReference}
                removeReference={removeReference}
                reorderReferences={reorderReferences}
                addTraining={addTraining}
                removeTraining={removeTraining}
                reorderTrainings={reorderTrainings}
                addCertificate={addCertificate}
                removeCertificate={removeCertificate}
                reorderCertificates={reorderCertificates}
                handleResumeUpload={handleResumeUpload}
                onDeleteJobApplication={deleteJobApplication}
                onSyncRequest={syncCurrentApplication}
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
        <Route
          path="/applicant"
          element={
            authenticated ? (
              <ApplicantEditPage applicant={applicant} authSession={authSession} onSaveApplicant={saveApplicantProfile} />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
      {showNewAppModal && (
        <NewApplicationModal
          isOpen={showNewAppModal}
          onClose={() => setShowNewAppModal(false)}
          onCreate={async ({ appliedPosition, JobApplicationDate, agreesToDrugTest }) => {
            const next = createEmptyApplication(applicant.applicantId)
            const nextFilled = { ...next, appliedPosition, JobApplicationDate, agreesToDrugTest }
            setJobApplications((prev) => [...prev, nextFilled])
            setActiveJobApplicationId(next.JobApplicationId)
            setShowNewAppModal(false)
            navigate(`/editor/${next.JobApplicationId}`)
          }}
        />
      )}
      </main>
    </div>
  )
}

export default App
