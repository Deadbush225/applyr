import { useEffect, useState } from 'react'
import { Navigate, Route, Routes } from 'react-router-dom'
import './App.scss'
import EditorPage from './pages/EditorPage'
import HomePage from './pages/HomePage'
import { updateApplication as syncApplication } from './services/applications'
import { loginUser, registerUser, type AuthSession } from './services/auth'
import type {
  Applicant,
  ApplicantReference,
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

const createTraining = (applicantId: string): Training => ({
  trainingId: createId(),
  trainingTitle: '',
  trainingDescription: '',
  trainingInstructor: '',
  trainingDurationHours: '',
})

const createCertificate = (applicantId: string): Certificate => ({
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
  const initialApplicant = loadStoredValue<Applicant>(storageKeys.applicant, starterApplicant)
  const rawJobApplications = loadStoredValue<JobApplication[]>(
    storageKeys.jobApplications,
    [createEmptyApplication(initialApplicant.applicantId)],
  )
  const initialJobApplications = rawJobApplications.map((application) => ({
    ...application,
    lastUpdated:
      application.lastUpdated ||
      application.JobApplicationDate ||
      new Date().toISOString(),
  }))

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
  const [references, setReferences] = useState<ApplicantReference[]>(
    loadStoredValue<ApplicantReference[]>(storageKeys.references, [
    {referenceId: createId(), applicantId: starterApplicant.applicantId, referenceName: 'John Doe', referenceTitle: 'Former Manager', referenceCompany: 'Acme Corp', referencePhone: '555-1234', referenceEmail: 'johndoe@acmecorp.com'},
    {referenceId: createId(), applicantId: starterApplicant.applicantId, referenceName: 'Jane Smith', referenceTitle: 'Colleague', referenceCompany: 'Globex Inc', referencePhone: '555-5678', referenceEmail: 'janesmith@globexinc.com'},
    {referenceId: createId(), applicantId: starterApplicant.applicantId, referenceName: 'Bob Johnson', referenceTitle: 'Professor', referenceCompany: 'State University', referencePhone: '555-9012', referenceEmail: 'bjohnson@stateuniversity.com'},
    {referenceId: createId(), applicantId: starterApplicant.applicantId, referenceName: 'Alice Williams', referenceTitle: 'Mentor', referenceCompany: 'Tech Institute', referencePhone: '555-3456', referenceEmail: 'awilliams@techinstitute.com'},
    ]),
  )

  const [trainings, setTrainings] = useState<Training[]>(
    loadStoredValue<Training[]>(storageKeys.trainings, [])
  )

  const [certificates, setCertificates] = useState<Certificate[]>(
    loadStoredValue<Certificate[]>(storageKeys.certificates, [])
  )

  const [previewFont, setPreviewFont] = useState(
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
    setReferences((prev) => prev.map((item) => ({ ...item, applicantId: newApplicantId })))
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

  const updateReference = (index: number, field: keyof ApplicantReference, value: string) => {
    setReferences((prev) =>
      prev.map((item, current) => (current === index ? { ...item, [field]: value } : item)),
    )
    touchActiveApplication()
  }

  const updateTraining = (index: number, field: keyof Training, value: string) => {
    setTrainings((prev) =>
      prev.map((item, current) => (current === index ? { ...item, [field]: value } : item)),
    )
    touchActiveApplication()
  }

  const updateCertificate = (index: number, field: keyof Certificate, value: string) => {
    setCertificates((prev) =>
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

  const addReference = () => {
    setReferences((prev) => [...prev, createReference(applicant.applicantId)])
    touchActiveApplication()
  }

  const addTraining = () => {
    setTrainings((prev) => [...prev, createTraining(applicant.applicantId)])
    touchActiveApplication()
  }

  const addCertificate = () => {
    setCertificates((prev) => [...prev, createCertificate(applicant.applicantId)])
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

  const removeReference = (index: number) => {
    setReferences((prev) => (prev.filter((_, current) => current !== index)))
    touchActiveApplication()
  }

  const removeTraining = (index: number) => {
    setTrainings((prev) => (prev.filter((_, current) => current !== index)))
    touchActiveApplication()
  }

  const removeCertificate = (index: number) => {
    setCertificates((prev) => (prev.filter((_, current) => current !== index)))
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

  const reorderReferences = (fromIndex: number, toIndex: number) => {
    setReferences((prev) => moveItem(prev, fromIndex, toIndex))
    touchActiveApplication()
  }

  const reorderTrainings = (fromIndex: number, toIndex: number) => {
    setTrainings((prev) => moveItem(prev, fromIndex, toIndex))
    touchActiveApplication()
  }

  const reorderCertificates = (fromIndex: number, toIndex: number) => {
    setCertificates((prev) => moveItem(prev, fromIndex, toIndex))
    touchActiveApplication()
  }

  const activeJobApplication =
    jobApplications.find((application) => application.JobApplicationId === activeJobApplicationId) ??
    jobApplications[0]

  const authenticated = Boolean(authSession?.token)

  const handleLogin = async (email: string, password: string) => {
    setAuthError('')
    setIsAuthLoading(true)
    try {
      const session = await loginUser(email, password)
      setAuthSession(session)
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
    window.localStorage.setItem(storageKeys.references, JSON.stringify(references))
  }, [references])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.trainings, JSON.stringify(trainings))
  }, [trainings])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.certificates, JSON.stringify(certificates))
  }, [certificates])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.previewFont, JSON.stringify(previewFont))
  }, [previewFont])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.resumeTemplate, JSON.stringify(resumeTemplate))
  }, [resumeTemplate])

  useEffect(() => {
    window.localStorage.setItem(storageKeys.authSession, JSON.stringify(authSession))
  }, [authSession])

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
    }

    const timeout = window.setTimeout(() => {
      void syncApplication(payload)
    }, 400)

    return () => window.clearTimeout(timeout)
  }, [applicant, activeJobApplication])

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
            references={references}
            trainings={trainings}
            certificates={certificates}
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
              references={references}
              trainings={trainings}
              certificates={certificates}
              uploadState={uploadState}
              previewFont={previewFont}
              resumeTemplate={resumeTemplate}
              onPreviewFontChange={(font) => { setPreviewFont(font); touchActiveApplication(); }}
              onResumeTemplateChange={(template) => { setResumeTemplate(template); touchActiveApplication(); }}
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
  )
}

export default App
