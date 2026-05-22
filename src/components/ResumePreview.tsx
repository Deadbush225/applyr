import { useEffect, useRef, useState } from "react";
import type { CSSProperties } from "react";
import type {
	Applicant,
	ApplicantReference,
	Education,
	EmploymentHistory,
	JobApplication,
	Training,
	Certificate,
} from "../types";

type ResumePreviewProps = {
	applicant: Applicant;
	jobApplication: JobApplication;
	education: Education[];
	employmentHistory: EmploymentHistory[];
	references: ApplicantReference[];
	trainings: Training[];
	certificates: Certificate[];
	previewFont: string;
	resumeTemplate: ResumeTemplateId;
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
		| ApplicantReference[]
		| Training[]
		| Certificate[];
	isEmpty: boolean;
};

type PageBlock = {
	showHeader: boolean;
	sections: SectionBlock[];
};

type PageMetrics = {
	maxLines: number;
	headerLines: number;
	sectionGapLines: number;
};

type ResumeTemplateId = "classic" | "compact" | "modern";

const DEFAULT_MAX_LINES_PER_PAGE = 46;
const DEFAULT_HEADER_LINES = 6;

const chunkSectionsIntoPages = (
	sections: SectionBlock[],
	metrics: PageMetrics,
): PageBlock[] => {
	const pages: PageBlock[] = [];
	let current: PageBlock = { showHeader: true, sections: [] };
	let remaining = metrics.maxLines - metrics.headerLines;

	const pushPage = () => {
		pages.push(current);
		current = { showHeader: false, sections: [] };
		remaining = metrics.maxLines;
	};

	sections.forEach((section) => {
		const lines = section.lines.length ? section.lines : ["Not provided"];
		const sectionIsEmpty = section.lines.length === 0;
		let start = 0;

		while (start < lines.length) {
			const sectionTitleLines = 2; // title + rule separator
			const minimumSectionLines = sectionTitleLines + 1;
			if (remaining < minimumSectionLines + metrics.sectionGapLines) {
				pushPage();
			}

			const availableLines = Math.max(remaining - sectionTitleLines, 1);
			const chunk = lines.slice(start, start + availableLines);
			const titleSuffix = start === 0 ? "" : " (cont.)";

			current.sections.push({
				title: `${section.title}${titleSuffix}`,
				lines: chunk,
				isEmpty: sectionIsEmpty,
			});

			remaining -= sectionTitleLines + chunk.length;
			remaining -= metrics.sectionGapLines;
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
	trainings,
	certificates,
	previewFont,
	resumeTemplate,
}: ResumePreviewProps) => {
	const pageStyle = {
		["--resume-font" as const]: previewFont,
	} as CSSProperties;
	const containerRef = useRef<HTMLDivElement>(null);
	const pageRef = useRef<HTMLElement | null>(null);
	const headerRef = useRef<HTMLDivElement | null>(null);
	const previewRef = useRef<HTMLDivElement | null>(null);
	const [scale, setScale] = useState(1);
	const [pageMetrics, setPageMetrics] = useState<PageMetrics>({
		maxLines: DEFAULT_MAX_LINES_PER_PAGE,
		headerLines: DEFAULT_HEADER_LINES,
		sectionGapLines: 0,
	});

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

	useEffect(() => {
		const pageElement = pageRef.current;
		if (!pageElement || typeof window === "undefined") {
			return;
		}

		const measure = () => {
			const pageStyles = window.getComputedStyle(pageElement);
			const paddingTop = Number.parseFloat(pageStyles.paddingTop) || 0;
			const paddingBottom = Number.parseFloat(pageStyles.paddingBottom) || 0;
			const fontSize = Number.parseFloat(pageStyles.fontSize) || 12;
			const lineHeightValue = Number.parseFloat(pageStyles.lineHeight);
			const lineHeight = Number.isFinite(lineHeightValue)
				? lineHeightValue
				: fontSize * 1.5;
			const headerHeight = headerRef.current?.getBoundingClientRect().height ?? 0;
			const pageHeight = pageElement.getBoundingClientRect().height;
			const availableHeight = pageHeight - paddingTop - paddingBottom - headerHeight;
			const templateSafetyLines = resumeTemplate === "modern" ? 1 : 0;
			const maxLines = Math.max(
				1,
				Math.floor(availableHeight / lineHeight) - templateSafetyLines,
			);
			const headerLines = Math.max(1, Math.ceil(headerHeight / lineHeight));
			let sectionGapLines = 0;
			const previewElement = previewRef.current;
			if (previewElement) {
				const previewStyles = window.getComputedStyle(previewElement);
				let totalGap = 0;
				const gapValue = Number.parseFloat(previewStyles.rowGap || previewStyles.gap);
				if (Number.isFinite(gapValue)) {
					totalGap += gapValue;
				}
				// Add padding approximations to safety margins
				const sectionPadding = resumeTemplate === "compact" ? 4 : 6;
				const lineMargin = Math.round(fontSize * 0.5);
				totalGap += sectionPadding + lineMargin;
				const templateGapSafety = resumeTemplate === "modern" ? 1 : 0;
				sectionGapLines = Math.max(
					0,
					Math.round(totalGap / lineHeight) + templateGapSafety,
				);
			}

			setPageMetrics((prev) =>
				prev.maxLines === maxLines &&
				prev.headerLines === headerLines &&
				prev.sectionGapLines === sectionGapLines
					? prev
					: { maxLines, headerLines, sectionGapLines },
			);
		};

		measure();
		const observer = new ResizeObserver(measure);
		observer.observe(pageElement);
		if (headerRef.current) {
			observer.observe(headerRef.current);
		}
		if (previewRef.current) {
			observer.observe(previewRef.current);
		}

		return () => observer.disconnect();
	}, [previewFont, resumeTemplate]);

	const sectionMap = new Map<string, SectionBlock>([
		[
			"Application Details",
			{
				title: "Application Details",
				lines: [
					["Start date:", `${getDisplayValue(jobApplication.availableStartDate)}`],
					["Expected salary:", `${getDisplayValue(jobApplication.expectedSalary)}`],
					["Citizenship:", `${getDisplayValue(applicant.citizenshipStatus)}`],
					["LinkedIn:", `${getDisplayValue(applicant.linkedInUrl)}`],
				],
				isEmpty: false,
			},
		],
		[
			"Education",
			{
				title: "Education",
				lines: education,
				isEmpty: education.length === 0,
			},
		],
		[
			"Employment",
			{
				title: "Employment",
				lines: employmentHistory,
				isEmpty: employmentHistory.length === 0,
			},
		],
		[
			"References",
			{
				title: "References",
				lines: references,
				isEmpty: references.length === 0,
			},
		],
		[
			"Trainings",
			{
				title: "Trainings",
				lines: trainings,
				isEmpty: trainings.length === 0,
			},
		],
		[
			"Certificates",
			{
				title: "Certificates",
				lines: certificates,
				isEmpty: certificates.length === 0,
			},
		],
		[
			"Compliance",
			{
				title: "Compliance",
				lines: [
					["Criminal history:", getYesNo(applicant.hasCriminalHistory)],
					["Drug test agreement:", getYesNo(applicant.agreesToDrugTest)],
				],
				isEmpty: false,
			},
		],
	]);

	const templateOrder: Record<ResumeTemplateId, string[]> = {
		classic: [
			"Application Details",
			"Education",
			"Employment",
			"Trainings",
			"Certificates",
			"References",
			"Compliance",
		],
		compact: [
			"Application Details",
			"Employment",
			"Education",
			"Trainings",
			"Certificates",
			"Compliance",
			"References",
		],
		modern: [
			"Application Details",
			"Compliance",
			"Employment",
			"Education",
			"Trainings",
			"Certificates",
			"References",
		],
	};

	const sections: SectionBlock[] = templateOrder[resumeTemplate]
		.map((title) => sectionMap.get(title))
		.filter((section): section is SectionBlock => Boolean(section));

	const pages = chunkSectionsIntoPages(sections, pageMetrics);

function isTupleArray(arr: unknown[]): arr is [string, string][] {
	return Array.isArray(arr[0]);
}

function isStringArray(arr: unknown[]): arr is string[] {
	return typeof arr[0] === "string";
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

function isTrainingArray(arr: unknown[]): arr is Training[] {
	if (!Array.isArray(arr) || arr.length === 0) {
		return false;
	}

	const first = arr[0];
	return (
		typeof first === "object" &&
		first !== null &&
		!Array.isArray(first) &&
		"trainingTitle" in (first as Training)
	);
}

function isCertificateArray(arr: unknown[]): arr is Certificate[] {
	if (!Array.isArray(arr) || arr.length === 0) {
		return false;
	}

	const first = arr[0];
	return (
		typeof first === "object" &&
		first !== null &&
		!Array.isArray(first) &&
		"certificateName" in (first as Certificate)
	);
}

	return (
		<div
			className="preview-scroll"
			aria-label="Resume preview document"
			ref={containerRef}
		>
			<div
				className="preview-pages"
				style={{ transform: `scale(${scale})`, ...pageStyle }}
			>
				{pages.map((page, pageIndex) => (
					<article
						className={`preview-page preview-template--${resumeTemplate}`}
						key={`page-${pageIndex}`}
						ref={pageIndex === 0 ? pageRef : undefined}
					>
						<div className="preview" ref={pageIndex === 0 ? previewRef : undefined}>
							{page.showHeader ? (
								<div
									className="preview-header"
									ref={pageIndex === 0 ? headerRef : undefined}
								>
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
										} else if (
											section.title.startsWith("References") &&
											isReferenceArray(section.lines)
										) {
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
										} else if (
											section.title.startsWith("Trainings") &&
											isTrainingArray(section.lines)
										) {
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
																			{getDisplayValue(line.trainingTitle, "Title")}
																		</strong>
																		<p>
																			{getDisplayValue(line.trainingDurationHours, "Duration") + " Hrs"}
																		</p>
																	</div>
																	<div className="line-flex-spacebbetween">
																		<i>
																			{getDisplayValue(line.trainingInstructor, "Instructor")}
																		</i>
																		<p>
																			{getDisplayValue(line.trainingDescription, "Description")}
																		</p>
																	</div>
																</div>
															))}
														</div>
													)}
												</section>
											);
										} else if (
											section.title.startsWith("Certificates") &&
											isCertificateArray(section.lines)
										) {
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
																			{getDisplayValue(line.certificateName, "Name")}
																		</strong>
																		<p>
																			{"Valid: " + getDisplayValue(line.validityMonths, "N/A") + " Months"}
																		</p>
																	</div>
																	<div className="line-flex-spacebbetween">
																		<i>
																			{getDisplayValue(line.issuingAuthority, "Authority")}
																		</i>
																	</div>
																</div>
															))}
														</div>
													)}
												</section>
											);
										} else if (section.title.startsWith("Compliance") && isTupleArray(section.lines)) {
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
                            <div className="preview-col2">
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
										} else if (isStringArray(section.lines)) {
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

										return null;
									})}
						</div>
					</article>
				))}
			</div>
		</div>
	);
};

export default ResumePreview;
