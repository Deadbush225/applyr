<a id="readme-top"></a>

<div align="center">
  <h1>Applyr</h1>
  <p>Applicant portal front-end with schema-driven form flows and downloading resume.</p>
  <br />
  <p><em>Built as a React + Vite demo for a job application process, with backend-ready data structure.</em></p>
</div>

## Demo

Deployment Link: https://applyr-chi.vercel.app/

## About The Project

Applyr is a multi-step candidate portal front-end that mirrors a hiring schema and supports both applicants and recruiters. The application demonstrates:

- a dynamic applicant onboarding wizard
- education, employment, and reference entry flows
- schema-aware front-end state that can connect to backend APIs

### Key Features

- **Applicant wizard**: contact info, job application details, education, employment, references, compliance, and resume upload.
- **Recruiter experience**: candidate queue, status filters, detail drill-down, and status updates.
- **PDF file export**: generate a resume PDF from the applicant's data.
- **Schema mapping**: objects match backend tables for easy integration.
- **Validation-first UI**: dynamic required fields and user-friendly error feedback.

## Installation

### Prerequisites

- Node.js 18+ or compatible LTS
- npm

### Setup

```bash
npm install
```

### Environment

Create a `.env` file in the project root with the following values:

```env
VITE_CLOUDINARY_CLOUD_NAME=your_cloud_name
VITE_CLOUDINARY_UPLOAD_PRESET=your_unsigned_preset
```

### Run Locally

```bash
npm run dev
```

### Build

```bash
npm run build
```

## Project Structure

- `src/` – React app, pages, components, services, validation, and styles.
- `backend/` – PHP backend API, database schema, and migration scripts.
- `public/` – static assets and fonts.
- `src/styles/` – SCSS module files for layout and components.

## Schema Mapping

- `Applicant`: personal, contact, and compliance data.
- `JobApplication`: position, dates, status, salary, and resume URL.
- `Education`: one-to-many education entries per applicant.
- `EmploymentHistory`: one-to-many employment records per applicant.
- `ApplicantReference`: one-to-many reference entries per applicant.

The front-end data model is designed to map directly to the backend schema while remaining easy to extend.
