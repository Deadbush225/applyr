import { useState, type FormEvent } from 'react'

type Props = {
  isOpen: boolean
  onClose: () => void
  onCreate: (payload: { appliedPosition: string; JobApplicationDate: string; agreesToDrugTest: boolean }) => Promise<void> | void
}

const NewApplicationModal = ({ isOpen, onClose, onCreate }: Props) => {
  const [appliedPosition, setAppliedPosition] = useState('')
  const [jobDate, setJobDate] = useState(new Date().toISOString().slice(0, 10))
  const [agrees, setAgrees] = useState(false)
  const [error, setError] = useState('')

  if (!isOpen) return null

  const handleSubmit = async (e: FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    setError('')
    if (!appliedPosition.trim()) {
      setError('Applied position is required')
      return
    }
    await onCreate({ appliedPosition: appliedPosition.trim(), JobApplicationDate: jobDate, agreesToDrugTest: agrees })
    onClose()
  }

  return (
    <div className="modal-backdrop">
      <div className="modal">
        <h3>Create New Application</h3>
        <form onSubmit={handleSubmit} className='form-grid'>
          <label>
            <p className='required-asterisk'>
              Applied Position
            </p>
            <input value={appliedPosition} onChange={(e) => setAppliedPosition(e.target.value)} />
          </label>
          <label>
            Application Date
            <input type="date" value={jobDate} onChange={(e) => setJobDate(e.target.value)} />
          </label>
          <label className="modal-checkbox-row">
            <input type="checkbox" checked={agrees} onChange={(e) => setAgrees(e.target.checked)} />
            <span>I agree to drug testing</span>
          </label>
          {error ? <p style={{ color: '#c93b3b' }}>{error}</p> : null}
          <div style={{ display: 'flex', gap: 8, justifyContent: 'flex-end', marginTop: 12, width: '100%' }}>
            <button type="button" className="outline-button" onClick={onClose}>Cancel</button>
            <button type="submit" className="primary-button">Create</button>
          </div>
        </form>
      </div>
    </div>
  )
}

export default NewApplicationModal
