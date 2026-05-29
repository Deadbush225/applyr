import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';
import type { Applicant, JobApplication, Education, EmploymentHistory, ApplicantReference, Training, Certificate } from '../types';

type ResumeTemplateId = "classic" | "compact" | "modern";

type ResumePDFProps = {
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

const getFontFamily = (font: string) => {
  const normalized = font.trim().toLowerCase();
  if (!normalized) {
    return 'Times-Roman';
  }
  if (normalized.includes('arial') || normalized.includes('calibri')) {
    return 'Helvetica';
  }
  if (
    normalized.includes('times') ||
    normalized.includes('georgia') ||
    normalized.includes('garamond')
  ) {
    return 'Times-Roman';
  }
  return 'Times-Roman';
};

const getFontVariants = (baseFontFamily: string) => {
  if (baseFontFamily === 'Helvetica') {
    return {
      regular: 'Helvetica',
      bold: 'Helvetica-Bold',
      italic: 'Helvetica-Oblique',
      boldItalic: 'Helvetica-BoldOblique',
    }
  }

  return {
    regular: 'Times-Roman',
    bold: 'Times-Bold',
    italic: 'Times-Italic',
    boldItalic: 'Times-BoldItalic',
  }
}
const getMoneyDisplay = (value: string | number | null | undefined) => {
  // add commas and ₱ symbol, handle invalid or empty values
  if (value === null || value === undefined || value === '') return 'Not provided';
  const num = typeof value === 'number' ? value : Number(value);
  if (Number.isNaN(num)) return 'Not provided';
  return `Php ${num.toLocaleString()}`;
}

const getDisplayValue = (value: string | null | undefined, fallback = "Not provided") => {
  if (!value || typeof value !== 'string') return fallback
  return value.trim() ? value : fallback
}
const getYesNo = (value: boolean | null) => value === null ? "Not provided" : (value ? "Yes" : "No");

const formatDateForPDF = (value: string | Date | null | undefined, includeDay= true) => {
  if (!value) return ''
  const months = [
    'January',
    'February',
    'March',
    'April',
    'May',
    'June',
    'July',
    'August',
    'September',
    'October',
    'November',
    'December',
  ]

  if (value instanceof Date && !Number.isNaN(value.getTime())) {
    const year = value.getFullYear()
    const monthName = months[value.getMonth()]
    const day = value.getDate()
    return `${year}, ${monthName} ${day}`
  }

  if (typeof value !== 'string') return ''
  const trimmed = value.trim()
  if (!trimmed) return ''

  const normalized = trimmed.includes('T') ? trimmed.split('T')[0] : trimmed
  const match = normalized.match(/^(\d{4})-(\d{2})(?:-(\d{2}))?$/)
  if (!match) return ''
  const [, yearStr, monthStr, dayStr = '1'] = match
  const year = Number(yearStr)
  const monthIndex = Number(monthStr) - 1
  const day = Number(dayStr)
  if (!Number.isFinite(year) || !Number.isFinite(monthIndex) || !Number.isFinite(day)) return ''
  if (monthIndex < 0 || monthIndex > 11) return ''
  if (includeDay) {
    return `${year}, ${months[monthIndex]} ${day}`
  } else {
    return `${year}, ${months[monthIndex]}`
  }
}

const formatEducationRange = (entry: Education) => {
  if (!entry.startYear && !entry.endYear && !entry.isCurrent) return 'Not provided'
  const endLabel = entry.isCurrent ? 'Present' : (entry.endYear || '')
  if (entry.startYear && endLabel) return `${entry.startYear} - ${endLabel}`
  return entry.startYear || endLabel || 'Not provided'
}

const formatEmploymentRange = (entry: EmploymentHistory) => {
  if (!entry.startDate && !entry.endDate && !entry.isEmployed) return 'Not provided'
  const startLabel = formatDateForPDF(entry.startDate, false)
  const endLabel = entry.isEmployed ? 'Present' : formatDateForPDF(entry.endDate, false)
  if (startLabel && endLabel) return `${startLabel} - ${endLabel}`
  return startLabel || endLabel || 'Not provided'
}

export const ResumePDF = ({ applicant, jobApplication, education, employmentHistory, references, trainings, certificates, previewFont, resumeTemplate }: ResumePDFProps) => {
  const fontFamily = getFontFamily(previewFont);
  const fontVariants = getFontVariants(fontFamily)

  // Template-specific style variables based on App.scss
  const isCompact = resumeTemplate === 'compact';
  const isModern = resumeTemplate === 'modern';

  const baseFontSize = isCompact ? 11 : 12;
  const h3FontSize = baseFontSize * 0.95;
  const roleFontSize = baseFontSize * 0.95;
  const metaFontSize = isCompact ? (baseFontSize * 0.85) : (baseFontSize * 0.92);
  const lh = isCompact ? 1.4 : 1.5;
  const previewGap = isCompact ? 10 : 16;
  const sectionPaddingBottom = isCompact ? 4 : 6;
  const textStrong = '#2f2417';
  const textMuted = '#6a553b';
  const sidePadding = 50; // Approximate 1ch for PDF layout

  const styles = StyleSheet.create({
    page: {
      padding: sidePadding,
      fontFamily: fontVariants.regular,
      fontSize: baseFontSize,
      lineHeight: lh,
      color: textStrong,
    },
    preview: {
      display: 'flex',
      flexDirection: 'column',
    },
    header: {
      display: 'flex',
      flexDirection: isModern ? 'column' : 'row',
      justifyContent: isModern ? 'flex-start' : 'space-between',
      alignItems: 'flex-start',
      borderBottomWidth: isModern ? 2 : 1,
      borderBottomColor: isModern ? '#b98f5d' : '#c8b9a2',
      borderBottomStyle: 'solid',
      paddingBottom: 12,
      marginBottom: previewGap,
    },
    headerTitles: {
      marginBottom: isModern ? 8 : 0,
      marginRight: isModern ? 0 : 12,
    },
    name: {
      fontSize: baseFontSize * 1.5,
      marginBottom: 4,
      fontFamily: fontVariants.bold,
      fontWeight: 'bold',
      color: textStrong,
    },
    role: {
      margin: 0,
      color: textMuted,
      fontSize: roleFontSize,
    },
    metaWrapper: {
      display: 'flex',
      flexDirection: isModern ? 'row' : 'column',
      flexWrap: isModern ? 'wrap' : 'nowrap',
      textAlign: isModern ? 'left' : 'right',
      alignItems: isModern ? 'center' : 'flex-end', // <-- Fix 1: Aligns the column items to the right
    },
    metaText: {
      fontSize: metaFontSize,
      marginRight: isModern ? 12 : 0,
      marginBottom: isModern ? 0 : 2, // <-- Fix 2: Changed from 6 to 0 to remove the bottom margin in modern
      color: textMuted,
    },
    section: {
      paddingBottom: sectionPaddingBottom,
      marginBottom: previewGap + 2,
      display: 'flex',
      flexDirection: 'column',
    },
    sectionCol: {
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap',
      width: '100%', // <-- CRUCIAL: Forces the container to fill the page so 25% works
    },
    sectionColItem: {
      width: '50%',
      // width: isCompact ? '50%' : '25%',
      display: 'flex',
      flexDirection: 'row',
      flexWrap: 'wrap', // <-- Prevents the label and value from overlapping
      paddingRight: 15, // Adds a strict gutter between columns
      marginBottom: 8,
    },
    sectionHeader: {
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'flex-start',
      marginBottom: 6,
    },
    sectionTitle: {
      margin: 0,
      fontSize: h3FontSize,
      textTransform: 'uppercase',
      fontFamily: fontVariants.bold,
      fontWeight: 'bold',
      letterSpacing: 0.4,
      color: textStrong,
    },
    sectionRule: {
      width: '100%',
      height: 1,
      backgroundColor: '#c8b9a2',
      marginTop: 2,
    },
    previewList: {
      marginTop: 8,
    },
    lineBlock: {
      marginBottom: baseFontSize * 0.7,
    },
    lineFlex: {
      display: 'flex',
      flexDirection: 'row',
      justifyContent: 'space-between',
      marginBottom: 2,
    },
    bold: {
      fontFamily: fontVariants.bold,
      fontWeight: 'bold',
    },
    italic: {
      fontFamily: fontVariants.italic,
      fontStyle: 'italic',
    },
    label: {
      fontFamily: fontVariants.bold,
      fontWeight: 'bold',
      color: textStrong,
    },
    dateText: {
      color: textMuted,
    },
  });

  const SectionTitle = ({ title }: { title: string }) => (
    <View style={styles.sectionHeader} wrap={false}>
      <Text style={styles.sectionTitle}>{title.toUpperCase()}</Text>
      <View style={styles.sectionRule} />
    </View>
  );

  const templateOrder = {
		classic: ["Application Details", "Education", "Employment", "Trainings", "Certificates", "References", "Compliance"],
		compact: ["Application Details", "Employment", "Education", "Trainings", "Certificates", "Compliance", "References"],
		modern: ["Application Details", "Compliance", "Employment", "Education", "Trainings", "Certificates", "References"],
	};

  const sectionsList = templateOrder[resumeTemplate];
  const visibleSections = sectionsList.filter((sectionKey) => {
    if (sectionKey === 'Education') return education.length > 0
    if (sectionKey === 'Employment') return employmentHistory.length > 0
    if (sectionKey === 'Trainings') return trainings.length > 0
    if (sectionKey === 'Certificates') return certificates.length > 0
    if (sectionKey === 'References') return references.length > 0
    return true
  })

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <View style={styles.preview}>
          <View style={styles.header}>
            <View style={styles.headerTitles}>
              <Text style={styles.name}>{getDisplayValue(applicant.applicantName, "Your Name")}</Text>
              <Text style={styles.role}>{getDisplayValue(jobApplication.appliedPosition, "Target Role")}</Text>
            </View>
            <View style={styles.metaWrapper}>
              <Text style={styles.metaText}>{getDisplayValue(applicant.emailAddress, "email@example.com")}</Text>
              <Text style={styles.metaText}>{getDisplayValue(applicant.phoneNumber, "(555) 000-0000")}</Text>
              <Text style={styles.metaText}>{getDisplayValue(applicant.homeAddress, "City, State")}</Text>
            </View>
          </View>

          {visibleSections.map((sectionKey) => {
            if (sectionKey === "Application Details") {
              return (
                <View style={styles.section} key={sectionKey} wrap={false}>
                  <SectionTitle title="Application Details" />
                  <View style={styles.sectionCol}>
                    <View style={styles.sectionColItem}>
                      <Text style={styles.label}>Start date: </Text>
                      <Text style={styles.dateText}>{formatDateForPDF(jobApplication.availableStartDate) || getDisplayValue(jobApplication.availableStartDate)}</Text>
                    </View>
                    <View style={styles.sectionColItem}>
                      <Text style={styles.label}>Expected salary: </Text>
                      <Text>{getMoneyDisplay(jobApplication.expectedSalary)}</Text>
                    </View>
                    <View style={styles.sectionColItem}>
                      <Text style={styles.label}>Citizenship: </Text>
                      <Text>{getDisplayValue(applicant.citizenshipStatus)}</Text>
                    </View>
                    <View style={styles.sectionColItem}>
                      <Text style={styles.label}>LinkedIn: </Text>
                      <Text>{getDisplayValue(applicant.linkedInUrl)}</Text>
                    </View>
                  </View>
                </View>
              );
            }

            if (sectionKey === "Compliance") {
               return (
                <View style={styles.section} key={sectionKey} wrap={false}>
                  <SectionTitle title="Compliance" />
                  <View style={styles.sectionCol}>
                    <View style={styles.sectionColItem}>
                      <Text style={styles.label}>Criminal history: </Text>
                      <Text>{getYesNo(applicant.hasCriminalHistory)}</Text>
                    </View>
                    <View style={styles.sectionColItem}>
                      <Text style={styles.label}>Drug test agreement: </Text>
                      <Text>{getYesNo(applicant.agreesToDrugTest)}</Text>
                    </View>
                  </View>
                </View>
              );
            }

            if (sectionKey === "Education") {
              return (
                <View style={styles.section} key={sectionKey}>
                  <SectionTitle title="Education" />
                  <View style={styles.previewList}>
                    {education.map((entry, idx) => (
                      <View key={idx} style={styles.lineBlock} wrap={false}>
                        <View style={styles.lineFlex}>
                          <Text style={styles.bold}>
                            {entry.degreeReceived
                              ? `${entry.degreeReceived}${entry.programName ? ` in ${entry.programName}` : ''}`
                              : "Degree"}
                          </Text>
                          <Text style={styles.dateText}>{formatEducationRange(entry)}</Text>
                        </View>
                        <View style={styles.lineFlex}>
                          <Text style={styles.italic}>{entry.schoolName ? entry.schoolName : "School"}</Text>
                          <Text>{entry.schoolLocation ? entry.schoolLocation : "Location - "}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )
            }

            if (sectionKey === "Employment") {
              return (
                 <View style={styles.section} key={sectionKey}>
                  <SectionTitle title="Employment" />
                  <View style={styles.previewList}>
                    {employmentHistory.map((entry, idx) => (
                      <View key={idx} style={styles.lineBlock} wrap={false}>
                        <View style={styles.lineFlex}>
                          <Text style={styles.bold}>{getDisplayValue(entry.workPosition, 'Position')}</Text>
                          <View style={styles.lineFlex}>
                            <Text style={styles.dateText}>{formatEmploymentRange(entry)}</Text>
                          </View>
                        </View>
                        <View style={styles.lineFlex}>
                          <Text style={styles.italic}>{getDisplayValue(entry.companyName, 'Company')}</Text>
                          <Text>{getDisplayValue(entry.companyAddress, 'N/A')}</Text>
                        </View>
                        <View style={styles.lineFlex}>
                          <Text>
                            <Text style={styles.label}>Reason for leaving: </Text>
                            {getDisplayValue(entry.reasonForLeaving, 'N/A')}
                          </Text>
                          <Text>{getDisplayValue(entry.companyPhone, 'N/A')}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )
            }

            if (sectionKey === "Trainings") {
              return (
                <View style={styles.section} key={sectionKey}>
                  <SectionTitle title="Trainings" />
                  <View style={styles.previewList}>
                    {trainings.map((entry, idx) => (
                      <View key={idx} style={styles.lineBlock} wrap={false}>
                        <View style={styles.lineFlex}>
                          <Text style={styles.bold}>{getDisplayValue(entry.trainingTitle, "Title")}</Text>
                          <Text style={styles.dateText}>{formatDateForPDF(entry.completionDate) || 'N/A'}</Text>
                        </View>
                        <View style={styles.lineFlex}>
                          <Text style={styles.italic}>{getDisplayValue(entry.trainingInstructor, "Instructor")}</Text>
                          
                          <Text>{getDisplayValue(entry.trainingDurationHours, "Duration") + " Hrs"}</Text>
                        </View>
                        <View style={styles.lineFlex}>
                          <Text style={styles.italic}></Text>
                          <Text>{getDisplayValue(entry.trainingDescription, "No description")}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )
            }

            if (sectionKey === "Certificates") {
              return (
                 <View style={styles.section} key={sectionKey}>
                  <SectionTitle title="Certificates" />
                  <View style={styles.previewList}>
                    {certificates.map((entry, idx) => (
                      <View key={idx} style={styles.lineBlock} wrap={false}>
                        <View style={styles.lineFlex}>
                          <Text style={styles.bold}>{getDisplayValue(entry.certificateName, "Name")}</Text>
                          <Text style={styles.dateText}>{formatDateForPDF(entry.dateIssued) || 'N/A'}</Text>
                        </View>
                        <View style={styles.lineFlex}>
                          <Text style={styles.italic}>{getDisplayValue(entry.issuingAuthority, "Authority")}</Text>
                          <Text>{"Valid for " + getDisplayValue(entry.validityMonths, "N/A") + " Months"}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )
            }

            if (sectionKey === "References") {
              return (
                 <View style={styles.section} key={sectionKey}>
                  <SectionTitle title="References" />
                  <View style={styles.previewList}>
                    {references.map((entry, idx) => (
                      <View key={idx} style={styles.lineBlock} wrap={false}>
                        <View style={styles.lineFlex}>
                          <Text style={styles.bold}>{getDisplayValue(entry.referenceName, "Name")}</Text>
                          <Text>{getDisplayValue(entry.referenceTitle, "Title")}</Text>
                        </View>
                        <View style={styles.lineFlex}>
                          <Text style={styles.italic}>{getDisplayValue(entry.referenceCompany, "Company")}</Text>
                          <Text>{getDisplayValue(entry.referencePhone, "Phone")}</Text>
                        </View>
                        <View style={styles.lineFlex}>
                          <Text></Text>
                          <Text>{getDisplayValue(entry.referenceEmail, "Email")}</Text>
                        </View>
                      </View>
                    ))}
                  </View>
                </View>
              )
            }

            return null;
          })}
        </View>
      </Page>
    </Document>
  );
};

export default ResumePDF;
