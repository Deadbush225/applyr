import { useState, useEffect, useRef, type Dispatch, type SetStateAction } from 'react'
import type { DragEvent } from 'react'
import type {
  Applicant,
  ApplicantReference,
  Education,
  EmploymentHistory,
  JobApplication,
  Training,
  Certificate,
} from '../types'
import {Accordion, SectionRow} from './Accordion'
import type { ValidationError } from '../utils/validation'

type UploadState = {
  uploading: boolean
  message: string
}

type ActivePanel =
  | { type: 'list' }
  | { type: 'template' }
  | { type: 'contact' }
  | { type: 'education'; index: number }
  | { type: 'employment'; index: number }
  | { type: 'reference'; index: number }
  | { type: 'training'; index: number }
  | { type: 'certificate'; index: number }
  | { type: 'compliance' }

type ResumeAccordionProps = {
  applicant: Applicant
  jobApplication: JobApplication
  jobApplications: JobApplication[]
  activeJobApplicationId: string
  onJobApplicationChange: (jobApplicationId: string) => void
  onAddJobApplication: () => string
  education: Education[]
  employmentHistory: EmploymentHistory[]
  references: ApplicantReference[]
  trainings: Training[]
  certificates: Certificate[]
  uploadState: UploadState
  previewFont: string
  onPreviewFontChange: (fontFamily: string) => void
  resumeTemplate: 'classic' | 'compact' | 'modern'
  onResumeTemplateChange: (template: 'classic' | 'compact' | 'modern') => void
  updateApplicant: <K extends keyof Applicant>(key: K, value: Applicant[K]) => void
  updateApplication: <K extends keyof JobApplication>(key: K, value: JobApplication[K]) => void
  updateEducation: <K extends keyof Education>(index: number, field: K, value: Education[K]) => void
  updateEmployment: <K extends keyof EmploymentHistory>(index: number, field: K, value: EmploymentHistory[K]) => void
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
  onDeleteJobApplication: (jobApplicationId: string) => Promise<void>
  validationErrors: ValidationError[]
  isValidationBlocked: boolean
}

// Custom hook to sync state with localStorage
function useStickyState<T>(defaultValue: T[], key: string): [T[], Dispatch<SetStateAction<T[]>>] {
  const [value, setValue] = useState<T[]>(() => {
    const stickyValue = window.localStorage.getItem(key);
    return stickyValue !== null ? JSON.parse(stickyValue) : defaultValue;
  });

  useEffect(() => {
    window.localStorage.setItem(key, JSON.stringify(value));
  }, [key, value]);

  return [value, setValue];
}

import ResumePDF from './ResumePDF';
import SmartCombobox from './SmartCombobox'
import { PDFDownloadLink } from '@react-pdf/renderer';

type ResumeAccordionPropsWithSync = ResumeAccordionProps & {
  onSyncRequest?: () => Promise<void>
}

const ResumeAccordion = ({
  applicant,
  jobApplication,
  jobApplications,
  activeJobApplicationId,
  onJobApplicationChange,
  onAddJobApplication,
  education,
  employmentHistory,
  references,
  trainings,
  certificates,
  uploadState,
  previewFont,
  onPreviewFontChange,
  resumeTemplate,
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
  onDeleteJobApplication,
  validationErrors,
  isValidationBlocked,
  onSyncRequest,
}: ResumeAccordionPropsWithSync) => {
  const today = new Date().toISOString().split('T')[0]
  const formatEducationRange = (entry: Education) => {
    if (!entry.startYear && !entry.endYear && !entry.isCurrent) return ''
    const endLabel = entry.isCurrent ? 'Present' : (entry.endYear || '')
    if (entry.startYear && endLabel) return `${entry.startYear} - ${endLabel}`
    return entry.startYear || endLabel
  }
  const formatEmploymentRange = (entry: EmploymentHistory) => {
    if (!entry.startDate && !entry.endDate && !entry.isEmployed) return ''
    const endLabel = entry.isEmployed ? 'Present' : (entry.endDate || '')
    if (entry.startDate && endLabel) return `${entry.startDate} - ${endLabel}`
    return entry.startDate || endLabel
  }
  const formatEducationTitle = (entry: Education, index: number) => {
    if (entry.degreeReceived) {
      const program = entry.programName ? ` in ${entry.programName}` : ''
      const school = entry.schoolName ? ` at ${entry.schoolName}` : ''
      return `${entry.degreeReceived}${program}${school}`
    }
    return entry.schoolName || `Education ${index + 1}`
  }
  const certificateErrors = validationErrors.filter((err) => err.path[0] === 'certificates')
  const certificateErrorMessages = certificateErrors.map((err) => err.message)
  const trainingErrors = validationErrors.filter((err) => err.path[0] === 'trainings')
  const trainingErrorMessages = trainingErrors.map((err) => err.message)
  const [activePanel, setActivePanel] = useState<ActivePanel>({ type: 'list' })
  const [dragEducationIndex, setDragEducationIndex] = useState<number | null>(null)
  const [dragEmploymentIndex, setDragEmploymentIndex] = useState<number | null>(null)
  const [dragReferenceIndex, setDragReferenceIndex] = useState<number | null>(null)
  const [dragTrainingIndex, setDragTrainingIndex] = useState<number | null>(null)
  const [dragCertificateIndex, setDragCertificateIndex] = useState<number | null>(null)
  const [isSyncing, setIsSyncing] = useState(false)
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const pdfLinkRef = useRef<any>(null)
  const [showAgreeModal, setShowAgreeModal] = useState(false)

  // Handle PDF download with sync - ensure data is saved before downloading
  const handlePDFDownload = async () => {
    // Always show the confirmation modal before downloading.
    // The modal handler will update `agreedToTerms` and `dateAgreed`,
    // call the provided `onSyncRequest` to persist to the backend,
    // and then trigger the programmatic PDF download.
    setShowAgreeModal(true)
  }

  const handleDragStart = (
    setter: (value: number | null) => void,
    index: number,
    event: DragEvent<HTMLButtonElement>,
  ) => {
    setter(index)
    event.dataTransfer.effectAllowed = 'move'
  }

  const handleDragEnd = (setter: (value: number | null) => void) => {
    setter(null)
  }

  const handleDrop = (
    fromIndex: number | null,
    toIndex: number,
    reorder: (from: number, to: number) => void,
    setter: (value: number | null) => void,
  ) => {
    if (fromIndex === null || fromIndex === toIndex) {
      return
    }
    reorder(fromIndex, toIndex)
    setter(null)
  }

  const openEducation = (index: number) => setActivePanel({ type: 'education', index })
  const openEmployment = (index: number) => setActivePanel({ type: 'employment', index })
  const openReference = (index: number) => setActivePanel({ type: 'reference', index })
  const openTraining = (index: number) => setActivePanel({ type: 'training', index })
  const openCertificate = (index: number) => setActivePanel({ type: 'certificate', index })

  const [openSections, setOpenSections] = useStickyState<string>([], 'accordion-open-sections');

  const toggleSection = (section: string) => {
    setOpenSections((prev: string[]) =>
      {
        if (prev.includes(section)) {
          return prev.filter((s) => s !== section)
        } else {
          return [...prev, section]
        }
      }
    );
  }

  const renderList = () => (
    <div className="section-list" aria-label="Resume sections">
      <div className="section-group">
        <h3 className="section-group-title">Resume Builder</h3>
        <Accordion title="Resume Template" subtitle="Choose your resume template" onToggle={() => toggleSection('template')} isOpen={openSections.includes('template')}>
          <div className="form-grid">
            <label>
              Job Application
              <div className="inline-input">
                <select
                  value={activeJobApplicationId}
                  onChange={(event) => onJobApplicationChange(event.target.value)}
                >
                  {jobApplications.map((application, index) => (
                    <option key={application.JobApplicationId} value={application.JobApplicationId}>
                      {application.appliedPosition || `Application ${index + 1}`}
                    </option>
                  ))}
                </select>
                <button type="button" className="add-button" onClick={onAddJobApplication}>
                  + Add
                </button>
              </div>
            </label>
            <label>
              Resume Font
              <select value={previewFont} onChange={(event) => onPreviewFontChange(event.target.value)}>
                <option value="Times New Roman">Times New Roman</option>
                <option value="Georgia">Georgia</option>
                <option value="Garamond">Garamond</option>
                <option value="Arial">Arial</option>
                <option value="Calibri">Calibri</option>
              </select>
            </label>
            <label>
              Template Style
              <select
                value={resumeTemplate}
                onChange={(event) =>
                  onResumeTemplateChange(event.target.value as 'classic' | 'compact' | 'modern')
                }
              >
                <option value="classic">Classic</option>
                <option value="compact">Compact</option>
                <option value="modern">Modern</option>
              </select>
            </label>
          </div>
        </Accordion>
      {showAgreeModal ? (
        <div className="modal-backdrop left-align">
          <div className="modal modal--shift-left resume-confirm-modal">
            <h3>Confirm Terms</h3>
            <p>By downloading this resume you confirm that the information contained is truthful and accurate. Do you agree?</p>
            <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12 }}>
              <button type="button" className="outline-button" onClick={() => setShowAgreeModal(false)}>Cancel</button>
              <button
                type="button"
                className="primary-button"
                onClick={async () => {
                  // mark agreed locally, sync and then trigger download
                  updateApplication('agreedToTerms', true)
                  updateApplication('dateAgreed', new Date().toISOString())
                  setShowAgreeModal(false)
                  setIsSyncing(true)
                  try {
                    await onSyncRequest?.()
                    if (pdfLinkRef.current) pdfLinkRef.current.click()
                  } finally {
                    setIsSyncing(false)
                  }
                }}
              >
                I agree
              </button>
            </div>
          </div>
        </div>
      ) : null}

        <Accordion
          title="Application Settings"
          subtitle="Status, dates, and removal"
          onToggle={() => toggleSection('application-settings')}
          isOpen={openSections.includes('application-settings')}
        >
          <div className="form-grid">
            <label>
              <p className='required-asterisk'>
              Application Status</p>
              <select
                value={jobApplication.JobApplicationStatus || 'Pending'}
                onChange={(event) => updateApplication('JobApplicationStatus', event.target.value)}
              >
                <option value="Pending">Pending</option>
                <option value="Under Review">Under Review</option>
                <option value="Interview">Interview</option>
                <option value="Offered">Offered</option>
                <option value="Rejected">Rejected</option>
                <option value="Withdrawn">Withdrawn</option>
              </select>
            </label>

            <label>
              <p className="required-asterisk">
              Application Date 
              </p>
              <input
                type="date"
                value={jobApplication.JobApplicationDate || ''}
                max={today}
                onChange={(event) => updateApplication('JobApplicationDate', event.target.value)}
              />
            </label>

            <div className="form-actions">
              <button
                type="button"
                className="delete-button"
                onClick={() => {
                  if (confirm('Are you sure you want to delete this application? This action cannot be undone.')) {
                    void onDeleteJobApplication(jobApplication.JobApplicationId)
                  }
                }}
              >
                Delete Application
              </button>
            </div>
          </div>
        </Accordion>
    
        <SectionRow
          title="Contact Info"
          subtitle="Name, address, and position"
          callback={() => setActivePanel({ type: 'contact' })}
        />

        <Accordion title="Education" subtitle="Schools and degrees" onToggle={() => toggleSection('education')} isOpen={openSections.includes('education')}>
          <div>
        {education.map((entry, index) => (
          <div
            className={`section-row${dragEducationIndex === index ? ' is-dragging' : ''}`}
            key={entry.educationId}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(dragEducationIndex, index, reorderEducation, setDragEducationIndex)}
          >
            <button
              type="button"
              className="row-handle"
              aria-label={`Reorder education ${index + 1}`}
              draggable
              onDragStart={(event) => handleDragStart(setDragEducationIndex, index, event)}
              onDragEnd={() => handleDragEnd(setDragEducationIndex)}
            >
              ☰
            </button>
            <button type="button" className="row-main" onClick={() => openEducation(index)}>
              <span className="row-title">{formatEducationTitle(entry, index)}</span>
              <span className="row-subtitle">{formatEducationRange(entry) || 'Years not set'}</span>
            </button>
            <button type="button" className="row-remove" onClick={() => removeEducation(index)}>
              Remove
            </button>
          </div>
        ))}
            <button type="button" className="add-button small" onClick={() =>{addEducation(); setActivePanel({ type: 'education', index: education.length })}}>
              + Add
            </button>
          </div>
        </Accordion>
    
      <Accordion title="Employment" subtitle="Work and experiences" onToggle={() => toggleSection('employment')} isOpen={openSections.includes('employment')}>
        {employmentHistory.map((entry, index) => (
          <div
          className={`section-row${dragEmploymentIndex === index ? ' is-dragging' : ''}`}
          key={entry.EmploymentHistoryId}
          onDragOver={(event) => event.preventDefault()}
          onDrop={() => handleDrop(dragEmploymentIndex, index, reorderEmployment, setDragEmploymentIndex)}
          >
            <button
              type="button"
              className="row-handle"
              aria-label={`Reorder employment ${index + 1}`}
              draggable
              onDragStart={(event) => handleDragStart(setDragEmploymentIndex, index, event)}
              onDragEnd={() => handleDragEnd(setDragEmploymentIndex)}
              >
              ☰
            </button>
            <button type="button" className="row-main" onClick={() => openEmployment(index)}>
              <span className="row-title">{entry.companyName || `Employment ${index + 1}`}</span>
              <span className="row-subtitle">
                {entry.workPosition || 'Role'}
                {formatEmploymentRange(entry) ? ` • ${formatEmploymentRange(entry)}` : ''}
              </span>
            </button>
            <button type="button" className="row-remove" onClick={() => removeEmployment(index)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="add-button small" onClick={() => { addEmployment(); setActivePanel({ type: 'employment', index: employmentHistory.length }); }}>
            + Add
          </button>
      </Accordion>

      <Accordion title="References" subtitle="People who can vouch for your character" onToggle={() => toggleSection('references')} isOpen={openSections.includes('references')}>
        {references.map((entry, index) => (
          <div
            className={`section-row${dragReferenceIndex === index ? ' is-dragging' : ''}`}
            key={entry.referenceId}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(dragReferenceIndex, index, reorderReferences, setDragReferenceIndex)}
          >
            <button
              type="button"
              className="row-handle"
              aria-label={`Reorder reference ${index + 1}`}
              draggable
              onDragStart={(event) => handleDragStart(setDragReferenceIndex, index, event)}
              onDragEnd={() => handleDragEnd(setDragReferenceIndex)}
            >
              ☰
            </button>
            <button type="button" className="row-main" onClick={() => openReference(index)}>
              <span className="row-title">{entry.referenceName || `Reference ${index + 1}`}</span>
              <span className="row-subtitle">{entry.referenceCompany || 'Company'}</span>
            </button>
            <button type="button" className="row-remove" onClick={() => removeReference(index)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="add-button small" onClick={() => { addReference(); setActivePanel({ type: 'reference', index: references.length }); }}>
            + Add
          </button>
      </Accordion>

      <Accordion title="Trainings" subtitle="Workshops and courses" onToggle={() => toggleSection('trainings')} isOpen={openSections.includes('trainings')}>
        {trainings.map((entry, index) => (
          <div
            className={`section-row${dragTrainingIndex === index ? ' is-dragging' : ''}`}
            key={`${entry.trainingId || 'training'}-${index}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(dragTrainingIndex, index, reorderTrainings, setDragTrainingIndex)}
          >
            <button
              type="button"
              className="row-handle"
              aria-label={`Reorder training ${index + 1}`}
              draggable
              onDragStart={(event) => handleDragStart(setDragTrainingIndex, index, event)}
              onDragEnd={() => handleDragEnd(setDragTrainingIndex)}
            >
              ☰
            </button>
            <button type="button" className="row-main" onClick={() => openTraining(index)}>
              <span className="row-title">{entry.trainingTitle || `Training ${index + 1}`}</span>
              <span className="row-subtitle">{entry.trainingInstructor || 'Instructor'}</span>
            </button>
            <button type="button" className="row-remove" onClick={() => removeTraining(index)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="add-button small" onClick={() => { addTraining(); setActivePanel({ type: 'training', index: trainings.length }); }}>
          + Add
        </button>
      </Accordion>

      <Accordion title="Certificates" subtitle="Accreditations and achievements" onToggle={() => toggleSection('certificates')} isOpen={openSections.includes('certificates')}>
        {certificates.map((entry, index) => (
          <div
            className={`section-row${dragCertificateIndex === index ? ' is-dragging' : ''}`}
            key={`${entry.certificateId || 'certificate'}-${index}`}
            onDragOver={(event) => event.preventDefault()}
            onDrop={() => handleDrop(dragCertificateIndex, index, reorderCertificates, setDragCertificateIndex)}
          >
            <button
              type="button"
              className="row-handle"
              aria-label={`Reorder certificate ${index + 1}`}
              draggable
              onDragStart={(event) => handleDragStart(setDragCertificateIndex, index, event)}
              onDragEnd={() => handleDragEnd(setDragCertificateIndex)}
            >
              ☰
            </button>
            <button type="button" className="row-main" onClick={() => openCertificate(index)}>
              <span className="row-title">{entry.certificateName || `Certificate ${index + 1}`}</span>
              <span className="row-subtitle">{entry.issuingAuthority || 'Authority'}</span>
            </button>
            <button type="button" className="row-remove" onClick={() => removeCertificate(index)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="add-button small" onClick={() => { addCertificate(); setActivePanel({ type: 'certificate', index: certificates.length }); }}>
          + Add
        </button>
      </Accordion>

      <SectionRow
          title="Compliance & Upload"
          subtitle="Agreements and resume file"
          callback={() => setActivePanel({ type: 'compliance' })}
        />

      <Accordion title="Download" onToggle={() => toggleSection('download')} isOpen={openSections.includes('download')}>
        <div style={{ padding: '16px 0', display: 'flex', flexDirection: 'column', gap: '12px' }}>
          <p style={{ margin: 0, fontSize: '0.95rem', color: 'var(--text-muted)' }}>
            Download your resume as a PDF file. The document will be generated locally.
          </p>
          <button
            type="button"
            className="primary-button"
            style={{
              alignSelf: 'flex-start',
              opacity: isSyncing || isValidationBlocked ? 0.5 : 1,
              cursor: isSyncing || isValidationBlocked ? 'not-allowed' : 'pointer',
            }}
            onClick={handlePDFDownload}
            disabled={isSyncing || isValidationBlocked}
          >
            {isSyncing ? 'Syncing & Generating PDF...' : 'Download PDF'}
          </button>
          {/* Hidden PDFDownloadLink - triggered programmatically after sync */}
          <div style={{ display: 'none' }}>
            <PDFDownloadLink
              ref={pdfLinkRef}
              key={`${resumeTemplate}-${previewFont}-${jobApplication.JobApplicationId ?? 'new'}`}
              document={
                <ResumePDF
                  key={`${resumeTemplate}-${previewFont}-${jobApplication.JobApplicationId ?? 'new'}`}
                  applicant={applicant}
                  jobApplication={jobApplication}
                  education={education}
                  employmentHistory={employmentHistory}
                  references={references}
                  trainings={trainings}
                  certificates={certificates}
                  previewFont={previewFont}
                  resumeTemplate={resumeTemplate}
                />
              }
              fileName={`${applicant.applicantName || 'Resume'}.pdf`}
            >
              {() => 'Download'}
            </PDFDownloadLink>
          </div>
        </div>
      </Accordion>
      </div>
    </div>
  )

  const renderEditorHeader = (title: string, onBack: () => void, allowBack?: boolean) => (
    <div className="section-editor-header">
        <button type="button" className={`back-button ${allowBack ? '' : 'disabled-btn'}`} onClick={onBack} disabled={!allowBack}>
          Submit
        </button>
      <h2>{title}</h2>
    </div>
  )

  const renderTemplate = () => (
    <div className="section-editor">
      {renderEditorHeader('Resume Template', () => setActivePanel({ type: 'list' }))}
      
    </div>
  )

  const renderContact = () => (
    <div className="section-editor">
      {renderEditorHeader('Contact Info', () => setActivePanel({ type: 'list' }), applicant.applicantName !== '' && jobApplication.appliedPosition !== '')}
      <div className="form-grid">
        <label>
          Applicant Name
          <input value={applicant.applicantName} disabled />
        </label>
        <label>
          <p className='required-asterisk'>
            Applied Position</p>
          <input
            value={jobApplication.appliedPosition}
            onChange={(event) => updateApplication('appliedPosition', event.target.value)}
            placeholder="e.g., Junior Software Engineer"
          />
        </label>
        <label>
          Available Start Date
          <input
            type="date"
            value={jobApplication.availableStartDate}
            onChange={(event) => updateApplication('availableStartDate', event.target.value)}
          />
        </label>
        <label>
          Expected Salary
          <input
            type="number"
            value={jobApplication.expectedSalary}
            onChange={(event) => updateApplication('expectedSalary', event.target.value)}
            placeholder="e.g., 85000"
          />
        </label>
      </div>
    </div>
  )

  const renderEducation = (index: number) => {
    const entry = education[index]
    if (!entry) {
      return renderList()
    }

    const isValid = entry.schoolName !== '' && entry.degreeReceived !== '' && entry.schoolLocation !== '' && entry.startYear !== '' && (entry.isCurrent || entry.endYear !== '')

    return (
      <div className="section-editor">
        {renderEditorHeader(`Education ${index + 1}`, () => setActivePanel({ type: 'list' }), isValid)}
        <div className="form-grid">
          <label>
            <p className="required-asterisk">School Name</p>
            <SmartCombobox
              fetchUrl="/backend/api/schools/list.php"
              valueName={entry.schoolName}
              valueId={entry.schoolId ?? null}
              placeholder="e.g., Polytechnic University of the Philippines"
              onChange={({ name, id, location }) => {
                updateEducation(index, 'schoolName', name)
                updateEducation(index, 'schoolId', id || '')
                if (location !== undefined) {
                  updateEducation(index, 'schoolLocation', location || '')
                }
              }}
            />
          </label>
          <label>
            <p className="required-asterisk">School Location</p>
            <input
              value={entry.schoolLocation}
              onChange={(event) => updateEducation(index, 'schoolLocation', event.target.value)}
              placeholder="e.g., Manila, Philippines"
            />
          </label>
          <label>
            <p className="required-asterisk">Start Year</p>
            <input
              type="number"
              min={1900}
              max={2100}
              value={entry.startYear}
              onChange={(event) => updateEducation(index, 'startYear', event.target.value)}
              placeholder="e.g., 2019"
            />
          </label>
          <label>
            <p className="required-asterisk">Degree Received</p>
            <input
              value={entry.degreeReceived}
              onChange={(event) => updateEducation(index, 'degreeReceived', event.target.value)}
              placeholder="e.g., Bachelor of Science"
            />
          </label>
          <label>
            Program Name
            <input
              value={entry.programName}
              onChange={(event) => updateEducation(index, 'programName', event.target.value)}
              placeholder="e.g., Computer Science"
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={entry.isCurrent ?? false}
              onChange={(event) => updateEducation(index, 'isCurrent', event.target.checked)}
              style={{ width: 'auto', margin: 0 }}
            />
            <span>Currently Attending</span>
          </label>
          <label>
            <p className={entry.isCurrent ? 'disabled-label' : 'required-asterisk'}>End Year</p>
            <input
              type="number"
              min={1900}
              max={2100}
              value={entry.endYear}
              onChange={(event) => updateEducation(index, 'endYear', event.target.value)}
              placeholder="e.g., 2023"
              disabled={entry.isCurrent ?? false}
              style={{ opacity: entry.isCurrent ? 0.5 : 1, cursor: entry.isCurrent ? 'not-allowed' : 'auto' }}
            />
          </label>
        </div>
        <button
          type="button"
          className="remove-button"
          onClick={() => {
            removeEducation(index)
            setActivePanel({ type: 'list' })
          }}
        >
          Remove Education
        </button>
      </div>
    )
  }

  const renderEmployment = (index: number) => {
    const entry = employmentHistory[index]
    if (!entry) {
      return renderList()
    }

    const isValid = entry.companyName !== '' && entry.workPosition !== '' && entry.companyAddress !== '' && entry.startDate !== '' && (entry.isEmployed || entry.endDate !== '')

    return (
      <div className="section-editor">
        {renderEditorHeader(`Employment ${index + 1}`, () => setActivePanel({ type: 'list' }), isValid)}
        <div className="form-grid">
          <label>
            <p className="required-asterisk">Company Name</p>
            <SmartCombobox
              fetchUrl="/backend/api/companies/list.php"
              valueName={entry.companyName}
              valueId={entry.companyId ?? null}
              placeholder="e.g., Tech Solutions Inc."
              onChange={({ name, id, location }) => {
                updateEmployment(index, 'companyName', name)
                updateEmployment(index, 'companyId', id || '')
                if (location !== undefined) {
                  updateEmployment(index, 'companyAddress', location || '')
                }
              }}
            />
          </label>
          <label>
            <p className="required-asterisk">Company Address</p>
            <input
              value={entry.companyAddress}
              onChange={(event) => updateEmployment(index, 'companyAddress', event.target.value)}
              placeholder="e.g., Makati City"
            />
          </label>
          <label>
            <p>Company Phone</p>
            <input
              value={entry.companyPhone ?? ''}
              onChange={(event) => updateEmployment(index, 'companyPhone', event.target.value)}
              placeholder="e.g., +63 2 1234 5678"
            />
          </label>
          <label>
            <p className="required-asterisk">Work Position</p>
            <input
              value={entry.workPosition}
              onChange={(event) => updateEmployment(index, 'workPosition', event.target.value)}
              placeholder="e.g., Junior Software Engineer"
            />
          </label>
          <label>
            <p className="required-asterisk">Reason For Leaving</p>
            <input
              value={entry.reasonForLeaving ?? ''}
              onChange={(event) => updateEmployment(index, 'reasonForLeaving', event.target.value)}
              placeholder="e.g., Career growth, Relocation (Optional)"
            />
          </label>
          <label>
            <p className="required-asterisk">Start Date</p>
            <input
              type="date"
              value={entry.startDate}
              max={today}
              onChange={(event) => updateEmployment(index, 'startDate', event.target.value)}
            />
          </label>
          <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <input
              type="checkbox"
              checked={entry.isEmployed ?? false}
              onChange={(event) => updateEmployment(index, 'isEmployed', event.target.checked)}
              style={{ width: 'auto', margin: 0 }}
            />
            <span>Currently Employed</span>
          </label>
          <label>
            <p className={entry.isEmployed ? 'disabled-label' : 'required-asterisk'}>End Date</p>
            <input
              type="date"
              value={entry.endDate}
              min={entry.startDate || undefined}
              max={today}
              onChange={(event) => updateEmployment(index, 'endDate', event.target.value)}
              disabled={entry.isEmployed ?? false}
              style={{ opacity: entry.isEmployed ? 0.5 : 1, cursor: entry.isEmployed ? 'not-allowed' : 'auto' }}
            />
          </label>
        </div>
        <button
          type="button"
          className="remove-button"
          onClick={() => {
            removeEmployment(index)
            setActivePanel({ type: 'list' })
          }}
        >
          Remove Employment
        </button>
      </div>
    )
  }

  const renderReference = (index: number) => {
    const entry = references[index]
    if (!entry) {
      return renderList()
    }

    return (
      <div className="section-editor">
        {renderEditorHeader(`Reference ${index + 1}`, () => setActivePanel({ type: 'list' }), entry.referenceName !== '' && entry.referenceTitle !== '' && entry.referenceCompany !== '' && entry.referencePhone !== '')}
        <div className="form-grid">
          <label>
            <p className="required-asterisk">Name</p>
            <input
              value={entry.referenceName}
              onChange={(event) => updateReference(index, 'referenceName', event.target.value)}
              placeholder="e.g., Dr. Alan Turing"
            />
          </label>
          <label>
            <p className="required-asterisk">Title</p>
            <input
              value={entry.referenceTitle}
              onChange={(event) => updateReference(index, 'referenceTitle', event.target.value)}
              placeholder="e.g., Former Manager"
            />
          </label>
          <label>
            <p className="required-asterisk">Company</p>
            <input
              value={entry.referenceCompany}
              onChange={(event) => updateReference(index, 'referenceCompany', event.target.value)}
              placeholder="e.g., Tech Solutions Inc."
            />
          </label>
          <label>
            <p className="required-asterisk">Phone</p>
            <input
              value={entry.referencePhone}
              onChange={(event) => updateReference(index, 'referencePhone', event.target.value)}
              placeholder="e.g., +63 917 123 4567"
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={entry.referenceEmail}
              onChange={(event) => updateReference(index, 'referenceEmail', event.target.value)}
              placeholder="e.g., alan@example.com"
            />
          </label>
        </div>
        <button
          type="button"
          className="remove-button"
          onClick={() => {
            removeReference(index)
            setActivePanel({ type: 'list' })
          }}
        >
          Remove Reference
        </button>
      </div>
    )
  }

  const renderTraining = (index: number) => {
    const entry = trainings[index]
    if (!entry) {
      return renderList()
    }

    const hasTrainingError = trainingErrorMessages.length > 0

    return (
      <div className="section-editor">
        {renderEditorHeader(
          `Training ${index + 1}`,
          () => setActivePanel({ type: 'list' }),
          !hasTrainingError &&
            entry.trainingTitle !== '' &&
            entry.trainingInstructor !== '' &&
            entry.trainingDurationHours !== '' &&
            entry.completionDate !== '',
        )}
        {hasTrainingError ? (
          <div
            className="bg-red-100 text-red-700 border-red-400"
            style={{
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              border: '1px solid #f87171',
              borderRadius: '6px',
              padding: '10px 12px',
              marginBottom: '12px',
            }}
          >
            {trainingErrorMessages.join(' ')}
          </div>
        ) : null}
        <div className="form-grid">
          <label>
            <p className="required-asterisk">Title</p>
            <SmartCombobox
              fetchUrl="/backend/api/trainings/list.php"
              valueName={entry.trainingTitle}
              valueId={entry.trainingId ?? null}
              placeholder="e.g., Agile Scrum Mastery"
              onChange={({ name, id, description, duration }) => {
                updateTraining(index, 'trainingTitle', name)
                updateTraining(index, 'trainingId', id || '')
                if (description !== undefined && description !== null) {
                  updateTraining(index, 'trainingDescription', String(description))
                }
                if (duration !== undefined && duration !== null) {
                  updateTraining(index, 'trainingDurationHours', String(duration))
                }
              }}
            />
          </label>
          <label>
            <p className="required-asterisk">Description</p>
            <input
              value={entry.trainingDescription}
              onChange={(event) => updateTraining(index, 'trainingDescription', event.target.value)}
              placeholder="e.g., Intensive workshop on agile methodologies"
            />
          </label>
          <label>
            <p className="required-asterisk">Instructor</p>
            <input
              value={entry.trainingInstructor}
              onChange={(event) => updateTraining(index, 'trainingInstructor', event.target.value)}
              placeholder="e.g., Maria Santos"
            />
          </label>
          <label>
            <p className="required-asterisk">Duration (Hours)</p>
            <input
              type="number"
              value={entry.trainingDurationHours}
              onChange={(event) => updateTraining(index, 'trainingDurationHours', event.target.value)}
              placeholder="e.g., 40"
            />
          </label>
          <label>
            <p className="required-asterisk">Completion Date</p>
            <input
              type="date"
              value={entry.completionDate ?? ''}
              max={today}
              onChange={(event) => updateTraining(index, 'completionDate', event.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className="remove-button"
          onClick={() => {
            removeTraining(index)
            setActivePanel({ type: 'list' })
          }}
        >
          Remove Training
        </button>
      </div>
    )
  }

  const renderCertificate = (index: number) => {
    const entry = certificates[index]
    if (!entry) {
      return renderList()
    }

    const hasCertificateError = certificateErrorMessages.length > 0

    return (
      <div className="section-editor">
        {renderEditorHeader(
          `Certificate ${index + 1}`,
          () => setActivePanel({ type: 'list' }),
          !hasCertificateError &&
            entry.certificateName !== '' &&
            entry.issuingAuthority !== '' &&
            entry.validityMonths !== '' &&
            entry.dateIssued !== '',
        )}
        {hasCertificateError ? (
          <div
            className="bg-red-100 text-red-700 border-red-400"
            style={{
              backgroundColor: '#fee2e2',
              color: '#b91c1c',
              border: '1px solid #f87171',
              borderRadius: '6px',
              padding: '10px 12px',
              marginBottom: '12px',
            }}
          >
            {certificateErrorMessages.join(' ')}
          </div>
        ) : null}
        <div className="form-grid">
          <label>
            <p className="required-asterisk">Name</p>
            <SmartCombobox
              fetchUrl="/backend/api/certificates/list.php"
              valueName={entry.certificateName}
              valueId={entry.certificateId ?? null}
              placeholder="e.g., AWS Certified Developer"
              onChange={({ name, id, location, validityMonths }) => {
                updateCertificate(index, 'certificateName', name)
                updateCertificate(index, 'certificateId', id || '')
                if (location !== undefined && location !== null) {
                  updateCertificate(index, 'issuingAuthority', String(location))
                }
                if (validityMonths !== undefined && validityMonths !== null) {
                  updateCertificate(index, 'validityMonths', String(validityMonths))
                }
              }}
            />
          </label>
          <label>
            <p className="required-asterisk">Issuing Authority</p>
            <input
              value={entry.issuingAuthority}
              onChange={(event) => updateCertificate(index, 'issuingAuthority', event.target.value)}
              placeholder="e.g., Amazon Web Services"
            />
          </label>
          <label>
            <p className="required-asterisk">Validity (Months)</p>
            <input
              type="number"
              value={entry.validityMonths}
              onChange={(event) => updateCertificate(index, 'validityMonths', event.target.value)}
              placeholder="e.g., 36"
            />
          </label>
          <label>
            <p className="required-asterisk">Date Issued</p>
            <input
              type="date"
              value={entry.dateIssued ?? ''}
              max={today}
              onChange={(event) => updateCertificate(index, 'dateIssued', event.target.value)}
            />
          </label>
        </div>
        <button
          type="button"
          className="remove-button"
          onClick={() => {
            removeCertificate(index)
            setActivePanel({ type: 'list' })
          }}
        >
          Remove Certificate
        </button>
      </div>
    )
  }

  const renderCompliance = () => (
    <div className="section-editor">
      {renderEditorHeader('Compliance & Upload', () => setActivePanel({ type: 'list' }), applicant.hasCriminalHistory !== null && applicant.agreesToDrugTest !== null)}
      <div className="form-grid">
        <label>
          <p className="required-asterisk">Have you ever had a criminal conviction?</p>
          <select
            value={
              applicant.hasCriminalHistory === null
                ? ''
                : applicant.hasCriminalHistory
                  ? 'yes'
                  : 'no'
            }
            onChange={(event) =>
              updateApplicant(
                'hasCriminalHistory',
                event.target.value === '' ? null : event.target.value === 'yes',
              )
            }
          >
            <option value="">Choose</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>

        <label>
          <p className="required-asterisk">Do you agree to a drug test?</p>
          <select
            value={
              applicant.agreesToDrugTest === null
                ? ''
                : applicant.agreesToDrugTest
                  ? 'yes'
                  : 'no'
            }
            onChange={(event) =>
              updateApplicant(
                'agreesToDrugTest',
                event.target.value === '' ? null : event.target.value === 'yes',
              )
            }
          >
            <option value="">Choose</option>
            <option value="yes">Yes</option>
            <option value="no">No</option>
          </select>
        </label>
      </div>

      {uploadState.message ? (
        <p className={uploadState.uploading ? 'upload-note' : 'upload-note done'}>
          {uploadState.message}
        </p>
      ) : null}

      {jobApplication.resumeFileUrl ? (
        <p className="upload-link">
          Resume URL: <a href={jobApplication.resumeFileUrl}>{jobApplication.resumeFileUrl}</a>
        </p>
      ) : null}
    </div>
  )

  return (
    <div className="" aria-label="Resume input sections">
      {activePanel.type === 'list' ? renderList() : null}
      {activePanel.type === 'template' ? renderTemplate() : null}
      {activePanel.type === 'contact' ? renderContact() : null}
      {activePanel.type === 'education' ? renderEducation(activePanel.index) : null}
      {activePanel.type === 'employment' ? renderEmployment(activePanel.index) : null}
      {activePanel.type === 'reference' ? renderReference(activePanel.index) : null}
      {activePanel.type === 'training' ? renderTraining(activePanel.index) : null}
      {activePanel.type === 'certificate' ? renderCertificate(activePanel.index) : null}
      {activePanel.type === 'compliance' ? renderCompliance() : null}
    </div>
  )
}

export default ResumeAccordion
