import { useState } from 'react'
import type { DragEvent } from 'react'
import type {
  Applicant,
  ApplicantReference,
  Education,
  EmploymentHistory,
  JobApplication,
} from '../types'
import {Accordion, SectionRow} from './Accordion'

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
  | { type: 'compliance' }

type ResumeAccordionProps = {
  applicant: Applicant
  jobApplication: JobApplication
  education: Education[]
  employmentHistory: EmploymentHistory[]
  references: ApplicantReference[]
  uploadState: UploadState
  previewFont: string
  onPreviewFontChange: (fontFamily: string) => void
  updateApplicant: <K extends keyof Applicant>(key: K, value: Applicant[K]) => void
  updateApplication: <K extends keyof JobApplication>(key: K, value: JobApplication[K]) => void
  updateEducation: (index: number, field: keyof Education, value: string) => void
  updateEmployment: (index: number, field: keyof EmploymentHistory, value: string) => void
  updateReference: (index: number, field: keyof ApplicantReference, value: string) => void
  addEducation: () => void
  removeEducation: (index: number) => void
  reorderEducation: (fromIndex: number, toIndex: number) => void
  addEmployment: () => void
  removeEmployment: (index: number) => void
  reorderEmployment: (fromIndex: number, toIndex: number) => void
  addReference: () => void
  removeReference: (index: number) => void
  reorderReferences: (fromIndex: number, toIndex: number) => void
  handleResumeUpload: (file: File | null) => Promise<void>
}

const ResumeAccordion = ({
  applicant,
  jobApplication,
  education,
  employmentHistory,
  references,
  uploadState,
  previewFont,
  onPreviewFontChange,
  updateApplicant,
  updateApplication,
  updateEducation,
  updateEmployment,
  updateReference,
  addEducation,
  removeEducation,
  reorderEducation,
  addEmployment,
  removeEmployment,
  reorderEmployment,
  addReference,
  removeReference,
  reorderReferences,
  handleResumeUpload,
}: ResumeAccordionProps) => {
  const [activePanel, setActivePanel] = useState<ActivePanel>({ type: 'list' })
  const [dragEducationIndex, setDragEducationIndex] = useState<number | null>(null)
  const [dragEmploymentIndex, setDragEmploymentIndex] = useState<number | null>(null)
  const [dragReferenceIndex, setDragReferenceIndex] = useState<number | null>(null)

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

  const renderList = () => (
    <div className="section-list" aria-label="Resume sections">
      <div className="section-group">
        <h3 className="section-group-title">Base</h3>
        <Accordion title="Resume Template" subtitle="Choose your resume template">
          <div className="form-grid">
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
          </div>
        </Accordion>
    
        <SectionRow
          title="Contact Info"
          subtitle="Name, address, and position"
          callback={() => setActivePanel({ type: 'contact' })}
        />
  
        <SectionRow
          title="Compliance & Upload"
          subtitle="Agreements and resume file"
          callback={() => setActivePanel({ type: 'compliance' })}
        />

        <Accordion title="Education">
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
              <span className="row-title">{entry.schoolName || `Education ${index + 1}`}</span>
              <span className="row-subtitle">{entry.degreeReceived || 'Degree'}</span>
            </button>
            <button type="button" className="row-remove" onClick={() => removeEducation(index)}>
              Remove
            </button>
          </div>
        ))}
            <button type="button" className="add-button small" onClick={addEducation}>
              + Add
            </button>
          </div>
        </Accordion>
    
      <Accordion title="Employment">
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
              <span className="row-subtitle">{entry.workPosition || 'Role'}</span>
            </button>
            <button type="button" className="row-remove" onClick={() => removeEmployment(index)}>
              Remove
            </button>
          </div>
        ))}
        <button type="button" className="add-button small" onClick={addEmployment}>
            + Add
          </button>
      </Accordion>

      <Accordion title="References">
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
<button type="button" className="add-button small" onClick={addReference}>
            + Add
          </button>
      </Accordion>
      </div>
    </div>
  )

  const renderEditorHeader = (title: string, onBack: () => void) => (
    <div className="section-editor-header">
      <button type="button" className="back-button" onClick={onBack}>
        Back
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
      {renderEditorHeader('Contact Info', () => setActivePanel({ type: 'list' }))}
      <div className="form-grid">
        <label>
          Full Name*
          <input
            value={applicant.applicantName}
            onChange={(event) => updateApplicant('applicantName', event.target.value)}
            placeholder="Jane Example"
          />
        </label>
        <label>
          Home Address*
          <input
            value={applicant.homeAddress}
            onChange={(event) => updateApplicant('homeAddress', event.target.value)}
            placeholder="123 Main St, City, ST"
          />
        </label>
        <label>
          Phone Number*
          <input
            value={applicant.phoneNumber}
            onChange={(event) => updateApplicant('phoneNumber', event.target.value)}
            placeholder="555-0134"
          />
        </label>
        <label>
          Email Address*
          <input
            type="email"
            value={applicant.emailAddress}
            onChange={(event) => updateApplicant('emailAddress', event.target.value)}
            placeholder="jane@example.com"
          />
        </label>
        <label>
          LinkedIn URL
          <input
            value={applicant.linkedInUrl}
            onChange={(event) => updateApplicant('linkedInUrl', event.target.value)}
            placeholder="https://linkedin.com/in/jane"
          />
        </label>
        <label>
          Citizenship Status*
          <select
            value={applicant.citizenshipStatus}
            onChange={(event) => updateApplicant('citizenshipStatus', event.target.value)}
          >
            <option value="">Choose status</option>
            <option value="Citizen">Citizen</option>
            <option value="Permanent Resident">Permanent Resident</option>
            <option value="Visa Holder">Visa Holder</option>
            <option value="Other">Other</option>
          </select>
        </label>
        <label>
          Applied Position*
          <input
            value={jobApplication.appliedPosition}
            onChange={(event) => updateApplication('appliedPosition', event.target.value)}
            placeholder="Frontend Engineer"
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
            placeholder="85000"
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

    return (
      <div className="section-editor">
        {renderEditorHeader(`Education ${index + 1}`, () => setActivePanel({ type: 'list' }))}
        <div className="form-grid">
          <label>
            School Name*
            <input
              value={entry.schoolName}
              onChange={(event) => updateEducation(index, 'schoolName', event.target.value)}
            />
          </label>
          <label>
            School Location*
            <input
              value={entry.schoolLocation}
              onChange={(event) => updateEducation(index, 'schoolLocation', event.target.value)}
            />
          </label>
          <label>
            Years Attended*
            <input
              value={entry.yearsAttended}
              onChange={(event) => updateEducation(index, 'yearsAttended', event.target.value)}
              placeholder="2019 - 2023"
            />
          </label>
          <label>
            Degree Received*
            <input
              value={entry.degreeReceived}
              onChange={(event) => updateEducation(index, 'degreeReceived', event.target.value)}
            />
          </label>
          <label>
            Program Name
            <input
              value={entry.programName}
              onChange={(event) => updateEducation(index, 'programName', event.target.value)}
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

    return (
      <div className="section-editor">
        {renderEditorHeader(`Employment ${index + 1}`, () => setActivePanel({ type: 'list' }))}
        <div className="form-grid">
          <label>
            Company Name*
            <input
              value={entry.companyName}
              onChange={(event) => updateEmployment(index, 'companyName', event.target.value)}
            />
          </label>
          <label>
            Work Address*
            <input
              value={entry.workAddress}
              onChange={(event) => updateEmployment(index, 'workAddress', event.target.value)}
            />
          </label>
          <label>
            Work Position*
            <input
              value={entry.workPosition}
              onChange={(event) => updateEmployment(index, 'workPosition', event.target.value)}
            />
          </label>
          <label>
            Reason For Leaving*
            <input
              value={entry.reasonForLeaving}
              onChange={(event) => updateEmployment(index, 'reasonForLeaving', event.target.value)}
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
        {renderEditorHeader(`Reference ${index + 1}`, () => setActivePanel({ type: 'list' }))}
        <div className="form-grid">
          <label>
            Name*
            <input
              value={entry.referenceName}
              onChange={(event) => updateReference(index, 'referenceName', event.target.value)}
            />
          </label>
          <label>
            Title*
            <input
              value={entry.referenceTitle}
              onChange={(event) => updateReference(index, 'referenceTitle', event.target.value)}
            />
          </label>
          <label>
            Company*
            <input
              value={entry.referenceCompany}
              onChange={(event) => updateReference(index, 'referenceCompany', event.target.value)}
            />
          </label>
          <label>
            Phone*
            <input
              value={entry.referencePhone}
              onChange={(event) => updateReference(index, 'referencePhone', event.target.value)}
            />
          </label>
          <label>
            Email
            <input
              type="email"
              value={entry.referenceEmail}
              onChange={(event) => updateReference(index, 'referenceEmail', event.target.value)}
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

  const renderCompliance = () => (
    <div className="section-editor">
      {renderEditorHeader('Compliance & Upload', () => setActivePanel({ type: 'list' }))}
      <div className="form-grid">
        <label>
          Have you ever had a criminal conviction?*
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
          Do you agree to a drug test?*
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

        <label>
          Upload Resume (PDF)*
          <input
            type="file"
            accept="application/pdf"
            onChange={(event) => {
              const file = event.target.files?.[0] ?? null
              void handleResumeUpload(file)
            }}
          />
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
      {activePanel.type === 'compliance' ? renderCompliance() : null}
    </div>
  )
}

export default ResumeAccordion
