import { useState, useEffect, useRef, useCallback, useMemo } from 'react'
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
  onNavigationGuardChange?: (
    guard: { blocked: boolean; discardCurrentItem: () => Promise<void> } | null,
  ) => void
    trainingDuplicateWarnings?: Record<number, { attemptedValue: string; lastValid: string }>
    certificateDuplicateWarnings?: Record<number, { attemptedValue: string; lastValid: string }>
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
  validationErrors,
  onNavigationGuardChange,
  trainingDuplicateWarnings = {},
  certificateDuplicateWarnings = {},
}: ApplicantDetailsPageProps) => {
  const today = new Date().toISOString().split('T')[0]
  const currentMonth = new Date().toISOString().slice(0, 7)
  const currentYear = new Date().getFullYear()

  const normalizePhoneInput = (value: string) => {
    return value.replace(/\s+/g, '').slice(0, 20)
  }

  const blockNonDigitKey = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.ctrlKey || e.metaKey) return
    const allowed = ['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Home', 'End', 'Tab']
    if (allowed.includes(e.key)) return
    if (!/^[0-9]$/.test(e.key)) e.preventDefault()
  }

  const isValidPhoneNumber = (value: string) => {
    if (!value) return false;
    
    // Strip all non-numeric characters first
    const digits = value.replace(/\D/g, '');
    
    // Mobile (Philippines): strictly starts with 09 and is exactly 11 digits total
    return /^09\d{9}$/.test(digits);
  }

  const navigate = useNavigate()
  const onboardingFieldTotal = 4
  const onboardingFieldsComplete = [
    applicant.homeAddress?.trim(),
    applicant.phoneNumber?.trim(),
    applicant.citizenshipStatus?.trim(),
    applicant.hasCriminalHistory === null ? '' : 'ok',
  ].filter(Boolean).length
  const [activePanel, setActivePanel] = useState<ActivePanel>({ type: 'list' })
  const [clickedPanel, setClickedPanel] = useState<ActivePanel>({type: 'list'})
  const [openSections, setOpenSections] = useState<string[]>(['education', 'employment', 'training', 'certificate'])
  const [showSectionSwitchModal, setShowSectionSwitchModal] = useState(false)

  const isPanelComplete = useCallback(
    (panel: ActivePanel) => {
      const panelHasErrors = (fieldPath: string) =>
        validationErrors.some((error) => error.field === fieldPath || error.field.startsWith(`${fieldPath}.`))

      if (panel.type === 'education') {
        const entry = education[panel.index]
        if (!entry) return true
        const isValid =
          entry.schoolName !== '' &&
          entry.degreeReceived !== '' &&
          entry.programName !== '' &&
          entry.schoolLocation !== '' &&
          entry.startYear !== '' &&
          (entry.isCurrent || entry.endYear !== '')
        return isValid && !panelHasErrors(`education.${panel.index}`)
      }

      if (panel.type === 'employment') {
        const entry = employmentHistory[panel.index]
        if (!entry) return true
        const isValid =
          entry.companyName !== '' &&
          entry.workPosition !== '' &&
          entry.companyAddress !== '' &&
          entry.startDate !== '' &&
          (entry.isEmployed || entry.endDate !== '')
        return isValid && !panelHasErrors(`employmentHistory.${panel.index}`)
      }

      if (panel.type === 'training') {
        const entry = trainings[panel.index]
        if (!entry) return true
        const isValid =
          entry.trainingTitle !== '' &&
          entry.trainingInstructor !== '' &&
          entry.trainingDurationHours !== '' &&
          entry.completionDate !== ''
        return isValid && !panelHasErrors(`trainings.${panel.index}`)
      }

      if (panel.type === 'certificate') {
        const entry = certificates[panel.index]
        if (!entry) return true
        const isValid =
          entry.certificateName !== '' &&
          entry.issuingAuthority !== '' &&
          entry.validityMonths !== '' &&
          entry.dateIssued !== ''
        return isValid && !panelHasErrors(`certificates.${panel.index}`)
      }

      return true
    },
    [certificates, education, employmentHistory, trainings, validationErrors],
  )

  const removeEducationRef = useRef(removeEducation)
  const removeEmploymentRef = useRef(removeEmployment)
  const removeTrainingRef = useRef(removeTraining)
  const removeCertificateRef = useRef(removeCertificate)

  useEffect(() => {
    removeEducationRef.current = removeEducation
    removeEmploymentRef.current = removeEmployment
    removeTrainingRef.current = removeTraining
    removeCertificateRef.current = removeCertificate
  }, [removeEducation, removeEmployment, removeTraining, removeCertificate])

  const discardActivePanelItem = useCallback(
    async (nextPanel: ActivePanel = { type: 'list' }) => {
      try {
        if (activePanel.type === 'education') {
          await removeEducationRef.current?.(activePanel.index)
        } else if (activePanel.type === 'employment') {
          await removeEmploymentRef.current?.(activePanel.index)
        } else if (activePanel.type === 'training') {
          await removeTrainingRef.current?.(activePanel.index)
        } else if (activePanel.type === 'certificate') {
          await removeCertificateRef.current?.(activePanel.index)
        }
      } catch (err) {
        console.error('Failed to discard item before switching:', err)
      }
      setActivePanel(nextPanel)
      setShowSectionSwitchModal(false)
    },
    [activePanel],
  )

  const _setActivePanel = (panel: ActivePanel) => {
    // If switching to or from the list, allow immediately
    if (activePanel.type === 'list' || panel.type === 'list') {
      setActivePanel(panel)
      return
    }

    // If current editor is complete (no missing required fields / validation errors), allow switching
    if (isPanelComplete(activePanel)) {
      setActivePanel(panel)
      return
    }

    // Otherwise prompt the user
    setClickedPanel(panel)
    setShowSectionSwitchModal(true)
  }

  const handleDiscardAndSwitch = async () => {
    await discardActivePanelItem(clickedPanel)
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

  const serializeCurrentState = useCallback(() => {
    try {
      return JSON.stringify({ applicant, education, employmentHistory, trainings, certificates })
    } catch {
      return null
    }
  }, [applicant, education, employmentHistory, trainings, certificates])

  // 2. TRUE UNMOUNT SAVE: Empty dependency array means this ONLY runs when leaving the page
  const lastSavedSerializedRef = useRef<string | null>(null)
  const latestSerializedSnapshotRef = useRef<string | null>(null)
  const isSyncingRef = useRef(false)

  // Initialize baseline serialized snapshot to avoid an immediate sync when nothing changed
  useEffect(() => {
    const snapshot = serializeCurrentState()
    lastSavedSerializedRef.current = snapshot
    latestSerializedSnapshotRef.current = snapshot
    return () => {
      // On unmount, only persist if current state differs from last saved snapshot
      try {
        const current = latestSerializedSnapshotRef.current ?? serializeCurrentState()
        if (current !== lastSavedSerializedRef.current) {
          syncRef.current?.().catch(console.error)
        }
      } catch {
        syncRef.current?.().catch(console.error)
      }
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  // 3. SMART AUTO-SAVE: Debounces network requests by 2 seconds, only when data actually changed
  useEffect(() => {
    const serialized = serializeCurrentState()
    latestSerializedSnapshotRef.current = serialized

    if (!serialized || serialized === lastSavedSerializedRef.current || isSyncingRef.current) {
      return
    }

    let cancelled = false
    const timer = setTimeout(async () => {
      if (cancelled || isSyncingRef.current) return
      if (latestSerializedSnapshotRef.current === lastSavedSerializedRef.current) return
      isSyncingRef.current = true
      try {
        await syncRef.current?.()
        lastSavedSerializedRef.current = latestSerializedSnapshotRef.current ?? serialized
      } catch (err) {
        console.error(err)
      } finally {
        isSyncingRef.current = false
      }
    }, 2000)

    return () => {
      cancelled = true
      clearTimeout(timer)
    }
  }, [serializeCurrentState])

  const navigationGuard = useMemo(() => {
    if (activePanel.type === 'list' || isPanelComplete(activePanel)) {
      return null
    }

    return {
      blocked: true,
      discardCurrentItem: () => discardActivePanelItem({ type: 'list' }),
    }
  }, [activePanel, discardActivePanelItem, isPanelComplete])

  useEffect(() => {
    onNavigationGuardChange?.(navigationGuard)
  }, [navigationGuard, onNavigationGuardChange])

  useEffect(() => {
    return () => {
      onNavigationGuardChange?.(null)
    }
  }, [onNavigationGuardChange])

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

  //get month from "2023-08" format and convert to "Aug, 2023"
  const getMonthName = (month: string) => {
    const months = [
      'Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun',
      'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'
    ]
    return months[parseInt(month) - 1]
  }

  const formatEmploymentTitle = (item: EmploymentHistory) => item.companyName || 'Company'
  const formatEmploymentRange = (item: EmploymentHistory) => {
    if (!item.startDate) return ''
    const startArr = item.startDate.split('-')
    const endArr = item.endDate ? item.endDate.split('-') : null

    const [startYear, startMonth] = [startArr[0], startArr[1]]

    const endString = item.isEmployed ? 'Present' : endArr ? `${getMonthName(endArr[1])}, ${endArr[0]}` : ''

    return `${getMonthName(startMonth)}, ${startYear}${endString ? ` – ${endString}` : ''}`
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

  const renderEditorHeader = (title: string, onRemove?: () => void) => (
    <div className="section-editor-header">
      <h2>{title}</h2>
      {onRemove ? (
        <button type="button" className="remove-button" onClick={onRemove}>
          Remove
        </button>
      ) : null}
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
        {renderEditorHeader(`Education`, () => {
          void removeEducation(index)
          _setActivePanel({ type: 'list' })
        })}
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
            <p className={entry.isCurrent ? 'disabled-label' : 'required-asterisk'}>End Year</p>
            <div className="flex-row">

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
              style={{ opacity: entry.isCurrent ? 0.5 : 1, cursor: entry.isCurrent ? 'not-allowed' : 'auto', flex: '3' }}
              />
            {renderFieldError(`education.${index}.endYear`)}
            <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '1em' }}>
                <input
                  type="checkbox"
                  checked={entry.isCurrent ?? false}
                  onChange={(event) => updateEducation(index, 'isCurrent', event.target.checked)}
                  style={{ width: 'auto', margin: 0 }}
                  />
                <span>Currently Attending</span>
              </label>
            </div>
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
        </div>
        <button
          type="button"
          className={`back-button tall-btn ${isValid && !hasEducationErrors ? '' : 'disabled-btn'}`}
          onClick={() => _setActivePanel({ type: 'list' })}
          disabled={!(isValid && !hasEducationErrors)}
        >
          Submit
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
          {renderEditorHeader(`Employment`, () => {
            void removeEmployment(index)
            _setActivePanel({ type: 'list' })
          })}
          <div className="form-grid">
            <label>
              <p className="required-asterisk">Company Name</p>
              <SmartCombobox
                fetchUrl="/backend/api/companies/list.php"
                valueName={entry.companyName}
                valueId={entry.companyId != null ? String(entry.companyId) : null}
                placeholder="e.g., Tech Solutions Inc."
                onChange={({ name, id, location, phone }) => {
                  updateEmployment(index, 'companyName', name)
                  updateEmployment(index, 'companyId', id || '')
                  if (location !== undefined) {
                    updateEmployment(index, 'companyAddress', location || '')
                  }
                  if (phone !== undefined && phone !== null) {
                    updateEmployment(index, 'companyPhone', String(phone))
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
                maxLength={20}
                value={entry.companyPhone ?? ''}
                onChange={(event) =>
                  updateEmployment(index, 'companyPhone', normalizePhoneInput(event.target.value))
                }
                onKeyDown={blockNonDigitKey}
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
              <p className="">Reason For Leaving</p>
              <input
                value={entry.reasonForLeaving ?? ''}
                onChange={(event) => updateEmployment(index, 'reasonForLeaving', event.target.value)}
                placeholder="e.g., Career growth, Relocation"
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
            <label>
              <p className={entry.isEmployed ? 'disabled-label' : 'required-asterisk'}>End Date</p>
              <div className="flex-row">

              <input
                type="month"
                value={entry.endDate}
                min={entry.startDate || undefined}
                max={currentMonth}
                onChange={(event) => updateEmployment(index, 'endDate', event.target.value)}
                disabled={entry.isEmployed ?? false}
                style={{ opacity: entry.isEmployed ? 0.5 : 1, cursor: entry.isEmployed ? 'not-allowed' : 'auto', flex: '3' }}
                />
              {renderFieldError(`employmentHistory.${index}.endDate`)}
              <label style={{ display: 'flex', alignItems: 'center', gap: '8px', margin: '1em' }}>
                <input
                  type="checkbox"
                  checked={entry.isEmployed ?? false}
                  onChange={(event) => updateEmployment(index, 'isEmployed', event.target.checked)}
                  style={{ width: 'auto', margin: 0}}
                />
                <span>Currently Employed</span>
              </label>
                  </div>
            </label>
          </div>
          <button
            type="button"
            className={`back-button tall-btn ${isValid && !hasEmploymentErrors ? '' : 'disabled-btn'}`}
            onClick={() => _setActivePanel({ type: 'list' })}
            disabled={!(isValid && !hasEmploymentErrors)}
          >
            Submit
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
          {renderEditorHeader(`Training`, () => {
            void removeTraining(index)
            _setActivePanel({ type: 'list' })
          })}
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
               {trainingDuplicateWarnings[index] ? (
                 <div
                   style={{
                     backgroundColor: '#fef3c7',
                     border: '1px solid #fbbf24',
                     borderRadius: '6px',
                     padding: '10px 12px',
                     marginBottom: '12px',
                     color: '#92400e',
                   }}
                 >
                   <strong>⚠️ Duplicate Training Title</strong>
                   <p style={{ margin: '8px 0 0 0' }}>
                     A training with title "{trainingDuplicateWarnings[index].attemptedValue}" already exists.
                   </p>
                   <p style={{ margin: '4px 0 0 0' }}>
                     Using last valid: "{trainingDuplicateWarnings[index].lastValid}"
                   </p>
                 </div>
               ) : null}
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
            className={`back-button tall-btn ${!hasTrainingError &&
              entry.trainingTitle !== '' &&
              entry.trainingInstructor !== '' &&
              entry.trainingDurationHours !== '' &&
              entry.completionDate !== ''
              ? ''
              : 'disabled-btn'}`}
            onClick={() => _setActivePanel({ type: 'list' })}
            disabled={!(!hasTrainingError &&
              entry.trainingTitle !== '' &&
              entry.trainingInstructor !== '' &&
              entry.trainingDurationHours !== '' &&
               entry.completionDate !== '' &&
               !trainingDuplicateWarnings[index])}
          >
            Submit
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
          {renderEditorHeader(`Certificate`, () => {
            void removeCertificate(index)
            _setActivePanel({ type: 'list' })
          })}
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
               {certificateDuplicateWarnings[index] ? (
                 <div
                   style={{
                     backgroundColor: '#fef3c7',
                     border: '1px solid #fbbf24',
                     borderRadius: '6px',
                     padding: '10px 12px',
                     marginBottom: '12px',
                     color: '#92400e',
                   }}
                 >
                   <strong>⚠️ Duplicate Certificate Name</strong>
                   <p style={{ margin: '8px 0 0 0' }}>
                     A certificate with name "{certificateDuplicateWarnings[index].attemptedValue}" already exists.
                   </p>
                   <p style={{ margin: '4px 0 0 0' }}>
                     Using last valid: "{certificateDuplicateWarnings[index].lastValid}"
                   </p>
                 </div>
               ) : null}
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
            className={`back-button tall-btn ${!hasCertificateError &&
              entry.certificateName !== '' &&
              entry.issuingAuthority !== '' &&
              entry.validityMonths !== '' &&
              entry.dateIssued !== ''
              ? ''
              : 'disabled-btn'}`}
            onClick={() => _setActivePanel({ type: 'list' })}
            disabled={!(!hasCertificateError &&
              entry.certificateName !== '' &&
              entry.issuingAuthority !== '' &&
              entry.validityMonths !== '' &&
               entry.dateIssued !== '' &&
               !certificateDuplicateWarnings[index])}
          >
            Submit
          </button>
        </div>
      )
    }

  return (
    <div className="page-shell">
      {showSectionSwitchModal ? (
        <div className="modal-backdrop center-align" role="dialog" aria-modal="true" aria-labelledby="section-switch-title">
          <div className="modal">
            <h3 id="section-switch-title">Finish this section first.</h3>
            <p>Please provide the required fields before editing another one.</p>
            <div className="form-actions">
              <button
                type="button"
                className="outline-button"
                onClick={() => setShowSectionSwitchModal(false)}
              >
                Continue editing
              </button>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  void handleDiscardAndSwitch()
                }}
              >
                Discard and switch
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

            {/* Profile summary (required fields) */}
            <div className="profile-edit-summary">
              <div className="profile-summary-card profile-summary-card--accent profile-summary-card--checklist">
                <span className="profile-summary-label">Required fields</span>
                <strong>{onboardingFieldsComplete}/{onboardingFieldTotal} complete</strong>
                <div className="profile-checklist-popover" aria-hidden="true">
                  <p className="profile-section-eyebrow">Checklist</p>
                  <p><strong>Finish these to skip the prompt on sign in.</strong></p>
                  <ul className="profile-checklist">
                    <li>Home address</li>
                    <li>Phone number</li>
                    <li>Citizenship status</li>
                    <li>Criminal history response</li>
                  </ul>
                </div>
              </div>
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
                  
                />
              </div>
              <div className="form-group">
                <label htmlFor="phoneNumber">Phone Number</label>
                <input
                  id="phoneNumber"
                  type="tel"
                  maxLength={20}
                  value={applicant.phoneNumber || ''}
                  onChange={(e) => updateApplicant('phoneNumber', normalizePhoneInput(e.target.value))}
                  onKeyDown={blockNonDigitKey}
                  
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
                  // wait a tick so the new item appears in `trainings` props
                  setTimeout(() => _setActivePanel({ type: 'training', index: trainings.length }), 0)
                }}
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
                  // wait a tick so the new item appears in `certificates` props
                  setTimeout(() => _setActivePanel({ type: 'certificate', index: certificates.length }), 0)
                }}
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
