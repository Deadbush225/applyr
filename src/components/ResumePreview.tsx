import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type {
	Applicant,
	ApplicantReference,
	Education,
	EmploymentHistory,
	JobApplication,
} from "../types";

type ResumePreviewProps = {
	applicant: Applicant;
	jobApplication: JobApplication;
	education: Education[];
	employmentHistory: EmploymentHistory[];
	references: ApplicantReference[];
	previewFont: string;
};

const getDisplayValue = (value: string, fallback = "Not provided") =>
	value.trim() ? value : fallback;

const getYesNo = (value: boolean | null) => {
	if (value === null) {
		return "Not provided";
	}
	return value ? "Yes" : "No";
};

type SectionBlock = {
	title: string;
	lines:
		| string[]
		| [string, string][]
		| Education[]
		| EmploymentHistory[]
		| ApplicantReference[];
	isEmpty: boolean;
};

type PageBlock = {
	showHeader: boolean;
	sections: SectionBlock[];
};

const MAX_LINES_PER_PAGE = 46;
const HEADER_LINES = 6;

const chunkSectionsIntoPages = (sections: SectionBlock[]): PageBlock[] => {
	const pages: PageBlock[] = [];
	let current: PageBlock = { showHeader: true, sections: [] };
	let remaining = MAX_LINES_PER_PAGE - HEADER_LINES;

	const pushPage = () => {
		pages.push(current);
		current = { showHeader: false, sections: [] };
		remaining = MAX_LINES_PER_PAGE;
	};

	sections.forEach((section) => {
		const lines = section.lines.length ? section.lines : ["Not provided"];
		const sectionIsEmpty = section.lines.length === 0;
		let start = 0;

		while (start < lines.length) {
			if (remaining < 2) {
				pushPage();
			}

			const availableLines = Math.max(remaining - 1, 1);
			const chunk = lines.slice(start, start + availableLines);
			const titleSuffix = start === 0 ? "" : " (cont.)";

			current.sections.push({
				title: `${section.title}${titleSuffix}`,
				lines: chunk,
				isEmpty: sectionIsEmpty,
			});

			remaining -= 1 + chunk.length;
			start += chunk.length;

			if (start < lines.length) {
				pushPage();
			}
		}
	});

	pages.push(current);
	return pages;
};

const ResumePreview = ({
	applicant,
	jobApplication,
	education,
	employmentHistory,
	references,
	previewFont,
}: ResumePreviewProps) => {
	const resumeLink = jobApplication.resumeFileUrl;
	const pageStyle = {
		["--resume-font" as const]: previewFont,
	} as CSSProperties;
	const containerRef = useRef<HTMLDivElement>(null);
	const pageRef = useRef<HTMLElement | null>(null);
	const [scale, setScale] = useState(1);

	useEffect(() => {
		const target = containerRef.current;
		if (!target) {
			return;
		}

		const updateScale = () => {
			const available = target.clientWidth - 16;
			const pageWidth = pageRef.current?.offsetWidth ?? available;
			const nextScale = pageWidth > 0 ? Math.min(1, available / pageWidth) : 1;
			setScale(Number.isFinite(nextScale) ? nextScale : 1);
		};

		updateScale();
		const observer = new ResizeObserver(updateScale);
		observer.observe(target);

		return () => observer.disconnect();
	}, []);

	const sections: SectionBlock[] = [
		{
			title: "Application Details",
			lines: [
				[`Start date:`,`${getDisplayValue(jobApplication.availableStartDate)}`],
				[`Expected salary:`, `${getDisplayValue(jobApplication.expectedSalary)}`],
				[`Citizenship:`, `${getDisplayValue(applicant.citizenshipStatus)}`],
				[`LinkedIn:`, `${getDisplayValue(applicant.linkedInUrl)}`],
			],
			isEmpty: false,
		},
		{
			title: "Education",
			lines: education,
				// education.length === 0
				// 	? []
				// 	: education.map(
				// 			(item) => {

        //         return `${getDisplayValue(item.degreeReceived, "Degree")} - ${getDisplayValue(
        //           item.schoolName,
				// 					"School",
				// 				)}, ${getDisplayValue(item.schoolLocation, "Location")} (${getDisplayValue(
        //           item.yearsAttended,
				// 					"Years",
				// 				)})`,
        //       }
				// 		),
			isEmpty: education.length === 0,
		},
		{
			title: "Employment",
			lines: employmentHistory,
			isEmpty: employmentHistory.length === 0,
		},
		{
			title: "References",
			lines: references,
			isEmpty: references.length === 0,
		},
		{
			title: "Compliance",
			lines: [
				`Criminal history: ${getYesNo(applicant.hasCriminalHistory)}`,
				`Drug test agreement: ${getYesNo(applicant.agreesToDrugTest)}`,
			],
			isEmpty: false,
		},
	];

	const pages = chunkSectionsIntoPages(sections);

function isTupleArray(arr: unknown[]): arr is [string, string][] {
	return Array.isArray(arr[0]);
}

function isEducationArray(arr: unknown[]): arr is Education[] {
	if (!Array.isArray(arr) || arr.length === 0) {
		return false;
	}

	const first = arr[0];
	return (
		typeof first === "object" &&
		first !== null &&
		!Array.isArray(first) &&
		"schoolName" in (first as Education)
	);
}

function isEmploymentArray(arr: unknown[]): arr is EmploymentHistory[] {
	if (!Array.isArray(arr) || arr.length === 0) {
		return false;
	}

	const first = arr[0];
	return (
		typeof first === "object" &&
		first !== null &&
		!Array.isArray(first) &&
		"companyName" in (first as EmploymentHistory)
	);
}

function isReferenceArray(arr: unknown[]): arr is ApplicantReference[] {
	if (!Array.isArray(arr) || arr.length === 0) {
		return false;
	}

	const first = arr[0];
	return (
		typeof first === "object" &&
		first !== null &&
		!Array.isArray(first) &&
		"referenceName" in (first as ApplicantReference)
	);
}

	return (
		<div
			className="preview-scroll"
			aria-label="Resume preview document"
			ref={containerRef}
		>
			<div className="preview-pages" style={{ transform: `scale(${scale})` }}>
				{pages.map((page, pageIndex) => (
					<article
						className="preview-page"
						style={pageStyle}
						key={`page-${pageIndex}`}
						ref={pageIndex === 0 ? pageRef : undefined}
					>
						<div className="preview">
							{page.showHeader ? (
								<div className="preview-header">
									<div>
										<h2 className="preview-name">
											{getDisplayValue(applicant.applicantName, "Your Name")}
										</h2>
										<p className="preview-role">
											{getDisplayValue(
												jobApplication.appliedPosition,
												"Target Role",
											)}
										</p>
									</div>
									<div className="preview-meta">
										<p>
											{getDisplayValue(
												applicant.emailAddress,
												"email@example.com",
											)}
										</p>
										<p>
											{getDisplayValue(applicant.phoneNumber, "(555) 000-0000")}
										</p>
										<p>
											{getDisplayValue(applicant.homeAddress, "City, State")}
										</p>
									</div>
								</div>
							) : null}
							{page.sections
								.filter((section) => !section.isEmpty)
								.map((section, sectionIndex) => {
									if (section.title.startsWith("Application Details") && isTupleArray(section.lines)) {
										return (
											<section
												className="preview-section"
												key={`section-${pageIndex}-${sectionIndex}`}
											>
												<div className="preview-section-header">
													<h3>{section.title}</h3>
													<span className="preview-section-rule" />
												</div>
												{section.isEmpty ? (
													<p className="preview-empty">No entries yet.</p>
												) : (
													<div className="preview-col">
														{section.lines.map((line, lineIndex) => (
															<div
																className="flex-row"
																key={`line-${pageIndex}-${sectionIndex}-${lineIndex}`}
															>
																<strong>{line[0]}</strong>
																<p>{line[1]}</p>
															</div>
														))}
													</div>
												)}
											</section>
										);
									} else if (section.title.startsWith("Education") && isEducationArray(section.lines)) {
										return (
                      <section
												className="preview-section"
												key={`section-${pageIndex}-${sectionIndex}`}
											>
												<div className="preview-section-header">
													<h3>{section.title}</h3>
													<span className="preview-section-rule" />
												</div>
												{section.isEmpty ? (
													<p className="preview-empty">No entries yet.</p>
												) : (
													<div className="preview-list">
														{section.lines.map((line, lineIndex) => (
															<div
																className="line-block"
																key={`line-${pageIndex}-${sectionIndex}-${lineIndex}`}
															>
                                <div className="line-flex-spacebbetween">
																	<strong>
                                  {line.degreeReceived ? `${line.degreeReceived}` : "Degree - "}
                                  </strong>
                                  <p>{line.yearsAttended}</p>
                                </div>
                                <div className="line-flex-spacebbetween">
                                  <i>{line.schoolName ? `${line.schoolName}` : "School - "}</i>
                                  <p>{line.schoolLocation ? `${line.schoolLocation}` : "Location - "}</p>
                                </div>
                              </div>
														))}
													</div>
												)}
											</section>
										);
									} else if (section.title.startsWith("Employment") && isEmploymentArray(section.lines)) {
                    return (
                      <section
												className="preview-section"
												key={`section-${pageIndex}-${sectionIndex}`}
											>
												<div className="preview-section-header">
												<h3>{section.title}</h3>
													<span className="preview-section-rule" />
												</div>
												{section.isEmpty ? (
													<p className="preview-empty">No entries yet.</p>
												) : (
													<div className="preview-list">
														{section.lines.map((line, lineIndex) => (
															<div
																className="line-block"
																key={`line-${pageIndex}-${sectionIndex}-${lineIndex}`}
															>
                                <div className="line-flex-spacebbetween">
																		<strong>
                                  {line.companyName}
                                  </strong>
                                  <p>{line.workPosition}</p>
                                </div>
                                <div className="line-flex-spacebbetween">
                                  <i>{line.companyName}</i>
                                  <p>{line.workAddress}</p>
                                </div>
                              </div>
														))}
													</div>
												)}
											</section>
                    );
										} else if (section.title.startsWith("References") && isReferenceArray(section.lines)) {
											return (
												<section
													className="preview-section"
													key={`section-${pageIndex}-${sectionIndex}`}
												>
													<div className="preview-section-header">
														<h3>{section.title}</h3>
														<span className="preview-section-rule" />
													</div>
													{section.isEmpty ? (
														<p className="preview-empty">No entries yet.</p>
													) : (
														<div className="preview-list">
															{section.lines.map((line, lineIndex) => (
																<div
																	className="line-block"
																	key={`line-${pageIndex}-${sectionIndex}-${lineIndex}`}
																>
																	<div className="line-flex-spacebbetween">
																		<strong>
																			{getDisplayValue(line.referenceName, "Name")}
																		</strong>
																		<p>
																			{getDisplayValue(line.referenceTitle, "Title")}
																		</p>
																	</div>
																	<div className="line-flex-spacebbetween">
																		<i>
																			{getDisplayValue(line.referenceCompany, "Company")}
																		</i>
																		<p>
																			{getDisplayValue(line.referencePhone, "Phone")}
																		</p>
																	</div>
																</div>
															))}
														</div>
													)}
												</section>
											);
									} else {
										return (
											<section
												className="preview-section"
												key={`section-${pageIndex}-${sectionIndex}`}
											>
												<div className="preview-section-header">
													<h3>{section.title}</h3>
													<span className="preview-section-rule" />
												</div>
												{section.isEmpty ? (
													<p className="preview-empty">No entries yet.</p>
												) : (
													<div className="preview-list">
														{section.lines.map((line, lineIndex) => (
															<p
																key={`line-${pageIndex}-${sectionIndex}-${lineIndex}`}
															>
																{line}
															</p>
														))}
													</div>
												)}
											</section>
                    );
									}
								})}{" "}
						</div>
					</article>
				))}
			</div>
		</div>
	);
};

export default ResumePreview;
