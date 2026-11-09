# CarePoint — Clinic Management System

A responsive, browser-based clinic management system built as an individual student portfolio project.

## Features

- Dashboard with patient, appointment, doctor, and outstanding billing summaries
- Patient records: create, view, search, edit, and delete
- Appointment scheduling and status tracking
- Doctor directory and availability status
- Medical specialties management
- Treatment catalog and pricing
- Billing records with paid/unpaid status
- JSON data export and import
- Responsive layout for desktop and mobile
- Local persistence with IndexedDB

## Technology

- HTML5
- CSS3
- Vanilla JavaScript
- IndexedDB (browser database)

## Run locally

1. Download or clone this repository.
2. Open `index.html` in a modern browser.
3. Add sample patients, doctors, appointments, treatments, and bills.

For a local development server, you can use the VS Code Live Server extension.

## Data and privacy

This portfolio version stores data locally in the browser using IndexedDB. It does not connect to a remote server and does not include user authentication. Do not enter real patient medical information. Use fictional demo data only.

## Project structure

```text
clinic-management-system/
├── index.html
├── css/
│   └── styles.css
├── js/
│   └── app.js
└── README.md
```

## Portfolio note

This is an educational portfolio project. A production clinic system would require secure authentication, server-side validation, access controls, encrypted storage, audit logging, backups, and compliance with applicable health-data regulations.
