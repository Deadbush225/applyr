import { useEffect, useState, useRef } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import ResumeAccordion from '../components/ResumeAccordion'
import ResumePreview from '../components/ResumePreview'
import type { ValidationError } from '../utils/validation'
import type {
  Applicant,
  ApplicantReference,
  Education,
  EmploymentHistory,
  JobApplication,
  Training,
  Certificate,
} from '../types'

export type EditorPageProps = {
  applicant: Applicant
  jobApplication: JobApplication
  jobApplications: JobApplication[]
  activeJobApplicationId: string
  onJobApplicationChange: (jobApplicationId: string) => void
  onAddJobApplication: () => string
  onDeleteJobApplication: (jobApplicationId: string) => Promise<void>
  onSyncRequest?: () => Promise<void>
  education: Education[]
  employmentHistory: EmploymentHistory[]
  uploadState: { uploading: boolean; message: string }
  previewFont: string
  resumeTemplate: 'classic' | 'compact' | 'modern'
  onPreviewFontChange: (fontFamily: string) => void
  onResumeTemplateChange: (template: 'classic' | 'compact' | 'modern') => void
  updateApplicant: <K extends keyof Applicant>(key: K, value: Applicant[K]) => void
  updateApplication: <K extends keyof JobApplication>(key: K, value: JobApplication[K]) => void
  updateEducation: <K extends keyof Education>(index: number, field: K, value: Education[K]) => void
  updateEmployment: <K extends keyof EmploymentHistory>(index: number, field: K, value: EmploymentHistory[K]) => void
  updateReference: (index: number, field: keyof ApplicantReference, value: string) => void
  updateTraining: (index: number, field: keyof Training, value: string) => void
  updateCertificate: (index: number, field: keyof Certificate, value: string) => void
  addEducation: () => void
  removeEducation: (index: number) => Promise<void>
  reorderEducation: (fromIndex: number, toIndex: number) => void
  addEmployment: () => void
  removeEmployment: (index: number) => Promise<void>
  reorderEmployment: (fromIndex: number, toIndex: number) => void
  addReference: () => void
  removeReference: (index: number) => Promise<void>
  reorderReferences: (fromIndex: number, toIndex: number) => void
  addTraining: () => void
  removeTraining: (index: number) => Promise<void>
  reorderTrainings: (fromIndex: number, toIndex: number) => void
  addCertificate: () => void
  removeCertificate: (index: number) => Promise<void>
  reorderCertificates: (fromIndex: number, toIndex: number) => void
  handleResumeUpload: (file: File | null) => Promise<void>
  validationErrors: ValidationError[]
  isValidationBlocked: boolean
}

const EditorPage = ({
  applicant,
  jobApplication,
  jobApplications,
  activeJobApplicationId,
  onJobApplicationChange,
  onAddJobApplication,
  onDeleteJobApplication,
  onSyncRequest,
  education,
  employmentHistory,
  uploadState,
  previewFont,
  resumeTemplate,
  onPreviewFontChange,
  onResumeTemplateChange,
  updateApplicant,
  updateApplication,
  updateEducation,
  updateEmployment,
  updateReference,
  updateTraining,
  updateCertificate,
  // addEducation,
  // removeEducation,
  reorderEducation,
  // addEmployment,
  // removeEmployment,
  reorderEmployment,
  addReference,
  removeReference,
  reorderReferences,
  // addTraining,
  // removeTraining,
  reorderTrainings,
  // addCertificate,
  // removeCertificate,
  reorderCertificates,
  handleResumeUpload,
  validationErrors,
  isValidationBlocked,
}: EditorPageProps) => {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

  // 1. THE REF TRICK: Always hold the freshest save function without triggering React re-renders
  const syncRef = useRef(onSyncRequest)
  useEffect(() => {
    syncRef.current = onSyncRequest
  }, [onSyncRequest])

  const currentSyncSnapshot = (() => {
    try {
      return JSON.stringify({
        applicant,
        jobApplication,
        education,
        employmentHistory,
        previewFont,
        resumeTemplate,
      })
    } catch {
      return null
    }
  })()

  const lastSyncedSnapshotRef = useRef<string | null>(currentSyncSnapshot)

  const handleDeleteJobApplication = async (jobApplicationId: string) => {
    await onDeleteJobApplication(jobApplicationId)
    await syncRef.current?.()
    navigate('/', { replace: true })
  }

  // 2. TRUE UNMOUNT SAVE: Empty dependency array means this ONLY runs when leaving the page
  useEffect(() => {
    return () => {
      syncRef.current?.().catch(console.error)
    }
  }, [])

  // 3. SMART AUTO-SAVE: Debounces network requests by 2 seconds
  useEffect(() => {
    let cancelled = false
    let timer: ReturnType<typeof setTimeout> | null = null

    if (currentSyncSnapshot && currentSyncSnapshot !== lastSyncedSnapshotRef.current) {
      timer = setTimeout(async () => {
        if (cancelled || !jobApplication?.JobApplicationId) {
          return
        }

        try {
          await syncRef.current?.()
          lastSyncedSnapshotRef.current = currentSyncSnapshot
        } catch (error) {
          console.error(error)
        }
      }, 2000)
    } else if (!currentSyncSnapshot) {
      // Fall back to the old behavior if serialization fails for any reason.
      timer = setTimeout(() => {
        if (jobApplication?.JobApplicationId) {
          syncRef.current?.().catch(console.error)
        }
      }, 2000)
    }

    return () => {
      cancelled = true
      if (timer) {
        clearTimeout(timer)
      }
    }
  }, [
    currentSyncSnapshot,
    applicant, 
    jobApplication, 
    education, 
    employmentHistory, 
    previewFont, 
    resumeTemplate
  ])

  useEffect(() => {
    if (!applicationId) {
      return
    }
    onJobApplicationChange(applicationId)
  }, [applicationId, onJobApplicationChange])

  useEffect(() => {
    if (!applicationId && activeJobApplicationId) {
      navigate(`/editor/${activeJobApplicationId}`, { replace: true })
    }
  }, [applicationId, activeJobApplicationId, navigate])

  return (
    <div className="page-shell">
      <div className="resume-shell">
        <section className="panel panel-scroll">
          <ResumeAccordion
            applicant={applicant}
            jobApplication={jobApplication}
            jobApplications={jobApplications}
            activeJobApplicationId={activeJobApplicationId}
            onJobApplicationChange={(id) => navigate(`/editor/${id}`)}
            onAddJobApplication={() => {
              const nextId = onAddJobApplication()
              navigate(`/editor/${nextId}`)
              return nextId
            }}
            education={education}
            employmentHistory={employmentHistory}
            references={jobApplication.references || []}
            trainings={jobApplication.trainings || []}
            certificates={jobApplication.certificates || []}
            uploadState={uploadState}
            previewFont={previewFont}
            onPreviewFontChange={onPreviewFontChange}
            resumeTemplate={resumeTemplate}
            onResumeTemplateChange={onResumeTemplateChange}
            updateApplicant={updateApplicant}
            updateApplication={updateApplication}
            updateEducation={updateEducation}
            updateEmployment={updateEmployment}
            updateReference={updateReference}
            updateTraining={updateTraining}
            updateCertificate={updateCertificate}
            // addEducation={addEducation}
            // removeEducation={removeEducation}
            reorderEducation={reorderEducation}
            // addEmployment={addEmployment}
            // removeEmployment={removeEmployment}
            reorderEmployment={reorderEmployment}
            addReference={addReference}
            removeReference={removeReference}
            reorderReferences={reorderReferences}
            // addTraining={addTraining}
            // removeTraining={removeTraining}
            reorderTrainings={reorderTrainings}
            // addCertificate={addCertificate}
            // removeCertificate={removeCertificate}
            reorderCertificates={reorderCertificates}
            handleResumeUpload={handleResumeUpload}
            onDeleteJobApplication={handleDeleteJobApplication}
            onSyncRequest={onSyncRequest}
            validationErrors={validationErrors}
            isValidationBlocked={isValidationBlocked}
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
            references={jobApplication.references || []}
            trainings={jobApplication.trainings || []}
            certificates={jobApplication.certificates || []}
            previewFont={previewFont}
            resumeTemplate={resumeTemplate}
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
              references={jobApplication.references || []}
              trainings={jobApplication.trainings || []}
              certificates={jobApplication.certificates || []}
              previewFont={previewFont}
              resumeTemplate={resumeTemplate}
            />
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default EditorPage