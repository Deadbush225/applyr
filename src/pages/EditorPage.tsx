import { useEffect, useState } from 'react'
import { Link, useNavigate, useParams } from 'react-router-dom'
import ResumeAccordion from '../components/ResumeAccordion'
import ResumePreview from '../components/ResumePreview'
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
  education: Education[]
  employmentHistory: EmploymentHistory[]
  uploadState: { uploading: boolean; message: string }
  previewFont: string
  resumeTemplate: 'classic' | 'compact' | 'modern'
  onPreviewFontChange: (fontFamily: string) => void
  onResumeTemplateChange: (template: 'classic' | 'compact' | 'modern') => void
  updateApplicant: <K extends keyof Applicant>(key: K, value: Applicant[K]) => void
  updateApplication: <K extends keyof JobApplication>(key: K, value: JobApplication[K]) => void
  updateEducation: (index: number, field: keyof Education, value: string) => void
  updateEmployment: (index: number, field: keyof EmploymentHistory, value: string) => void
  updateReference: (index: number, field: keyof ApplicantReference, value: string) => void
  updateTraining: (index: number, field: keyof Training, value: string) => void
  updateCertificate: (index: number, field: keyof Certificate, value: string) => void
  addEducation: () => void
  removeEducation: (index: number) => void
  reorderEducation: (fromIndex: number, toIndex: number) => void
  addEmployment: () => void
  removeEmployment: (index: number) => void
  reorderEmployment: (fromIndex: number, toIndex: number) => void
  addReference: () => void
  removeReference: (index: number) => void
  reorderReferences: (fromIndex: number, toIndex: number) => void
  addTraining: () => void
  removeTraining: (index: number) => void
  reorderTrainings: (fromIndex: number, toIndex: number) => void
  addCertificate: () => void
  removeCertificate: (index: number) => void
  reorderCertificates: (fromIndex: number, toIndex: number) => void
  handleResumeUpload: (file: File | null) => Promise<void>
}

const EditorPage = ({
  applicant,
  jobApplication,
  jobApplications,
  activeJobApplicationId,
  onJobApplicationChange,
  onAddJobApplication,
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
  addEducation,
  removeEducation,
  reorderEducation,
  addEmployment,
  removeEmployment,
  reorderEmployment,
  addReference,
  removeReference,
  reorderReferences,
  addTraining,
  removeTraining,
  reorderTrainings,
  addCertificate,
  removeCertificate,
  reorderCertificates,
  handleResumeUpload,
}: EditorPageProps) => {
  const { applicationId } = useParams()
  const navigate = useNavigate()
  const [isPreviewOpen, setIsPreviewOpen] = useState(false)

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
      <header className="topbar">
        <div>
          <p className="kicker">Application Builder</p>
        </div>
      </header>
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
