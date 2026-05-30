import { useState, type FormEvent } from "react";
import { useNavigate } from "react-router-dom";
import type { Applicant } from "../types";
import type { AuthSession } from "../services/auth";
import GroupBox from "../components/GroupBox";
import Password from "../components/Password";

type ApplicantEditPageProps = {
	applicant: Applicant;
	authSession: AuthSession | null;
	onSaveApplicant: (payload: {
		applicantName: string;
		homeAddress: string;
		phoneNumber: string;
		emailAddress: string;
		linkedInUrl: string;
		citizenshipStatus: string;
		hasCriminalHistory: boolean | null;
		currentPassword: string;
		newPassword: string;
	}) => Promise<void>;
};

const ApplicantEditPage = ({
	applicant,
	authSession,
	onSaveApplicant,
}: ApplicantEditPageProps) => {
	const navigate = useNavigate();
	const [applicantName, setApplicantName] = useState(applicant.applicantName);
	const [homeAddress, setHomeAddress] = useState(applicant.homeAddress);
	const [phoneNumber, setPhoneNumber] = useState(applicant.phoneNumber);
	const [emailAddress, setEmailAddress] = useState(applicant.emailAddress);
	const [linkedInUrl, setLinkedInUrl] = useState(applicant.linkedInUrl);
	const [citizenshipStatus, setCitizenshipStatus] = useState(
		applicant.citizenshipStatus,
	);
	const [hasCriminalHistory, setHasCriminalHistory] = useState<boolean | null>(
		applicant.hasCriminalHistory,
	);
	const [currentPassword, setCurrentPassword] = useState("");
	const [newPassword, setNewPassword] = useState("");
	const [confirmPassword, setConfirmPassword] = useState("");
	const [error, setError] = useState("");
	const [message, setMessage] = useState("");

	const sanitizePhoneNumberInput = (value: string) => value.replace(/\s+/g, "").slice(0, 20);

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError("");
		setMessage("");

		const trimmedApplicantName = applicantName.trim();
		const trimmedPhoneNumber = sanitizePhoneNumberInput(phoneNumber);
		const hasNewPassword = newPassword.length > 0;

		if (hasNewPassword && currentPassword.length === 0) {
			setError("Current password is required to change your password.");
			return;
		}

		if (hasNewPassword && newPassword !== confirmPassword) {
			setError("New passwords do not match.");
			return;
		}

		try {
			await onSaveApplicant({
				applicantName: trimmedApplicantName || applicant.applicantName,
				homeAddress,
				phoneNumber: trimmedPhoneNumber,
				emailAddress,
				linkedInUrl,
				citizenshipStatus,
				hasCriminalHistory,
				currentPassword: hasNewPassword ? currentPassword : "",
				newPassword: hasNewPassword ? newPassword : "",
			});
			setMessage("Applicant profile updated.");
			navigate("/", { replace: true });
		} catch (err) {
			setError(
				err instanceof Error
					? err.message
					: "Unable to update applicant profile.",
			);
		}
	};

	const isValidPhoneNumber = (value: string) => {
		if (!value) return false;

		const digits = value.replace(/\D/g, "");

		return /^09\d{9}$/.test(digits);
	};

		const onboardingFieldTotal = 5
		const onboardingFieldsComplete = [
			applicantName.trim(),
			homeAddress.trim(),
			phoneNumber.trim(),
			citizenshipStatus.trim(),
			hasCriminalHistory === null ? '' : 'ok',
		].filter(Boolean).length

	return (
		<div className="page-shell profile-edit-shell">
			<section className="panel profile-edit-panel">
				<form className="profile-edit-form" onSubmit={handleSubmit}>
					<div className="profile-edit-grid">
						<div className="profile-edit-column">
					<p className="kicker">Personal details and account security</p>
							<GroupBox title="Change Name">
								<label>
									Applicant Name
									<input
										value={authSession?.user.name || applicant.applicantName}
										disabled
									/>
								</label>
								<label>
										New Full Name
									<input
										value={applicantName}
										onChange={(event) => setApplicantName(event.target.value)}
										placeholder="e.g., Juan Dela Cruz"
									/>
										<p className="profile-save-note">Leave this blank to keep your current name.</p>
								</label>
							</GroupBox>
							<GroupBox title="Change Password">
								<label>
										Current Password
										<Password value={currentPassword} onChange={setCurrentPassword} autocomplete="off" name="current-password-edit"/>
										<p className="profile-save-note">Required only when changing your password.</p>
								</label>
								<label>
									New Password
									<Password value={newPassword} onChange={setNewPassword} autocomplete="new-password" name="new-password" />
								</label>
								<label>
									<p className="required-asterisk">Confirm New Password</p>
									<Password value={confirmPassword} onChange={setConfirmPassword} autocomplete="new-password" name="confirm-new-password" />
								</label>
							</GroupBox>
						</div>

						<div className="profile-edit-column">
              
							<div className="profile-section-card">
								<div className="profile-section-heading">
                  <div>
                    <p className="profile-section-eyebrow">Required profile details</p>
                    <h2>Contact and eligibility</h2>
                  </div>
                  <div>
                    <div className="profile-edit-summary">
					<div className="profile-summary-card profile-summary-card--accent profile-summary-card--checklist">
						<span className="profile-summary-label">Required fields</span>
						<strong>{onboardingFieldsComplete}/{onboardingFieldTotal} complete</strong>
						<div className="profile-checklist-popover" aria-hidden="true">
							<p className="profile-section-eyebrow">Checklist</p>
						<p><strong>Finish these to skip the prompt on sign in.</strong></p>
							<ul className="profile-checklist">
								<li>Full name</li>
								<li>Home address</li>
								<li>Phone number</li>
								<li>Citizenship status</li>
								<li>Criminal history response</li>
							</ul>
						</div>
					</div>
				</div>
                  </div>
								</div>
								<div className="profile-field-list">
									<label>
										<p className="required-asterisk">Home Address</p>
										<input
											value={homeAddress}
											onChange={(event) => setHomeAddress(event.target.value)}
											placeholder="e.g., Manila, Philippines"
										/>
									</label>
									<label>
										<p className="required-asterisk">Phone Number</p>
										<input
											maxLength={20}
											inputMode="tel"
											value={phoneNumber}
											onChange={(event) => setPhoneNumber(sanitizePhoneNumberInput(event.target.value))}
											placeholder="e.g., 09171234567"
										/>
                    {phoneNumber ? (
                  isValidPhoneNumber(phoneNumber) ? (
                    <p style={{ color: '#15803d', fontSize: '0.85rem', marginTop: 6 }}>Valid phone number</p>
                  ) : (
                    <p style={{ color: '#dc2626', fontSize: '0.85rem', marginTop: 6 }}>Invalid phone number. Use mobile (09XXXXXXXXX).</p>
                  )
                ) : null}
									</label>
									<label>
										<p className="required-asterisk">Email Address</p>
										<input
											type="email"
											value={emailAddress}
											onChange={(event) => setEmailAddress(event.target.value)}
											placeholder="e.g., juan.delacruz@example.com"
										/>
									</label>
									<label>
										LinkedIn URL
										<input
											value={linkedInUrl}
											onChange={(event) => setLinkedInUrl(event.target.value)}
											placeholder="e.g., linkedin.com/in/juan-delacruz"
										/>
									</label>
									<label>
										<p className="required-asterisk">Citizenship Status</p>
										<select
											value={citizenshipStatus}
											onChange={(event) => setCitizenshipStatus(event.target.value)}
										>
											<option value="">Choose status</option>
											<option value="Citizen">Citizen</option>
											<option value="Permanent Resident">Permanent Resident</option>
											<option value="Visa">Visa</option>
											<option value="Other">Other</option>
										</select>
									</label>
									<label>
										<p className="required-asterisk">Has Criminal History</p>
										<select
											value={
												hasCriminalHistory === null
													? ''
													: hasCriminalHistory
														? 'yes'
														: 'no'
											}
											onChange={(event) =>
												setHasCriminalHistory(
													event.target.value === ''
														? null
														: event.target.value === 'yes',
												)
											}
										>
											<option value="">Choose</option>
											<option value="yes">Yes</option>
											<option value="no">No</option>
										</select>
									</label>
								</div>
							</div>

						</div>
						<div className="form-actions profile-form-actions">
					{error ? <p className="auth-error">{error}</p> : null}
					{message ? <p className="upload-note done">{message}</p> : null}
					<div className="profile-actions-center">
						<p className="profile-save-note">This will save all the settings above</p>
						<div className="profile-actions-buttons">
							<button
								type="button"
								className="outline-button"
								onClick={() => navigate('/')}
							>
								Cancel
							</button>
							<button type="submit" className="primary-button">
								Save Changes
							</button>
						</div>
					</div>
				</div>
					</div>
				</form>
			</section>
		</div>
	)
};

export default ApplicantEditPage;
