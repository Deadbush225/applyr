import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Accordion } from '../components/Accordion'
import GroupBox from '../components/GroupBox'
import type { ValidationError } from '../utils/validation'
import type {
  Applicant,
  Education,
  EmploymentHistory,
  Training,
  Certificate,
} from '../types'
import SmartCombobox from '../components/SmartCombobox'

type ActivePanel =
  | { type: 'list' }
  | { type: 'education'; index: number }
  | { type: 'employment'; index: number }
  | { type: 'training'; index: number }
  | { type: 'certificate'; index: number }

export type ApplicantDetailsPageProps = {
  applicant: Applicant
  education: Education[]
  employmentHistory: EmploymentHistory[]
  trainings: Training[]
  certificates: Certificate[]
  uploadState?: { uploading: boolean; message: string }
  onSyncRequest?: () => Promise<void>
  updateApplicant: <K extends keyof Applicant>(key: K, value: Applicant[K]) => void
  updateEducation: <K extends keyof Education>(index: number, field: K, value: Education[K]) => void
  updateEmployment: <K extends keyof EmploymentHistory>(index: number, field: K, value: EmploymentHistory[K]) => void
  updateTraining: (index: number, field: keyof Training, value: string) => void
  updateCertificate: (index: number, field: keyof Certificate, value: string) => void
  addEducation: () => void
  removeEducation: (index: number) => Promise<void>
  reorderEducation?: (fromIndex: number, toIndex: number) => void
  addEmployment: () => void
  removeEmployment: (index: number) => Promise<void>
  reorderEmployment?: (fromIndex: number, toIndex: number) => void
  addTraining: () => void
  removeTraining: (index: number) => Promise<void>
  reorderTrainings?: (fromIndex: number, toIndex: number) => void
  addCertificate: () => void
  removeCertificate: (index: number) => Promise<void>
  reorderCertificates?: (fromIndex: number, toIndex: number) => void
  handleResumeUpload?: (file: File | null) => Promise<void>
  validationErrors: ValidationError[]
  isValidationBlocked: boolean
}

const ApplicantDetailsPage = ({
  applicant,
  education,
  employmentHistory,
  trainings,
  certificates,
  onSyncRequest,
  updateApplicant,
  updateEducation,
  updateEmployment,
  updateTraining,
  updateCertificate,
  addEducation,
  removeEducation,
  addEmployment,
  removeEmployment,
  addTraining,
  removeTraining,
  addCertificate,
  removeCertificate,
  isValidationBlocked,
  validationErrors
}: ApplicantDetailsPageProps) => {
  const today = new Date().toISOString().split('T')[0]
  const currentMonth = new Date().toISOString().slice(0, 7)
  const currentYear = new Date().getFullYear()

  const normalizePhoneInput = (value: string) => {
    if (value.startsWith('09')) {
      return value.replace(/\D/g, '')
    }
    return value
  }

  const isValidPhoneNumber = (value: string) => {
    if (!value) return false;
    
    // Strip all non-numeric characters first
    const digits = value.replace(/\D/g, '');
    
    // Mobile (Philippines): strictly starts with 09 and is exactly 11 digits total
    return /^09\d{9}$/.test(digits);
  }

  const navigate = useNavigate()
  const [activePanel, setActivePanel] = useState<ActivePanel>({ type: 'list' })
  const [clickedPanel, setClickedPanel] = useState<ActivePanel>({type: 'list'})
  const [openSections, setOpenSections] = useState<string[]>(['education', 'employment', 'training', 'certificate'])
  const [showSectionSwitchModal, setShowSectionSwitchModal] = useState(false)

  const _setActivePanel = (panel: ActivePanel) => {
    if (activePanel.type === 'list' || panel.type === 'list') {
      setActivePanel(panel)
    } else {
      setClickedPanel(panel)
      setShowSectionSwitchModal(true)
    }
  }

  const blockInvalidNumberKey = (event: React.KeyboardEvent<HTMLInputElement>) => {
    if (event.key === 'e' || event.key === 'E' || event.key === '+' || event.key === '-') {
      event.preventDefault()
    }
  }

  // 1. THE REF TRICK: Always hold the freshest save function without triggering React re-renders
  const syncRef = useRef(onSyncRequest)
  useEffect(() => {
    syncRef.current = onSyncRequest
  }, [onSyncRequest])

  // 2. TRUE UNMOUNT SAVE: Empty dependency array means this ONLY runs when leaving the page
  useEffect(() => {
    return () => {
      syncRef.current?.().catch(console.error)
    }
  }, [])

  // 3. SMART AUTO-SAVE: Debounces network requests by 2 seconds
  useEffect(() => {
    const timer = setTimeout(() => {
      syncRef.current?.().catch(console.error)
    }, 2000)

    return () => clearTimeout(timer)
  }, [applicant, education, employmentHistory, trainings, certificates])

  const toggleSection = (sectionName: string) => {
    setOpenSections((prev) =>
      prev.includes(sectionName)
        ? prev.filter((s) => s !== sectionName)
        : [...prev, sectionName]
    )
  }

  const certificateErrors = validationErrors.filter((err) => err.path[0] === 'certificates')
  const certificateErrorMessages = certificateErrors.map((err) => err.message)
  const trainingErrors = validationErrors.filter((err) => err.path[0] === 'trainings')
  const trainingErrorMessages = trainingErrors.map((err) => err.message)

  const formatEducationTitle = (item: Education) => item.schoolName || 'School'
  const formatEducationRange = (item: Education) => {
    if (!item.startYear) return ''
    const startYear = item.startYear
    const endYear = item.isCurrent ? 'Present' : item.endYear || ''
    return `${startYear}${endYear ? ` – ${endYear}` : ''}`
  }

  const formatEmploymentTitle = (item: EmploymentHistory) => item.companyName || 'Company'
  const formatEmploymentRange = (item: EmploymentHistory) => {
    if (!item.startDate) return ''
    const startYear = item.startDate.split('-')[0]
    const endYear = item.isEmployed ? 'Present' : item.endDate?.split('-')[0] || ''
    return `${startYear}${endYear ? ` – ${endYear}` : ''}`
  }

  const getFieldErrors = (fieldPath: string) =>
    validationErrors.filter((err) => err.field === fieldPath || err.field.startsWith(`${fieldPath}.`))
  const hasFieldErrors = (fieldPath: string) => getFieldErrors(fieldPath).length > 0
  const renderFieldError = (fieldPath: string) => {
    const fieldErrors = getFieldErrors(fieldPath)
    if (!fieldErrors.length) return null
    return (
      <p style={{ color: '#dc2626', fontSize: '0.75rem', marginTop: '4px' }}>
        {fieldErrors[0]?.message || 'Invalid value'}
      </p>
    )
  }

  const renderList = () => (
    <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
      <p>Select an item to edit</p>
    </div>
  )

  const renderEditorHeader = (title: string, onBack: () => void, allowBack?: boolean) => (
    <div className="section-editor-header">
      <h2>{title}</h2>
        <button type="button" className={`back-button ${allowBack ? '' : 'disabled-btn'}`} onClick={onBack} disabled={!allowBack}>
          Submit
        </button>
    </div>
  )

const renderEducation = (index: number) => {
    const entry = education[index]
    if (!entry) {
      return renderList()
    }

    const isValid = entry.schoolName !== '' && entry.degreeReceived !== '' && entry.programName !== '' && entry.schoolLocation !== '' && entry.startYear !== '' && (entry.isCurrent || entry.endYear !== '')
    const hasEducationErrors = hasFieldErrors(`education.${index}`)

    return (
      <div className="section-editor">
        {renderEditorHeader(
          `Education ${index + 1}`,
          () => _setActivePanel({ type: 'list' }),
          isValid && !hasEducationErrors,
        )}
        <div className="form-grid">
          <label>
            <p className="required-asterisk">School Name</p>
            <SmartCombobox
              fetchUrl="/backend/api/schools/list.php"
              valueName={entry.schoolName}
              valueId={entry.schoolId != null ? String(entry.schoolId) : null}
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
              max={currentYear}
              minLength={4}
              maxLength={4}
              value={entry.startYear || ''}
              onChange={(event) => updateEducation(index, 'startYear', event.target.value)}
              onKeyDown={blockInvalidNumberKey}
              placeholder="e.g., 2019"
            />
            {renderFieldError(`education.${index}.startYear`)}
          </label>
          <label>
            <p className="required-asterisk">Degree Received</p>
            <input
              value={entry.degreeReceived}
              onChange={(event) => updateEducation(index, 'degreeReceived', event.target.value)}
              placeholder="e.g., Bachelor of Science"
            />
            {renderFieldError(`education.${index}.degreeReceived`)}
          </label>
          <label>
            <p className="required-asterisk">
            Program Name
            </p>
            <input
              value={entry.programName}
              onChange={(event) => updateEducation(index, 'programName', event.target.value)}
              placeholder="e.g., Computer Science"
            />
            {renderFieldError(`education.${index}.programName`)}
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
              min={entry.startYear ? Number(entry.startYear) : 1900}
              max={currentYear}
              minLength={4}
              maxLength={4}
              value={entry.endYear || ''}
              onChange={(event) => updateEducation(index, 'endYear', event.target.value)}
              onKeyDown={blockInvalidNumberKey}
              placeholder="e.g., 2023"
              disabled={entry.isCurrent ?? false}
              style={{ opacity: entry.isCurrent ? 0.5 : 1, cursor: entry.isCurrent ? 'not-allowed' : 'auto' }}
            />
            {renderFieldError(`education.${index}.endYear`)}
          </label>
        </div>
        <button
          type="button"
          className="remove-button"
          onClick={() => {
            void removeEducation(index)
            _setActivePanel({ type: 'list' })
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
      const hasEmploymentErrors = hasFieldErrors(`employmentHistory.${index}`)
  
      return (
        <div className="section-editor">
          {renderEditorHeader(
            `Employment ${index + 1}`,
            () => _setActivePanel({ type: 'list' }),
            isValid && !hasEmploymentErrors,
          )}
          <div className="form-grid">
            <label>
              <p className="required-asterisk">Company Name</p>
              <SmartCombobox
                fetchUrl="/backend/api/companies/list.php"
                valueName={entry.companyName}
                valueId={entry.companyId != null ? String(entry.companyId) : null}
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
              {renderFieldError(`employmentHistory.${index}.companyAddress`)}
            </label>
            <label>
              <p>Company Phone</p>
              <input
                type="tel"
                maxLength={12}
                value={entry.companyPhone ?? ''}
                onChange={(event) =>
                  updateEmployment(index, 'companyPhone', normalizePhoneInput(event.target.value))
                }
                placeholder="e.g., 0917 123 4567"
              />
              {entry.companyPhone ? (
                  isValidPhoneNumber(entry.companyPhone) ? (
                    <p style={{ color: '#15803d', fontSize: '0.85rem', marginTop: 6 }}>Valid phone number</p>
                  ) : (
                    <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: 6 }}>Invalid phone number. Use mobile (09XXXXXXXXX).</p>
                  )
                ) : null}
              {renderFieldError(`employmentHistory.${index}.companyPhone`)}
            </label>
            <label>
              <p className="required-asterisk">Work Position</p>
              <input
                value={entry.workPosition}
                onChange={(event) => updateEmployment(index, 'workPosition', event.target.value)}
                placeholder="e.g., Junior Software Engineer"
              />
              {renderFieldError(`employmentHistory.${index}.workPosition`)}
            </label>
            <label>
              <p className="required-asterisk">Reason For Leaving</p>
              <input
                value={entry.reasonForLeaving ?? ''}
                onChange={(event) => updateEmployment(index, 'reasonForLeaving', event.target.value)}
                placeholder="e.g., Career growth, Relocation (Optional)"
              />
              {renderFieldError(`employmentHistory.${index}.reasonForLeaving`)}
            </label>
            <label>
              <p className="required-asterisk">Start Date</p>
              <input
                type="month"
                value={entry.startDate}
                max={currentMonth}
                onChange={(event) => updateEmployment(index, 'startDate', event.target.value)}
              />
              {renderFieldError(`employmentHistory.${index}.startDate`)}
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
                type="month"
                value={entry.endDate}
                min={entry.startDate || undefined}
                max={currentMonth}
                onChange={(event) => updateEmployment(index, 'endDate', event.target.value)}
                disabled={entry.isEmployed ?? false}
                style={{ opacity: entry.isEmployed ? 0.5 : 1, cursor: entry.isEmployed ? 'not-allowed' : 'auto' }}
              />
              {renderFieldError(`employmentHistory.${index}.endDate`)}
            </label>
          </div>
          <button
            type="button"
            className="remove-button"
            onClick={() => {
              void removeEmployment(index)
              _setActivePanel({ type: 'list' })
            }}
          >
            Remove Employment
          </button>
        </div>
      )
    }

  const renderTraining = (index: number) => {
      const entry = trainings[index]
      if (!entry) {
        return renderList()
      }
  
      const hasTrainingError = trainingErrorMessages.length > 0 || hasFieldErrors(`trainings.${index}`)
  
      return (
        <div className="section-editor">
          {renderEditorHeader(
            `Training ${index + 1}`,
            () => _setActivePanel({ type: 'list' }),
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
                valueId={entry.trainingId != null ? String(entry.trainingId) : null}
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
              {renderFieldError(`trainings.${index}.trainingDescription`)}
            </label>
            <label>
              <p className="required-asterisk">Instructor</p>
              <input
                value={entry.trainingInstructor}
                onChange={(event) => updateTraining(index, 'trainingInstructor', event.target.value)}
                placeholder="e.g., Maria Santos"
              />
              {renderFieldError(`trainings.${index}.trainingInstructor`)}
            </label>
            <label>
              <p className="required-asterisk">Duration (Hours)</p>
              <input
                type="number"
                value={entry.trainingDurationHours}
                onChange={(event) => updateTraining(index, 'trainingDurationHours', event.target.value)}
                placeholder="e.g., 40"
              />
              {renderFieldError(`trainings.${index}.trainingDurationHours`)}
            </label>
            <label>
              <p className="required-asterisk">Completion Date</p>
              <input
                type="date"
                value={entry.completionDate ?? ''}
                max={today}
                onChange={(event) => updateTraining(index, 'completionDate', event.target.value)}
              />
              {renderFieldError(`trainings.${index}.completionDate`)}
            </label>
          </div>
          <button
            type="button"
            className="remove-button"
            onClick={() => {
              void removeTraining(index)
              _setActivePanel({ type: 'list' })
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
  
      const hasCertificateError = certificateErrorMessages.length > 0 || hasFieldErrors(`certificates.${index}`)
  
      return (
        <div className="section-editor">
          {renderEditorHeader(
            `Certificate ${index + 1}`,
            () => _setActivePanel({ type: 'list' }),
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
                valueId={entry.certificateId != null ? String(entry.certificateId) : null}
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
              {renderFieldError(`certificates.${index}.issuingAuthority`)}
            </label>
            <label>
              <p className="required-asterisk">Validity (Months)</p>
              <input
                type="number"
                value={entry.validityMonths}
                onChange={(event) => updateCertificate(index, 'validityMonths', event.target.value)}
                placeholder="e.g., 36"
              />
              {renderFieldError(`certificates.${index}.validityMonths`)}
            </label>
            <label>
              <p className="required-asterisk">Date Issued</p>
              <input
                type="date"
                value={entry.dateIssued ?? ''}
                max={today}
                onChange={(event) => updateCertificate(index, 'dateIssued', event.target.value)}
              />
              {renderFieldError(`certificates.${index}.dateIssued`)}
            </label>
          </div>
          <button
            type="button"
            className="remove-button"
            onClick={() => {
              void removeCertificate(index)
              _setActivePanel({ type: 'list' })
            }}
          >
            Remove Certificate
          </button>
        </div>
      )
    }

  return (
    <div className="page-shell">
      {showSectionSwitchModal ? (
        <div className="modal-backdrop center-align" role="dialog" aria-modal="true" aria-labelledby="section-switch-title">
          <div className="modal">
            <h3 id="section-switch-title">Finish This Section First</h3>
            <p>Please submit your current section before editing another one.</p>
            <div className="form-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => setShowSectionSwitchModal(false)}
              >
                Keep Editing
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  setActivePanel(clickedPanel)
                  setShowSectionSwitchModal(false)
                }}
              >
                Exit & Switch
              </button>
            </div>
          </div>
        </div>
      ) : null}
      <div className="resume-shell">
        <section className="panel panel-scroll">
          <div className="panel-content">
            {/* Back button */}
            <div>
              <button type="button" className="back-button " onClick={() => navigate('/')}>
                ← Back to Home
              </button>
            </div>

            {/* Personal Info */}
            <GroupBox title="Personal Information">
              <div className="form-group">
                <label htmlFor="applicantName">Full Name</label>
                <input
                  id="applicantName"
                  type="text"
                  value={applicant.applicantName || ''}
                  onChange={(e) => updateApplicant('applicantName', e.target.value)}
                  disabled={isValidationBlocked}
                />
              </div>
              <div className='lyt_flex-row'>

              <div className="form-group">
                <label htmlFor="emailAddress">Email</label>
                <input
                  id="emailAddress"
                  type="email"
                  value={applicant.emailAddress || ''}
                  onChange={(e) => updateApplicant('emailAddress', e.target.value)}
                  disabled={isValidationBlocked}
                />
              </div>
              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  value={applicant.phoneNumber || ''}
                  onChange={(e) => updateApplicant('phoneNumber', e.target.value)}
                  disabled={isValidationBlocked}
                  />
                {applicant.phoneNumber ? (
                  isValidPhoneNumber(applicant.phoneNumber) ? (
                    <p style={{ color: '#15803d', fontSize: '0.85rem', marginTop: 6 }}>Valid phone number</p>
                  ) : (
                    <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: 6 }}>Invalid phone number. Use mobile (09XXXXXXXXX).</p>
                  )
                ) : null}
              </div>
                  </div>
            </GroupBox>

            {/* Education Accordion */}
            <Accordion
              title="Education"
              subtitle="Schools and degrees"
              onToggle={() => toggleSection('education')}
              isOpen={openSections.includes('education')}
            >
                <div>
                  {education.map((item, index) => (
                    <div key={`education-${index}`} className="section-row">
                      <div className='row-handle'>☰</div>
                      <button
                        type="button"
                        className="row-main"
                        onClick={() => _setActivePanel({ type: 'education', index })}
                      >
                        <span className="row-title">{formatEducationTitle(item)}</span>
                        <span className="row-subtitle">{formatEducationRange(item) || 'Years not set'}</span>
                      </button>
                      <button
                        type="button"
                        className="row-remove"
                        onClick={() => removeEducation(index)}
                        disabled={isValidationBlocked}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              <button
                type="button"
                className="add-button small"
                onClick={() => {
                  addEducation()
                  _setActivePanel({ type: 'education', index: education.length })
                }}
                disabled={isValidationBlocked}
              >
                + Add
              </button>
            </Accordion>

            {/* Employment Accordion */}
            <Accordion
              title="Employment History"
              subtitle="Work and experience"
              onToggle={() => toggleSection('employment')}
              isOpen={openSections.includes('employment')}
            >
              
                <div>
                  {employmentHistory.map((item, index) => (
                    <div key={`employment-${index}`} className="section-row">
                      <div className='row-handle'>☰</div>
                      <button
                        type="button"
                        className="row-main"
                        onClick={() => _setActivePanel({ type: 'employment', index })}
                      >
                        <span className="row-title">{formatEmploymentTitle(item)}</span>
                        <span className="row-subtitle">
                          {item.workPosition || 'Role'}
                          {formatEmploymentRange(item) ? ` • ${formatEmploymentRange(item)}` : ''}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="row-remove"
                        onClick={() => removeEmployment(index)}
                        disabled={isValidationBlocked}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              <button
                type="button"
                className="add-button small"
                onClick={() => {
                  addEmployment()
                  _setActivePanel({ type: 'employment', index: employmentHistory.length })
                }}
                disabled={isValidationBlocked}
              >
                + Add
              </button>
            </Accordion>

            {/* Training Accordion */}
            <Accordion
              title="Trainings & Courses"
              subtitle="Workshops and learning"
              onToggle={() => toggleSection('training')}
              isOpen={openSections.includes('training')}
            >
              
                <div>
                  {trainings.map((item, index) => (
                    <div key={`training-${index}`} className="section-row">
                      <div className='row-handle'>☰</div>
                      <button
                        type="button"
                        className="row-main"
                        onClick={() => _setActivePanel({ type: 'training', index })}
                      >
                        <span className="row-title">{item.trainingTitle || 'Training'}</span>
                        <span className="row-subtitle">
                          {item.trainingDurationHours ? `${item.trainingDurationHours}h` : 'Duration not set'}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="row-remove"
                        onClick={() => removeTraining(index)}
                        disabled={isValidationBlocked}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              <button
                type="button"
                className="add-button small"
                onClick={() => {
                  addTraining()
                  _setActivePanel({ type: 'training', index: trainings.length })
                }}
                disabled={isValidationBlocked}
              >
                + Add
              </button>
            </Accordion>

            {/* Certificate Accordion */}
            <Accordion
              title="Certifications"
              subtitle="Credentials and licenses"
              onToggle={() => toggleSection('certificate')}
              isOpen={openSections.includes('certificate')}
            >
                <div>
                  {certificates.map((item, index) => (
                    <div key={`certificate-${index}`} className="section-row">
                      <div className='row-handle'>☰</div>
                      <button
                        type="button"
                        className="row-main"
                        onClick={() => _setActivePanel({ type: 'certificate', index })}
                      >
                        <span className="row-title">{item.certificateName || 'Certificate'}</span>
                        <span className="row-subtitle">
                          {item.issuingAuthority || 'Authority not set'}
                        </span>
                      </button>
                      <button
                        type="button"
                        className="row-remove"
                        onClick={() => removeCertificate(index)}
                        disabled={isValidationBlocked}
                      >
                        Remove
                      </button>
                    </div>
                  ))}
                </div>
              <button
                type="button"
                className="add-button small"
                onClick={() => {
                  addCertificate()
                  _setActivePanel({ type: 'certificate', index: certificates.length })
                }}
                disabled={isValidationBlocked}
              >
                + Add
              </button>
            </Accordion>

            
          </div>
        </section>
        <section className="panel panel-scroll">
          {/* Edit Form Panel */}
            {activePanel.type === 'education' ? renderEducation(activePanel.index) : null}
            {activePanel.type === 'employment' ? renderEmployment(activePanel.index) : null}
            {activePanel.type === 'training' ? renderTraining(activePanel.index) : null}
            {activePanel.type === 'certificate' ? renderCertificate(activePanel.index) : null}
            {activePanel.type === 'list' ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                <p>← Select an item in the sidebar to edit</p>
              </div>
            ) : null}
        </section>
      </div>
    </div>
  )
}

export default ApplicantDetailsPage
