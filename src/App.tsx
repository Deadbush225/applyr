import { useEffect, useState } from 'react'
import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom'
import './App.scss'
import EditorPage from './pages/EditorPage'
import HomePage from './pages/HomePage'
import Navbar from './components/Navbar'
import { updateApplication as syncApplication, getResumeSettings } from './services/applications'
import { loginUser, registerUser, type AuthSession } from './services/auth'
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
  yearsAttended: '',
  degreeReceived: '',
  programName: '',
})

const createEmployment = (applicantId: string): EmploymentHistory => ({
  EmploymentHistoryId: createId(),
  applicantId,
  companyName: '',
  workAddress: '',
  workPosition: '',
  reasonForLeaving: '',
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
})

const createCertificate = (): Certificate => ({
  certificateId: createId(),
  certificateName: '',
  issuingAuthority: '',
  validityMonths: '',
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

function App() {
  const rawApplicant = loadStoredValue<any>(storageKeys.applicant, starterApplicant)
  const initialApplicant: Applicant = {
    ...starterApplicant,
    ...rawApplicant,
    applicantId: rawApplicant.applicantId || (rawApplicant as any).id || starterApplicant.applicantId,
  }

  const rawJobApplications = loadStoredValue<any[]>(
    storageKeys.jobApplications,
    [createEmptyApplication(initialApplicant.applicantId)],
  )
  const initialJobApplications = rawJobApplications.map((application, i) => { const defaultApp = createEmptyApplication(initialApplicant.applicantId); return { ...defaultApp, ...application, JobApplicationId: application.JobApplicationId || (application as any).id || defaultApp.JobApplicationId, applicantId: initialApplicant.applicantId, 
    ...application,
    references: application.references ?? (i === 0 ? loadStoredValue<ApplicantReference[]>(storageKeys.references, [
      {referenceId: createId(), applicantId: initialApplicant.applicantId, referenceName: 'John Doe', referenceTitle: 'Former Manager', referenceCompany: 'Acme Corp', referencePhone: '555-1234', referenceEmail: 'johndoe@acmecorp.com'},
      {referenceId: createId(), applicantId: initialApplicant.applicantId, referenceName: 'Jane Smith', referenceTitle: 'Colleague', referenceCompany: 'Globex Inc', referencePhone: '555-5678', referenceEmail: 'janesmith@globexinc.com'},
      {referenceId: createId(), applicantId: initialApplicant.applicantId, referenceName: 'Bob Johnson', referenceTitle: 'Professor', referenceCompany: 'State University', referencePhone: '555-9012', referenceEmail: 'bjohnson@stateuniversity.com'},
      {referenceId: createId(), applicantId: initialApplicant.applicantId, referenceName: 'Alice Williams', referenceTitle: 'Mentor', referenceCompany: 'Tech Institute', referencePhone: '555-3456', referenceEmail: 'awilliams@techinstitute.com'},
    ]) : []),
    trainings: application.trainings ?? (i === 0 ? loadStoredValue<Training[]>(storageKeys.trainings, []) : []),
    certificates: application.certificates ?? (i === 0 ? loadStoredValue<Certificate[]>(storageKeys.certificates, []) : []),
    lastUpdated:
      application.lastUpdated ||
      application.JobApplicationDate ||
      new Date().toISOString(),
  }})

  const [applicant, setApplicant] = useState<Applicant>(initialApplicant)
  const [jobApplications, setJobApplications] =
    useState<JobApplication[]>(initialJobApplications)
  const [activeJobApplicationId, setActiveJobApplicationId] = useState(
    loadStoredValue<string>(
      storageKeys.activeJobApplicationId,
      initialJobApplications[0].JobApplicationId,
    ),
  )
  const [education, setEducation] = useState<Education[]>(
    loadStoredValue<Education[]>(storageKeys.education, [
    {educationId: createId(), applicantId: starterApplicant.applicantId, schoolName: 'State University', schoolLocation: 'Anytown, USA', yearsAttended: '2015-2019', degreeReceived: 'Bachelor of Science', programName: 'Computer Science'},
    {educationId: createId(), applicantId: starterApplicant.applicantId, schoolName: 'Tech Institute', schoolLocation: 'Othertown, USA', yearsAttended: '2019-2021', degreeReceived: 'Master of Science', programName: 'Software Engineering'},
    {educationId: createId(), applicantId: starterApplicant.applicantId, schoolName: 'Community College', schoolLocation: 'Sometown, USA', yearsAttended: '2013-2015', degreeReceived: 'Associate Degree', programName: 'Information Technology'},
    {educationId: createId(), applicantId: starterApplicant.applicantId, schoolName: 'Online University', schoolLocation: 'Online', yearsAttended: '2020-2022', degreeReceived: 'Certificate', programName: 'Data Science'},
    {educationId: createId(), applicantId: starterApplicant.applicantId, schoolName: 'Business School', schoolLocation: 'Anycity, USA', yearsAttended: '2018-2020', degreeReceived: 'MBA', programName: 'Business Administration'},
    {educationId: createId(), applicantId: starterApplicant.applicantId, schoolName: 'Design Academy', schoolLocation: 'Othercity, USA', yearsAttended: '2012-2014', degreeReceived: 'Diploma', programName: 'Graphic Design'},
    ]),
  )
  const [employmentHistory, setEmploymentHistory] = useState<EmploymentHistory[]>(
    loadStoredValue<EmploymentHistory[]>(storageKeys.employmentHistory, [
    {EmploymentHistoryId: createId(), applicantId: starterApplicant.applicantId, companyName: 'Acme Corp', workAddress: '123 Main St, Anytown, USA', workPosition: 'Software Engineer', reasonForLeaving: 'Seeking new challenges'},
    {EmploymentHistoryId: createId(), applicantId: starterApplicant.applicantId, companyName: 'Globex Inc', workAddress: '456 Elm St, Othertown, USA', workPosition: 'Junior Developer', reasonForLeaving: 'Career growth opportunities'},
    {EmploymentHistoryId: createId(), applicantId: starterApplicant.applicantId, companyName: 'Initech', workAddress: '789 Oak St, Sometown, USA', workPosition: 'Intern', reasonForLeaving: 'Internship ended'},
    {EmploymentHistoryId: createId(), applicantId: starterApplicant.applicantId, companyName: 'Umbrella Corp', workAddress: '321 Pine St, Anycity, USA', workPosition: 'QA Tester', reasonForLeaving: 'Company downsizing'},
    {EmploymentHistoryId: createId(), applicantId: starterApplicant.applicantId, companyName: 'Hooli', workAddress: '654 Maple St, Othercity, USA', workPosition: 'Product Manager', reasonForLeaving: 'Relocation'},
    {EmploymentHistoryId: createId(), applicantId: starterApplicant.applicantId, companyName: 'Vehement Capital Partners', workAddress: '987 Cedar St, Somecity, USA', workPosition: 'Business Analyst', reasonForLeaving: 'Pursuing further education'},
    ]),
  )


  // Store settings per JobApplicationId
  const [resumeSettingsMap, setResumeSettingsMap] = useState<Record<string, ApplicationResumeSettings>>(
    loadStoredValue<Record<string, ApplicationResumeSettings>>(storageKeys.resumeSettings, {}),
  )

  // Current settings for the active application (fallback to defaults)
  const [previewFont, setPreviewFont] = useState<string>(
    loadStoredValue<string>(storageKeys.previewFont, 'Times New Roman'),
  )
  const [resumeTemplate, setResumeTemplate] = useState<ResumeTemplateId>(
    loadStoredValue<ResumeTemplateId>(storageKeys.resumeTemplate, 'classic'),
  )

  const [uploadState, setUploadState] = useState({ uploading: false, message: '' })
  const [authSession, setAuthSession] = useState<AuthSession | null>(
    loadStoredValue<AuthSession | null>(storageKeys.authSession, null),
  )
  const [authError, setAuthError] = useState('')
  const [isAuthLoading, setIsAuthLoading] = useState(false)

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
      const session = await registerUser(name, email, password)
      setAuthSession(session)
      setApplicant((prev) => ({ ...prev, applicantId: session.user.id }))

    } catch (error) {
      setAuthError(error instanceof Error ? error.message : 'Signup failed')
    } finally {
      setIsAuthLoading(false)
    }
  }

  const handleLogout = () => {
    setAuthSession(null)
  }

  useEffect(() => {
    if (!jobApplications.some((application) => application.JobApplicationId === activeJobApplicationId)) {
      setActiveJobApplicationId(jobApplications[0]?.JobApplicationId ?? '')
    }
  }, [jobApplications, activeJobApplicationId])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.applicant, JSON.stringify(applicant))
  }, [applicant])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.jobApplications, JSON.stringify(jobApplications))
  }, [jobApplications])

  useEffect(() => {
    window.localStorage.setItem(
      storageKeys.activeJobApplicationId,
      JSON.stringify(activeJobApplicationId),
    )
  }, [activeJobApplicationId])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.education, JSON.stringify(education))
  }, [education])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.employmentHistory, JSON.stringify(employmentHistory))
  }, [employmentHistory])



  useEffect(() => {
    window.localStorage.setItem(storageKeys.previewFont, JSON.stringify(previewFont))
  }, [previewFont])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.resumeTemplate, JSON.stringify(resumeTemplate))
  }, [resumeTemplate])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.resumeSettings, JSON.stringify(resumeSettingsMap))
  }, [resumeSettingsMap])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.authSession, JSON.stringify(authSession))
  }, [authSession])

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

  useEffect(() => {
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
      resumeSettings: {
        JobApplicationId: activeJobApplicationId,
        resumeTemplate,
        previewFont,
      },
    }

    const timeout = window.setTimeout(() => {
      void syncApplication(payload)
    }, 400)

    return () => window.clearTimeout(timeout)
  }, [applicant, activeJobApplication, previewFont, resumeTemplate, activeJobApplicationId, education, employmentHistory])

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
            <HomePage
              applicant={applicant}
              jobApplications={jobApplications}
              activeJobApplicationId={activeJobApplicationId}
              resumeTemplate={resumeTemplate}
              previewFont={previewFont}
              education={education}
              employmentHistory={employmentHistory}
              authSession={authSession}
              isAuthLoading={isAuthLoading}
              authError={authError}
              onLogin={handleLogin}
              onSignup={handleSignup}
              onLogout={handleLogout}
              onAddJobApplication={addJobApplication}
            />
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
              />
            ) : (
              <Navigate to="/" replace />
            )
          }
        />
      </Routes>
      </main>
    </div>
  )
}

export default App
