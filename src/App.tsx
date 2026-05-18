import { useState } from 'react'
import './App.scss'
import ResumeAccordion from './components/ResumeAccordion'
import ResumePreview from './components/ResumePreview'
import type {
  Applicant,
  ApplicantReference,
  Education,
  EmploymentHistory,
  JobApplication,
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

const moveItem = <T,>(items: T[], fromIndex: number, toIndex: number) => {
  const next = [...items]
  const [moved] = next.splice(fromIndex, 1)
  next.splice(toIndex, 0, moved)
  return next
}

const starterApplicant = createEmptyApplicant()

function App() {
  const [applicant, setApplicant] = useState<Applicant>(starterApplicant)
  const [jobApplication, setJobApplication] = useState<JobApplication>(
    createEmptyApplication(starterApplicant.applicantId),
  )
  const [education, setEducation] = useState<Education[]>([
  ])
  const [employmentHistory, setEmploymentHistory] = useState<EmploymentHistory[]>([
  ])
  const [references, setReferences] = useState<ApplicantReference[]>([
  ])

  const [previewFont, setPreviewFont] = useState('Times New Roman')
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  const [uploadState, setUploadState] = useState({ uploading: false, message: '' })

  const linkApplicantId = (newApplicantId: string) => {
    setEducation((prev) => prev.map((item) => ({ ...item, applicantId: newApplicantId })))
    setEmploymentHistory((prev) => prev.map((item) => ({ ...item, applicantId: newApplicantId })))
    setReferences((prev) => prev.map((item) => ({ ...item, applicantId: newApplicantId })))
  }

  const updateApplicant = <K extends keyof Applicant>(key: K, value: Applicant[K]) => {
    setApplicant((prev) => {
      const next = { ...prev, [key]: value }
      if (key === 'applicantId') {
        linkApplicantId(String(value))
      }
      return next
    })
  }

  const updateApplication = <K extends keyof JobApplication>(
    key: K,
    value: JobApplication[K],
  ) => {
    setJobApplication((prev) => ({ ...prev, [key]: value }))
  }

  const updateEducation = (index: number, field: keyof Education, value: string) => {
    setEducation((prev) =>
      prev.map((item, current) => (current === index ? { ...item, [field]: value } : item)),
    )
  }

  const updateEmployment = (index: number, field: keyof EmploymentHistory, value: string) => {
    setEmploymentHistory((prev) =>
      prev.map((item, current) => (current === index ? { ...item, [field]: value } : item)),
    )
  }

  const updateReference = (index: number, field: keyof ApplicantReference, value: string) => {
    setReferences((prev) =>
      prev.map((item, current) => (current === index ? { ...item, [field]: value } : item)),
    )
  }

  const addEducation = () => {
    setEducation((prev) => [...prev, createEducation(applicant.applicantId)])
  }

  const addEmployment = () => {
    setEmploymentHistory((prev) => [...prev, createEmployment(applicant.applicantId)])
  }

  const addReference = () => {
    setReferences((prev) => [...prev, createReference(applicant.applicantId)])
  }

  const removeEducation = (index: number) => {
    setEducation((prev) => (prev.filter((_, current) => current !== index)))
  }

  const removeEmployment = (index: number) => {
    setEmploymentHistory((prev) =>
      prev.filter((_, current) => current !== index),
    )
  }

  const removeReference = (index: number) => {
    setReferences((prev) => (prev.filter((_, current) => current !== index)))
  }

  const reorderEducation = (fromIndex: number, toIndex: number) => {
    setEducation((prev) => moveItem(prev, fromIndex, toIndex))
  }

  const reorderEmployment = (fromIndex: number, toIndex: number) => {
    setEmploymentHistory((prev) => moveItem(prev, fromIndex, toIndex))
  }

  const reorderReferences = (fromIndex: number, toIndex: number) => {
    setReferences((prev) => moveItem(prev, fromIndex, toIndex))
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
    <div className="page-shell">
      <header className="topbar">
        <div>
          <h1>Applyr</h1>
        </div>
      </header>
      <div className="resume-shell">
        <section className="panel panel-scroll">
          <ResumeAccordion
            applicant={applicant}
            jobApplication={jobApplication}
            education={education}
            employmentHistory={employmentHistory}
            references={references}
            uploadState={uploadState}
            previewFont={previewFont}
            onPreviewFontChange={setPreviewFont}
            updateApplicant={updateApplicant}
            updateApplication={updateApplication}
            updateEducation={updateEducation}
            updateEmployment={updateEmployment}
            updateReference={updateReference}
            addEducation={addEducation}
            removeEducation={removeEducation}
            reorderEducation={reorderEducation}
            addEmployment={addEmployment}
            removeEmployment={removeEmployment}
            reorderEmployment={reorderEmployment}
            addReference={addReference}
            removeReference={removeReference}
            reorderReferences={reorderReferences}
            handleResumeUpload={handleResumeUpload}
          />
        </section>
        <section
          className="panel panel-scroll preview-panel"
          role="button"
          tabIndex={0}
          onClick={() => setIsPreviewOpen(true)}
          onKeyDown={(event) => {
            if (event.key === 'Enter' || event.key === ' ') {
              event.preventDefault()
              setIsPreviewOpen(true)
            }
          }}
        >
          <ResumePreview
            applicant={applicant}
            jobApplication={jobApplication}
            education={education}
            employmentHistory={employmentHistory}
            references={references}
            previewFont={previewFont}
          />
        </section>
      </div>

      {isPreviewOpen ? (
        <div className="preview-modal" onClick={() => setIsPreviewOpen(false)}>
          <div className="preview-modal-content" onClick={(event) => event.stopPropagation()}>
            <button
              type="button"
              className="preview-modal-close"
              onClick={() => setIsPreviewOpen(false)}
            >
              Close Preview
            </button>
            <ResumePreview
              applicant={applicant}
              jobApplication={jobApplication}
              education={education}
              employmentHistory={employmentHistory}
              references={references}
              previewFont={previewFont}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
