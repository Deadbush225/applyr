import { useEffect, useState, type FormEvent } from "react";
import { useNavigate, useLocation } from "react-router-dom";
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
	const location = useLocation();
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

	useEffect(() => {
		setApplicantName(applicant.applicantName);
		setHomeAddress(applicant.homeAddress);
		setPhoneNumber(applicant.phoneNumber);
		setEmailAddress(applicant.emailAddress);
		setLinkedInUrl(applicant.linkedInUrl);
		setCitizenshipStatus(applicant.citizenshipStatus);
		setHasCriminalHistory(applicant.hasCriminalHistory);
	}, [applicant]);

	// Auto-redirect if all onboarding fields are complete **and** the user
	// arrived here as part of the onboarding flow.
	useEffect(() => {
		const fieldsComplete = [
			applicant.applicantName.trim(),
			applicant.homeAddress.trim(),
			applicant.phoneNumber.trim(),
			applicant.citizenshipStatus.trim(),
			applicant.hasCriminalHistory === null ? '' : 'ok',
		].filter(Boolean).length;

		const cameFromOnboarding = ((location.state as { from?: string } | null)?.from) === 'onboarding';

		if (cameFromOnboarding && fieldsComplete === 5) {
			navigate('/', { replace: true });
		}
	}, [applicant, navigate, location.state]);

	const handleSubmit = async (event: FormEvent) => {
		event.preventDefault();
		setError("");
		setMessage("");

		if (newPassword && newPassword !== confirmPassword) {
			setError("New passwords do not match.");
			return;
		}

		try {
			await onSaveApplicant({
				applicantName,
				homeAddress,
				phoneNumber,
				emailAddress,
				linkedInUrl,
				citizenshipStatus,
				hasCriminalHistory,
				currentPassword,
				newPassword,
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
			<header className="topbar profile-edit-header">
				<div className="profile-edit-intro">
					<p className="kicker">Applicant Profile</p>
					<h1>Personal details and account security</h1>
				</div>
				<div className="profile-edit-summary">
					<div className="profile-summary-card profile-summary-card--accent profile-summary-card--checklist">
						<span className="profile-summary-label">Required fields</span>
						<strong>{onboardingFieldsComplete}/{onboardingFieldTotal} complete</strong>
						<span>Finish these to skip the prompt on sign in.</span>
						<div className="profile-checklist-popover" aria-hidden="true">
							<p className="profile-section-eyebrow">Checklist</p>
							<h2>What onboarding checks</h2>
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
			</header>

			<section className="panel profile-edit-panel">
				<form className="profile-edit-form" onSubmit={handleSubmit}>
					<div className="profile-edit-grid">
						<div className="profile-edit-column">
							<GroupBox title="Change Name">
								<label>
									Applicant Name
									<input
										value={authSession?.user.name || applicant.applicantName}
										disabled
									/>
								</label>
								<label>
									<p className="required-asterisk">New Full Name</p>
									<input
										value={applicantName}
										onChange={(event) => setApplicantName(event.target.value)}
										placeholder="e.g., Juan Dela Cruz"
									/>
								</label>
							</GroupBox>
							<GroupBox title="Change Password">
								<label>
									<p className="required-asterisk">Current Password</p>
									<Password value={currentPassword} onChange={setCurrentPassword} />
								</label>
								<label>
									New Password
									<Password value={newPassword} onChange={setNewPassword} />
								</label>
								<label>
									<p className="required-asterisk">Confirm New Password</p>
									<Password value={confirmPassword} onChange={setConfirmPassword} />
								</label>
							</GroupBox>
						</div>

						<div className="profile-edit-column">
							<div className="profile-section-card">
								<div className="profile-section-heading">
									<p className="profile-section-eyebrow">Required profile details</p>
									<h2>Contact and eligibility</h2>
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
											value={phoneNumber}
											onChange={(event) => setPhoneNumber(event.target.value)}
											placeholder="e.g., +63 917 123 4567"
										/>
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
