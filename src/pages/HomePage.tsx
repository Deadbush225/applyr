import { useMemo, useState, type FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import ApplicationThumbnail from '../components/ApplicationThumbnail'
import type {
  Applicant,
  ApplicantReference,
  Education,
  EmploymentHistory,
  JobApplication,
  Training,
  Certificate,
} from '../types'

export type AuthSession = {
  token: string
  user: { id: string; email: string; name?: string }
}

type HomePageProps = {
  applicant: Applicant
  jobApplications: JobApplication[]
  activeJobApplicationId: string
  resumeTemplate: 'classic' | 'compact' | 'modern'
  previewFont: string
  education: Education[]
  employmentHistory: EmploymentHistory[]
  references: ApplicantReference[]
  trainings: Training[]
  certificates: Certificate[]
  authSession: AuthSession | null
  isAuthLoading: boolean
  authError: string
  onLogin: (email: string, password: string) => Promise<void>
  onSignup: (name: string, email: string, password: string) => Promise<void>
  onLogout: () => void
  onAddJobApplication: () => string
}

const formatDate = (value: string) => {
  if (!value) {
    return 'Not set'
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return parsed.toLocaleDateString()
}

const formatTime = (value: string) => {
  if (!value) {
    return 'Not set'
  }
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) {
    return value
  }
  return parsed.toLocaleString()
}

const HomePage = ({
  applicant,
  jobApplications,
  activeJobApplicationId,
  resumeTemplate,
  previewFont,
  education,
  employmentHistory,
  references,
  trainings,
  certificates,
  authSession,
  isAuthLoading,
  authError,
  onLogin,
  onSignup,
  onLogout,
  onAddJobApplication,
}: HomePageProps) => {
  const navigate = useNavigate()
  const [mode, setMode] = useState<'login' | 'signup'>('login')
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [name, setName] = useState('')

  const sortedApplications = useMemo(
    () =>
      [...jobApplications].sort((a, b) =>
        a.JobApplicationDate.localeCompare(b.JobApplicationDate),
      ),
    [jobApplications],
  )

  const handleSubmit = async (event: FormEvent) => {
    event.preventDefault()
    if (mode === 'login') {
      await onLogin(email, password)
    } else {
      await onSignup(name, email, password)
    }
  }

  return (
    <div className="home-shell">
      <header className="home-header">
        <div>
          <p className="kicker">Welcome to Applyr</p>
          <h1>Track and craft your applications</h1>
        </div>
        {authSession ? (
          <div className="home-actions">
            <button type="button" className="outline-button" onClick={onLogout}>
              Log out
            </button>
            <button
              type="button"
              className="primary-button"
              onClick={() => {
                const nextId = onAddJobApplication()
                navigate(`/editor/${nextId}`)
              }}
            >
              + New Application
            </button>
          </div>
        ) : null}
      </header>

      {!authSession ? (
        <section className="auth-panel">
          <div className="auth-toggle">
            <button
              type="button"
              className={mode === 'login' ? 'is-active' : ''}
              onClick={() => setMode('login')}
            >
              Log in
            </button>
            <button
              type="button"
              className={mode === 'signup' ? 'is-active' : ''}
              onClick={() => setMode('signup')}
            >
              Sign up
            </button>
          </div>
          <form className="auth-form" onSubmit={handleSubmit}>
            {mode === 'signup' ? (
              <label>
                Full Name
                <input value={name} onChange={(event) => setName(event.target.value)} />
              </label>
            ) : null}
            <label>
              Email
              <input
                type="email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
              />
            </label>
            <label>
              Password
              <input
                type="password"
                value={password}
                onChange={(event) => setPassword(event.target.value)}
              />
            </label>
            {authError ? <p className="auth-error">{authError}</p> : null}
            <button type="submit" className="primary-button" disabled={isAuthLoading}>
              {isAuthLoading ? 'Working...' : mode === 'login' ? 'Log in' : 'Create account'}
            </button>
          </form>
        </section>
      ) : (
        <section className="home-grid">
          {sortedApplications.length === 0 ? (
            <div className="empty-card">
              <h2>No applications yet</h2>
              <p>Create your first application to see it here.</p>
              <button
                type="button"
                className="primary-button"
                onClick={() => {
                  const nextId = onAddJobApplication()
                  navigate(`/editor/${nextId}`)
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
                  <ApplicationThumbnail
                    applicant={applicant}
                    jobApplication={application}
                    education={education}
                    employmentHistory={employmentHistory}
                    references={references}
                    trainings={trainings}
                    certificates={certificates}
                    previewFont={previewFont}
                    resumeTemplate={resumeTemplate}
                  />
                </div>
                <div className="application-meta">
                  <h3>{application.appliedPosition || `Application ${index + 1}`}</h3>
                  <p>Applied: {formatDate(application.JobApplicationDate)}</p>
                  <p>Updated: {formatTime(application.lastUpdated)}</p>
                  <span className="application-chip">Open</span>
                </div>
              </Link>
            ))
          )}
        </section>
      )}
    </div>
  )
}

export default HomePage
