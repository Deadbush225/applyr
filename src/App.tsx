import { useCallback, useEffect, useRef, useState } from 'react'
import { Navigate, Route, Routes, useLocation, useNavigate } from 'react-router-dom'
import './styles/App.scss'

import ApplicantDetailsPage from './pages/ApplicantDetailsPage'
import ApplicantEditPage from './pages/ApplicantEditPage'
import EditorPage from './pages/EditorPage'
import HomePage from './pages/HomePage'
import NewApplicationModal from './components/modals/NewApplicationModal'
import Navbar from './components/Navbar'
import { updateApplication as syncApplication, getResumeSettings, deleteApplication, deleteNestedItem, getApplicationsForApplicant } from './services/applications'
import { ApplicationSyncSchema, ProfileSyncSchema } from './validation/applicationSchema'
import { validateApplicationPayload, type ValidationError } from './utils/validation'
import { loginUser, registerUser, getApplicantProfile, syncApplicantProfile, updateApplicantProfile, type AuthSession } from './services/auth'
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

let __tempIdCounter = -1
const createId = (): number => {
  return __tempIdCounter--
}

const createJobApplicationId = () => {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID()
  }

  const bytes = Array.from({ length: 16 }, () => Math.floor(Math.random() * 256))
  bytes[6] = (bytes[6] & 0x0f) | 0x40
  bytes[8] = (bytes[8] & 0x3f) | 0x80
  const hex = bytes.map((byte) => byte.toString(16).padStart(2, '0')).join('')
  return `${hex.slice(0, 8)}-${hex.slice(8, 12)}-${hex.slice(12, 16)}-${hex.slice(16, 20)}-${hex.slice(20)}`
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
  agreesToDrugTest: false,
})

const createEmptyApplication = (applicantId: number | string): JobApplication => ({
  JobApplicationId: createJobApplicationId(),
  applicantId: String(applicantId),
  appliedPosition: '',
  JobApplicationDate: new Date().toISOString().slice(0, 10),
  agreesToDrugTest: false,
  lastUpdated: new Date().toISOString(),
  availableStartDate: '',
  expectedSalary: '',
  resumeFileUrl: '',
  references: [],
  trainings: [],
  certificates: [],
})

const createEducation = (applicantId: number | string): Education => ({
  educationId: createId(),
  applicantId,
  schoolId: '',
  schoolName: '',
  schoolLocation: '',
  startYear: '',
  endYear: '',
  degreeReceived: '',
  programName: '',
})

const createEmployment = (applicantId: number | string): EmploymentHistory => ({
  EmploymentHistoryId: createId(),
  applicantId,
  companyName: '',
  companyId: '',
  companyAddress: '',
  workPosition: '',
  reasonForLeaving: null,
  startDate: '',
  endDate: '',
  isEmployed: false,
})

const createReference = (applicantId: number | string): ApplicantReference => ({
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

const isBlank = (value: unknown) => value === '' || value === null || value === undefined

const trimValue = (value: unknown) => (typeof value === 'string' ? value.trim() : value)

const toBooleanFlag = (value: unknown): boolean =>
  value === true || value === 1 || value === '1' || value === 'true'

const normalizeMonthInput = (value: unknown) => {
  const trimmed = trimValue(value)
  if (typeof trimmed !== 'string') return ''
  const dateMatch = trimmed.match(/^(\d{4}-\d{2})-\d{2}$/)
  if (dateMatch) {
    return dateMatch[1]
  }
  return trimmed
}

const normalizeMonthDate = (value: unknown) => {
  const trimmed = trimValue(value)
  if (typeof trimmed !== 'string') return trimmed
  if (/^\d{4}-\d{2}-\d{2}$/.test(trimmed)) {
    return trimmed
  }
  if (/^\d{4}-\d{2}$/.test(trimmed)) {
    return `${trimmed}-01`
  }
  return trimmed
}

const sanitizeEducation = (items: Education[]) =>
  items
    .map((item) => ({
      ...item,
      schoolName: item.schoolName.trim(),
      schoolLocation: item.schoolLocation.trim(),
      startYear: (item.startYear?.trim() || null) as string | null,
      endYear: (item.endYear?.trim() || null) as string | null,
      degreeReceived: item.degreeReceived.trim(),
      programName: item.programName.trim(),
    }))
    .filter((item) =>
      [item.schoolName, item.schoolLocation, item.degreeReceived, item.programName].every(
        (value) => !isBlank(value),
      ) && (item.startYear || item.endYear),
    )

const sanitizeEmployment = (items: EmploymentHistory[]) =>
  items
    .map((item) => ({
      ...item,
      isEmployed: toBooleanFlag(item.isEmployed),
      companyName: item.companyName.trim(),
      companyAddress: (item.companyAddress || '').trim(),
      companyPhone: (item.companyPhone || '').trim(),
      workPosition: item.workPosition.trim(),
      reasonForLeaving: typeof item.reasonForLeaving === 'string' ? item.reasonForLeaving.trim() : item.reasonForLeaving,
      startDate: normalizeMonthDate(item.startDate) as string,
      endDate: item.isEmployed ? '' : (normalizeMonthDate(item.endDate) as string),
    }))
    .filter((item) => {
      const baseValid = [item.companyName, item.workPosition, item.startDate].every((value) => !isBlank(value))
      if (!baseValid) return false
      if (item.isEmployed) return true
      return !isBlank(item.endDate)
    })

const sanitizeTrainings = (items: Training[]) =>
  items
    .map((item) => ({
      ...item,
      trainingTitle: item.trainingTitle.trim(),
      trainingDescription: item.trainingDescription.trim(),
      trainingInstructor: item.trainingInstructor.trim(),
      trainingDurationHours: trimValue(item.trainingDurationHours) as string,
      completionDate: trimValue(item.completionDate) as string | undefined,
    }))
    .filter((item) =>
      [item.trainingTitle, item.trainingInstructor, item.trainingDurationHours, item.completionDate].every(
        (value) => !isBlank(value),
      ),
    )

const sanitizeCertificates = (items: Certificate[]) =>
  items
    .map((item) => ({
      ...item,
      certificateName: item.certificateName.trim(),
      issuingAuthority: item.issuingAuthority.trim(),
      validityMonths: trimValue(item.validityMonths) as string,
      dateIssued: trimValue(item.dateIssued) as string | undefined,
    }))
    .filter((item) =>
      [item.certificateName, item.issuingAuthority, item.validityMonths, item.dateIssued].every((value) => !isBlank(value)),
    )

const sanitizeReferences = (items: ApplicantReference[]) =>
  items
    .map((item) => ({
      ...item,
      referenceName: item.referenceName.trim(),
      referenceTitle: item.referenceTitle.trim(),
      referenceCompany: item.referenceCompany.trim(),
      referencePhone: item.referencePhone.trim(),
      referenceEmail: (item.referenceEmail ?? '').trim(),
    }))
    .filter((item) =>
      [item.referenceName, item.referenceTitle, item.referenceCompany, item.referencePhone, item.referenceEmail].some(
        (value) => !isBlank(value),
      ),
    )

const toPersistableId = (value: number | string | null | undefined): number | string | undefined => {
  if (value === null || value === undefined || value === '') {
    return undefined
  }

  if (typeof value === 'number') {
    return value > 0 ? value : undefined
  }

  return value.startsWith('-') ? undefined : value
}

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

const starterApplicant = createEmptyApplicant()

type ResumeTemplateId = 'classic' | 'compact' | 'modern'

type ProfileNavigationGuard = {
  blocked: boolean
  discardCurrentItem: () => Promise<void>
}

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

type StoredApplicant = Partial<Applicant> & { id?: number | string }
type StoredJobApplication = Partial<JobApplication> & { id?: number | string }
type StoredEducation = Partial<Education> & { id?: number | string }
type StoredEmploymentHistory = Partial<EmploymentHistory> & { id?: number | string }
type StoredTraining = Partial<Training> & { id?: number | string }
type StoredCertificate = Partial<Certificate> & { id?: number | string }

const getStorageScope = (userId?: number | string | null) => (userId ? `user:${userId}` : 'guest')

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
  applicantId: number | string,
  fallbackId: string,
): JobApplication => ({
  ...createEmptyApplication(applicantId),
  ...value,
  JobApplicationId: String(value.JobApplicationId || value.id || fallbackId),
  applicantId,
  agreesToDrugTest: toBooleanFlag(value.agreesToDrugTest),
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
  fallbackApplicantId: number | string,
): JobApplication => ({
  ...createEmptyApplication(fallbackApplicantId),
  ...value,
  applicantId: value.applicantId || fallbackApplicantId,
  agreesToDrugTest: toBooleanFlag(value.agreesToDrugTest),
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
        : createJobApplicationId(),
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
      schoolId: entry.schoolId || '',
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
      companyAddress: entry.companyAddress || '',
      companyPhone: entry.companyPhone || '',
      workPosition: entry.workPosition || '',
      reasonForLeaving: entry.reasonForLeaving ?? null,
      startDate: normalizeMonthInput(entry.startDate),
      endDate: normalizeMonthInput(entry.endDate),
      isEmployed: toBooleanFlag(entry.isEmployed),
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
  const [validationErrors, setValidationErrors] = useState<ValidationError[]>([])
  const [profileNavigationGuard, setProfileNavigationGuard] = useState<ProfileNavigationGuard | null>(null)
  const [pendingNavigationTarget, setPendingNavigationTarget] = useState<string | null>(null)
  const [trainingDuplicateWarnings, setTrainingDuplicateWarnings] = useState<Record<number, { attemptedValue: string; lastValid: string }>>({})
  const [certificateDuplicateWarnings, setCertificateDuplicateWarnings] = useState<Record<number, { attemptedValue: string; lastValid: string }>>({})
  const pendingTrainingDuplicateSelectionRef = useRef<Record<number, string>>({})
  const pendingCertificateDuplicateSelectionRef = useRef<Record<number, string>>({})
  const location = useLocation()
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

  const handleProfileNavigationGuardChange = useCallback((guard: ProfileNavigationGuard | null) => {
    setProfileNavigationGuard(guard)
  }, [])

  const handleNavbarNavigate = useCallback(
    (target: string) => {
      const isLeavingProfilePage = location.pathname.startsWith('/profile') && target !== '/profile'
      if (isLeavingProfilePage && profileNavigationGuard?.blocked) {
        setPendingNavigationTarget(target)
        return
      }

      setPendingNavigationTarget(null)
      navigate(target)
    },
    [location.pathname, navigate, profileNavigationGuard],
  )

  const handleDiscardAndNavigate = useCallback(async () => {
    const target = pendingNavigationTarget ?? '/'
    try {
      await profileNavigationGuard?.discardCurrentItem()
    } finally {
      setPendingNavigationTarget(null)
      navigate(target)
    }
  }, [navigate, pendingNavigationTarget, profileNavigationGuard])

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
      await deleteApplication(jobApplicationId, authSession?.token)
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

  const updateEducation = <K extends keyof Education>(index: number, field: K, value: Education[K]) => {
    setEducation((prev) =>
      prev.map((item, current) => {
        if (current !== index) return item
        const next = { ...item, [field]: value }
        if (field === 'isCurrent' && (value as boolean)) {
          next.endYear = ''
        }
        return next
      }),
    )
    touchActiveApplication()
  }

  const updateEmployment = <K extends keyof EmploymentHistory>(index: number, field: K, value: EmploymentHistory[K]) => {
    setEmploymentHistory((prev) =>
      prev.map((item, current) => {
        if (current !== index) return item
        const next = { ...item, [field]: value }
        if (field === 'isEmployed' && value === true) {
          next.endDate = ''
        }
        return next
      }),
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

  const removeEducation = async (index: number) => {
    const entry = education[index]
    if (!entry) {
      return
    }

    try {
      await deleteNestedItem('education', entry.educationId, authSession?.token)
      setEducation((prev) => prev.filter((_, current) => current !== index))
      touchActiveApplication()
    } catch (error) {
      console.error('Failed to delete education:', error)
    }
  }

  const removeEmployment = async (index: number) => {
    const entry = employmentHistory[index]
    if (!entry) {
      return
    }

    try {
      await deleteNestedItem('employment', entry.EmploymentHistoryId, authSession?.token)
      setEmploymentHistory((prev) => prev.filter((_, current) => current !== index))
      touchActiveApplication()
    } catch (error) {
      console.error('Failed to delete employment history:', error)
    }
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
  
  const updateTraining = (index: number, field: keyof Training, value: string) => {
    const currentTraining = activeJobApplication?.trainings?.[index]
    const pendingTrainingDuplicateValue = pendingTrainingDuplicateSelectionRef.current[index]
    
    updateNestedArray('trainings', arr => {
      // Check for duplicates when updating trainingTitle
      if (field === 'trainingTitle' && value.trim() !== '') {
        const isDuplicate = arr.some(
          (training, i) => 
            i !== index && 
            training.trainingTitle.toLowerCase().trim() === value.toLowerCase().trim()
        )
        if (isDuplicate) {
          pendingTrainingDuplicateSelectionRef.current[index] = value.trim().toLowerCase()
          // Store warning with the last valid value
          setTrainingDuplicateWarnings(prev => ({
            ...prev,
            [index]: {
              attemptedValue: value,
              lastValid: currentTraining?.trainingTitle || ''
            }
          }))
          return arr // Don't update state, but UI will show warning
        } else {
          delete pendingTrainingDuplicateSelectionRef.current[index]
          // Clear warning if user fixed the duplicate
          setTrainingDuplicateWarnings(prev => {
            const next = { ...prev }
            delete next[index]
            return next
          })
        }
      } else if (field === 'trainingId' && pendingTrainingDuplicateValue) {
        delete pendingTrainingDuplicateSelectionRef.current[index]
        return arr
      }
      
      return arr.map((item, i) => i === index ? { ...item, [field]: value } : item)
    })
  }
  
  const updateCertificate = (index: number, field: keyof Certificate, value: string) => {
    const currentCert = activeJobApplication?.certificates?.[index]
    const pendingCertificateDuplicateValue = pendingCertificateDuplicateSelectionRef.current[index]
    
    updateNestedArray('certificates', arr => {
      // Check for duplicates when updating certificateName
      if (field === 'certificateName' && value.trim() !== '') {
        const isDuplicate = arr.some(
          (cert, i) => 
            i !== index && 
            cert.certificateName.toLowerCase().trim() === value.toLowerCase().trim()
        )
        if (isDuplicate) {
          pendingCertificateDuplicateSelectionRef.current[index] = value.trim().toLowerCase()
          // Store warning with the last valid value
          setCertificateDuplicateWarnings(prev => ({
            ...prev,
            [index]: {
              attemptedValue: value,
              lastValid: currentCert?.certificateName || ''
            }
          }))
          return arr // Don't update state, but UI will show warning
        } else {
          delete pendingCertificateDuplicateSelectionRef.current[index]
          // Clear warning if user fixed the duplicate
          setCertificateDuplicateWarnings(prev => {
            const next = { ...prev }
            delete next[index]
            return next
          })
        }
      } else if (field === 'certificateId' && pendingCertificateDuplicateValue) {
        delete pendingCertificateDuplicateSelectionRef.current[index]
        return arr
      }
      
      return arr.map((item, i) => i === index ? { ...item, [field]: value } : item)
    })
  }

  const addReference = () => updateNestedArray('references', arr => [...arr, createReference(applicant.applicantId)])
  const addTraining = () => updateNestedArray('trainings', arr => [...arr, createTraining()])
  const addCertificate = () => updateNestedArray('certificates', arr => [...arr, createCertificate()])

  const removeReference = async (index: number) => {
    const entry = activeJobApplication?.references?.[index]
    if (!entry) {
      return
    }

    if (entry.referenceId === undefined || entry.referenceId === null || entry.referenceId === '') {
      updateNestedArray('references', (arr) => arr.filter((_, i) => i !== index))
      return
    }

    try {
      await deleteNestedItem('reference', entry.referenceId, authSession?.token)
      updateNestedArray('references', (arr) => arr.filter((_, i) => i !== index))
    } catch (error) {
      console.error('Failed to delete reference:', error)
    }
  }

  const removeTraining = async (index: number) => {
    const entry = activeJobApplication?.trainings?.[index]
    if (!entry) {
      return
    }

    try {
      const nestedId = entry.trainingId ?? ((entry as Training & { id?: number | string }).id)
      if (nestedId == null || nestedId === '') {
        console.warn('Training has no id, skipping backend delete and removing locally')
        updateNestedArray('trainings', (arr) => arr.filter((_, i) => i !== index))
        return
      }
      await deleteNestedItem('training', nestedId, authSession?.token)
      updateNestedArray('trainings', (arr) => arr.filter((_, i) => i !== index))
    } catch (error) {
      console.error('Failed to delete training:', error)
    }
  }

  const removeCertificate = async (index: number) => {
    const entry = activeJobApplication?.certificates?.[index]
    if (!entry) {
      return
    }

    try {
      const nestedId = entry.certificateId ?? ((entry as Certificate & { id?: number | string }).id)
      if (nestedId == null || nestedId === '') {
        console.warn('Certificate has no id, skipping backend delete and removing locally')
        updateNestedArray('certificates', (arr) => arr.filter((_, i) => i !== index))
        return
      }
      await deleteNestedItem('certificate', nestedId, authSession?.token)
      updateNestedArray('certificates', (arr) => arr.filter((_, i) => i !== index))
    } catch (error) {
      console.error('Failed to delete certificate:', error)
    }
  }

  const reorderReferences = (fromIndex: number, toIndex: number) => updateNestedArray('references', arr => moveItem(arr, fromIndex, toIndex))
  const reorderTrainings = (fromIndex: number, toIndex: number) => updateNestedArray('trainings', arr => moveItem(arr, fromIndex, toIndex))
  const reorderCertificates = (fromIndex: number, toIndex: number) => updateNestedArray('certificates', arr => moveItem(arr, fromIndex, toIndex))

  const activeJobApplication =
    jobApplications.find((application) => application.JobApplicationId === activeJobApplicationId) ??
    jobApplications[0]

  const buildProfileSyncPayload = useCallback(() => {
    if (!applicant.applicantId) {
      return null
    }

    return {
      applicantId: applicant.applicantId,
      education: sanitizeEducation(education).map((item) => ({
        ...item,
        educationId: toPersistableId(item.educationId),
        schoolId: toPersistableId(item.schoolId),
      })),
      employmentHistory: sanitizeEmployment(employmentHistory).map((item) => ({
        ...item,
        EmploymentHistoryId: toPersistableId(item.EmploymentHistoryId),
        companyId: toPersistableId(item.companyId),
      })),
      trainings: sanitizeTrainings(activeJobApplication?.trainings || []).map((item) => ({
        ...item,
        trainingId: toPersistableId(item.trainingId),
      })),
      certificates: sanitizeCertificates(activeJobApplication?.certificates || []).map((item) => ({
        ...item,
        certificateId: toPersistableId(item.certificateId),
      })),
    }
  }, [activeJobApplication, applicant.applicantId, education, employmentHistory])

  const buildApplicationSyncPayload = useCallback(() => {
    if (!activeJobApplication) {
      return null
    }

    return {
      jobApplication: {
        ...activeJobApplication,
        JobApplicationId: activeJobApplication.JobApplicationId,
        agreesToDrugTest: toBooleanFlag(activeJobApplication.agreesToDrugTest),
        JobApplicationStatus: 'Pending',
      },
      references: sanitizeReferences(activeJobApplication.references || []).map((item) => {
        const ref: ApplicantReference = {
          ...item,
          applicantId: item.applicantId,
          referenceEmail: item.referenceEmail ?? null,
        }
        const pid = toPersistableId(item.referenceId)
        if (pid !== undefined) {
          ref.referenceId = pid
        } else {
          // Ensure we don't send placeholder ids (e.g. 1 or negative temp ids)
          delete ref.referenceId
        }
        return ref
      }),
      resumeSettings: {
        JobApplicationId: activeJobApplicationId,
        resumeTemplate,
        previewFont,
      },
    }
  }, [
    activeJobApplication,
    activeJobApplicationId,
    applicant,
    previewFont,
    resumeTemplate,
  ])

  const authenticated = Boolean(authSession?.token)
  const isValidationBlocked = validationErrors.length > 0
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
        companyId: entry.companyId || '',
        companyAddress: entry.companyAddress || '',
        companyPhone: entry.companyPhone || '',
        workPosition: entry.workPosition || '',
        reasonForLeaving: entry.reasonForLeaving ?? null,
        startDate: normalizeMonthInput(entry.startDate),
        endDate: normalizeMonthInput(entry.endDate),
        isEmployed: toBooleanFlag(entry.isEmployed),
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
      getApplicationsForApplicant(authSession.user.id, authSession.token),
    ])
      .then(([profile, response]) => {
        if (cancelled) {
          return
        }

        const backendEducation = (profile.education || []).map((entry) => ({
          educationId: entry.educationId || entry.id || createId(),
          applicantId: entry.applicantId || profile.applicantId,
          schoolId: entry.schoolId || '',
          schoolName: entry.schoolName || '',
          schoolLocation: entry.schoolLocation || '',
          startYear: entry.startYear || '',
          endYear: entry.endYear || '',
          degreeReceived: entry.degreeReceived || '',
          programName: entry.programName || '',
        }))

        const backendEmployment = (profile.employmentHistory || []).map((entry) => ({
          EmploymentHistoryId: entry.EmploymentHistoryId || entry.id || createId(),
          applicantId: entry.applicantId || profile.applicantId,
          companyName: entry.companyName || '',
          companyId: entry.companyId || '',
          companyAddress: entry.companyAddress || '',
          companyPhone: entry.companyPhone || '',
          workPosition: entry.workPosition || '',
          reasonForLeaving: entry.reasonForLeaving ?? null,
          startDate: normalizeMonthInput(entry.startDate),
          endDate: normalizeMonthInput(entry.endDate),
          isEmployed: toBooleanFlag(entry.isEmployed),
        }))

        const backendTrainings = (profile.trainings || []).map((entry: StoredTraining) => ({
          trainingId: entry.trainingId || entry.id || createId(),
          trainingTitle: entry.trainingTitle || '',
          trainingDescription: entry.trainingDescription || '',
          trainingInstructor: entry.trainingInstructor || '',
          trainingDurationHours: entry.trainingDurationHours || '',
          completionDate: entry.completionDate || '',
        }))

        const backendCertificates = (profile.certificates || []).map((entry: StoredCertificate) => ({
          certificateId: entry.certificateId || entry.id || createId(),
          certificateName: entry.certificateName || '',
          issuingAuthority: entry.issuingAuthority || '',
          validityMonths: entry.validityMonths || '',
          dateIssued: entry.dateIssued || '',
        }))

        setApplicant((prev) => ({
          ...prev,
          ...profile,
          applicantId: profile.applicantId,
          hasCriminalHistory: profile.hasCriminalHistory ?? null,
        }))

        setEducation(backendEducation)
        setEmploymentHistory(backendEmployment)

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
              trainings: local?.trainings ?? application.trainings ?? backendTrainings,
              certificates: local?.certificates ?? application.certificates ?? backendCertificates,
            }
          })
        })

        setResumeSettingsMap(() => {
          const next: Record<string, ApplicationResumeSettings> = {}
          for (const application of response.data) {
            next[application.JobApplicationId] = {
              JobApplicationId: application.JobApplicationId,
              resumeTemplate: application.resumeTemplate || 'classic',
              previewFont: application.previewFont || 'Times New Roman',
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
  }, [authSession?.user.id, authSession?.token])

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
      void getResumeSettings(activeJobApplicationId, authSession.token)
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

  useEffect(() => {
    const profilePayload = buildProfileSyncPayload()
    const applicationPayload = buildApplicationSyncPayload()
    if (!profilePayload && !applicationPayload) {
      setValidationErrors([])
      return
    }

    const profileValidation = profilePayload
      ? validateApplicationPayload(profilePayload, ProfileSyncSchema)
      : { success: true, errors: [] as ValidationError[] }
    const applicationValidation = applicationPayload
      ? validateApplicationPayload(applicationPayload, ApplicationSyncSchema)
      : { success: true, errors: [] as ValidationError[] }
    setValidationErrors([
      ...(profileValidation.success ? [] : profileValidation.errors),
      ...(applicationValidation.success ? [] : applicationValidation.errors),
    ])
  }, [buildProfileSyncPayload, buildApplicationSyncPayload])

  // Explicit sync function - only called when user downloads PDF, exits to home, or on session recovery
  const syncCurrentApplication = async () => {
    const profilePayload = buildProfileSyncPayload()
    const applicationPayload = buildApplicationSyncPayload()
    if (!profilePayload && !applicationPayload) {
      return
    }

    try {
      if (profilePayload) {
        ProfileSyncSchema.parse(profilePayload)
        await syncApplicantProfile(profilePayload, authSession?.token)
      }
      if (applicationPayload) {
        ApplicationSyncSchema.parse(applicationPayload)
        const res = await syncApplication(applicationPayload, authSession?.token)
        // If backend returned reference ids for inserted/updated refs, map them into local state
        try {
          const responseData = res as {
            data?: {
              referenceIds?: Array<{ referenceEmail?: string | null; referenceId?: number | string }>
            }
          }
          const returned = responseData?.data?.referenceIds

          if (returned && returned.length > 0) {
            setJobApplications((prev) =>
              prev.map((app) => {
                if (app.JobApplicationId !== applicationPayload.jobApplication.JobApplicationId) return app
                const next = { ...app }
                next.references = (next.references || []).map((r) => {
                  const match = returned.find((x) => x.referenceEmail && x.referenceEmail === (r.referenceEmail || null))
                  if (match && match.referenceId) {
                    return { ...r, referenceId: match.referenceId }
                  }
                  return r
                })
                return next
              }),
            )
          }
        } catch {
          // non-fatal mapping error
        }
      }
    } catch (err) {
      console.warn('Validation failed for payload, aborting sync:', err)
      // if (err instanceof ZodError) {
      //   const messages = err.issues.map((issue) => issue.message).filter(Boolean)
      //   const messageBody = messages.length
      //     ? messages.join('\n')
      //     : 'Please fix the validation errors before syncing.'
      //   alert(messageBody)
      // } else {
      //   alert('Please fix the validation errors before syncing.')
      // }
      return
    }
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
      <Navbar authSession={authSession} onLogout={handleLogout} onNavigateRequest={handleNavbarNavigate} />

      {/* 2. Your main content area goes below it.
      */}
      <main className="app-content">
      {pendingNavigationTarget && profileNavigationGuard?.blocked ? (
        <div className="modal-backdrop center-align" role="dialog" aria-modal="true" aria-labelledby="profile-exit-title">
          <div className="modal">
            <h3 id="profile-exit-title">Finish this item first.</h3>
            <p>You have required fields left in the current item. Choose whether to fill them in or discard the item completely before leaving the page.</p>
            <div className="form-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => {
                  setPendingNavigationTarget(null)
                }}
              >
                Continue editing
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  void handleDiscardAndNavigate()
                }}
              >
                Discard current item
              </button>
            </div>
          </div>
        </div>
      ) : null}
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
                trainings={activeJobApplication?.trainings || []}
                certificates={activeJobApplication?.certificates || []}
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
                validationErrors={validationErrors}
                isValidationBlocked={isValidationBlocked}
                onDeleteJobApplication={deleteJobApplication}
                onSyncRequest={syncCurrentApplication}
                trainingDuplicateWarnings={trainingDuplicateWarnings}
                certificateDuplicateWarnings={certificateDuplicateWarnings}
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
        <Route
          path="/profile"
          element={
            authenticated ? (
              <ApplicantDetailsPage
                applicant={applicant}
                education={education}
                employmentHistory={employmentHistory}
                trainings={activeJobApplication?.trainings || []}
                certificates={activeJobApplication?.certificates || []}
                uploadState={uploadState}
                updateApplicant={updateApplicant}
                updateEducation={updateEducation}
                updateEmployment={updateEmployment}
                updateTraining={updateTraining}
                updateCertificate={updateCertificate}
                addEducation={addEducation}
                removeEducation={removeEducation}
                reorderEducation={reorderEducation}
                addEmployment={addEmployment}
                removeEmployment={removeEmployment}
                reorderEmployment={reorderEmployment}
                addTraining={addTraining}
                removeTraining={removeTraining}
                reorderTrainings={reorderTrainings}
                addCertificate={addCertificate}
                removeCertificate={removeCertificate}
                reorderCertificates={reorderCertificates}
                handleResumeUpload={handleResumeUpload}
                validationErrors={validationErrors}
                isValidationBlocked={isValidationBlocked}
                onSyncRequest={syncCurrentApplication}
                onNavigationGuardChange={handleProfileNavigationGuardChange}
                trainingDuplicateWarnings={trainingDuplicateWarnings}
                certificateDuplicateWarnings={certificateDuplicateWarnings}
              />
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
