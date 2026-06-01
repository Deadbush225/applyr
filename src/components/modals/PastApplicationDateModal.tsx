type Props = {
  isOpen: boolean
  onClose: () => void
}

const PastApplicationDateModal = ({ isOpen, onClose }: Props) => {
  if (!isOpen) return null

  return (
    <div className="modal-backdrop center-align" role="dialog" aria-modal="true" aria-labelledby="past-application-date-title">
      <div className="modal">
        <h3 id="past-application-date-title">Application date needs attention</h3>
        <p>You are viewing a job application that is past its application date. Any changes will not be synced to the database unless you update the job application date.</p>
        <div className="form-actions">
          <button type="button" className="primary-button" onClick={onClose}>
            Got it
          </button>
        </div>
      </div>
    </div>
  )
}

export default PastApplicationDateModal