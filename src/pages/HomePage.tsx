import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ApplicationThumbnail from '../components/ApplicationThumbnail'
import type { AuthSession } from '../services/auth'
import type {
  Applicant,
  ApplicationResumeSettings,
  Education,
  EmploymentHistory,
  JobApplication,
  Training,
  Certificate,
} from '../types'

type HomePageProps = {
  applicant: Applicant
  jobApplications: JobApplication[]
  activeJobApplicationId: string
  resumeTemplate: 'classic' | 'compact' | 'modern'
  previewFont: string
  resumeSettingsMap: Record<string, ApplicationResumeSettings>
  education: Education[]
  employmentHistory: EmploymentHistory[]
  trainings: Training[]
  certificates: Certificate[]
  authSession: AuthSession | null
  isAuthLoading: boolean
  authError: string
  onLogin: (email: string, password: string) => Promise<void>
  onSignup: (name: string, email: string, password: string) => Promise<void>
  onAddJobApplication: () => string,
  onRequestNewApplication?: () => Promise<void> | void,
  registrationMessage?: string,
}

const formatDate = (value: string) => {
  if (!value) return 'Not set'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleDateString()
}

const formatTime = (value: string) => {
  if (!value) return 'Not set'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return value
  return parsed.toLocaleString()
}

const getStatusClass = (status?: string) => {
  const normalized = (status || 'pending').toLowerCase().replace(/[^a-z]+/g, '-')
  return `application-chip status-${normalized}`
}

// Simple Check Icon for the feature list
const CheckIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
    <polyline points="20 6 9 17 4 12"></polyline>
  </svg>
)

const HomePage = ({
  applicant,
  jobApplications,
  activeJobApplicationId,
  resumeTemplate,
  previewFont,
  resumeSettingsMap,
  education,
  employmentHistory,
  trainings,
  certificates,
  authSession,
  isAuthLoading,
  authError,
  onLogin,
  onSignup,
  onAddJobApplication,
  onRequestNewApplication,
  registrationMessage,
}: HomePageProps) => {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [name, setName] = useState('')
  const [localError, setLocalError] = useState('')

  const sortedApplications = useMemo(
    () =>
      [...jobApplications].sort((a, b) =>
        a.JobApplicationDate.localeCompare(b.JobApplicationDate),
      ),
    [jobApplications],
  )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    setLocalError('')

    if (mode === 'login') {
      await onLogin(email, password)
      return
    }

    if (password !== confirmPassword) {
      setLocalError('Passwords do not match.')
      return
    }

    await onSignup(name, email, password)
  }

  // ━━━━━━━━━━━━━━━━━━━━━━━━━ LOGGED OUT STATE (SPLIT SCREEN) ━━━━━━━━━━━━━━━━━━━━━━━━━━━
  if (!authSession) {
    return (
      <div className="auth-split-layout">
        <div className="auth-left-panel">
          <div className="auth-left-content">
            <span className="auth-badge">Applyr · Smart Job Applications</span>
            <h1>One profile. Many applications.<br />A better hiring journey.</h1>
            <p className="auth-hero-sub">
              Build a single applicant profile, apply in minutes, and track every step from submission to offer.
            </p>
            <ul className="auth-features">
              <li><CheckIcon /> Reusable profile and saved resumes</li>
              <li><CheckIcon /> Application status timeline and alerts</li>
              <li><CheckIcon /> Secure messaging and interview scheduling</li>
            </ul>
          </div>
        </div>

        <div className="auth-right-panel">
          <div className="auth-form-container">
            <div className="auth-tabs">
              <button
                type="button"
                className={mode === 'login' ? 'is-active' : ''}
                onClick={() => {
                  setMode('login')
                  setLocalError('')
                }}
              >
                Sign in
              </button>
              <button
                type="button"
                className={mode === 'signup' ? 'is-active' : ''}
                onClick={() => {
                  setMode('signup')
                  setLocalError('')
                }}
              >
                Create account
              </button>
            </div>

            <div key={mode} className="auth-form-transition">
              <div className="auth-header">
                <h2>{mode === 'login' ? 'Sign in to your account' : 'Create your account'}</h2>
                <p>Build your profile once and reuse it for every application.</p>
              </div>
              {registrationMessage ? <p className="upload-note done">{registrationMessage}</p> : null}

              <form className="auth-form" onSubmit={handleSubmit}>
                {mode === 'signup' && (
                  <label>
                    Full name
                    <input
                      required
                      value={name}
                      onChange={(event) => setName(event.target.value)}
                      placeholder="e.g. Dela Cruz, Juan"
                    />
                  </label>
                )}
                <label>
                  Email address
                  <input
                    required
                    type="email"
                    value={email}
                    onChange={(event) => setEmail(event.target.value)}
                    placeholder="email@example.com"
                  />
                </label>
                <label>
                  Password
                  <input
                    required
                    type="password"
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    placeholder="Enter your password"
                  />
                </label>
                {mode === 'signup' && (
                  <label>
                    Confirm password
                    <input
                      required
                      type="password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      placeholder="Re-enter your password"
                    />
                  </label>
                )}

                {(localError || authError) ? <p className="auth-error">{localError || authError}</p> : null}

                <button type="submit" className="primary-button submit-btn" disabled={isAuthLoading}>
                  {isAuthLoading ? 'Working...' : mode === 'login' ? 'Sign in' : 'Create account'}
                </button>
              </form>
            </div>

            <div className="auth-footer">
              {mode === 'login' ? (
                <p>
                  Don't have an account? <button type="button" onClick={() => setMode('signup')}>Create account</button>
                </p>
              ) : (
                <p>
                  Already have an account? <button type="button" onClick={() => setMode('login')}>Sign in</button>
                </p>
              )}
            </div>
          </div>
        </div>
      </div>
    )
  }

  return (
    <div className="home-shell">
      <header className="home-header">
        <div>
          <p className="kicker">Welcome to Applyr</p>
          <h1>Track and craft your applications</h1>
        </div>
        <div className="home-actions">
          <button
            type="button"
            className="primary-button"
            onClick={() => {
              if (onRequestNewApplication) {
                void onRequestNewApplication()
              } else {
                const nextId = onAddJobApplication()
                navigate(`/editor/${nextId}`)
              }
            }}
          >
            + New Application
          </button>
        </div>
      </header>

      <section className="home-grid">
        {sortedApplications.length === 0 ? (
          <div className="empty-card">
            <h2>No applications yet</h2>
            <p>Create your first application to see it here.</p>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                if (onRequestNewApplication) {
                  void onRequestNewApplication()
                } else {
                  const nextId = onAddJobApplication()
                  navigate(`/editor/${nextId}`)
                }
              }}
            >
              + Add application
            </button>
          </div>
        ) : (
          sortedApplications.map((application, index) => (
            <Link
              key={application.JobApplicationId}
              to={`/editor/${application.JobApplicationId}`}
              className={`application-card${
                application.JobApplicationId === activeJobApplicationId ? ' is-active' : ''
              }`}
            >
              <div className="application-thumbnail">
                {(() => {
                  const settings = resumeSettingsMap[application.JobApplicationId]
                  const appPreviewFont = settings?.previewFont ?? previewFont
                  const appResumeTemplate = settings?.resumeTemplate ?? resumeTemplate
                  return (
                    <ApplicationThumbnail
                      applicant={applicant}
                      jobApplication={application}
                      education={education}
                      employmentHistory={employmentHistory}
                      references={application.references || []}
                      trainings={trainings}
                      certificates={certificates}
                      previewFont={appPreviewFont}
                      resumeTemplate={appResumeTemplate}
                    />
                  )
                })()}
              </div>
              <div className="application-meta">
                <h3 className='application-meta-title'>{application.appliedPosition || `Application ${index + 1}`}

                <span className={getStatusClass(application.JobApplicationStatus)}>
                    {application.JobApplicationStatus || 'Pending'}
                  </span>
                </h3>
                <span className="flex-row">

                  <strong>Applied: </strong>
                <p>
                  {formatDate(application.JobApplicationDate)}</p>
                </span>
                
                <span className='flex-row'>
                  <strong>Updated: </strong>
                  <p>{formatTime(application.lastUpdated)}</p>
                </span>
              </div>
            </Link>
          ))
        )}
      </section>
    </div>
  )
}

export default HomePage