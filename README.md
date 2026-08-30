# PatientTriage.ai 🏥⚡

> **Real-Time Emergency Department Triage, Continuous Patient Monitoring & Hospital Capacity Orchestration Platform**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.110+-009688?style=flat&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.0+-61DAFB?style=flat&logo=react&logoColor=black)](https://reactjs.org)
[![Vite](https://img.shields.io/badge/Vite-6.0+-646CFF?style=flat&logo=vite&logoColor=white)](https://vitejs.dev)
[![Tailwind CSS](https://img.shields.io/badge/TailwindCSS-3.4+-38B2AC?style=flat&logo=tailwind-css&logoColor=white)](https://tailwindcss.com)
[![Scikit-Learn](https://img.shields.io/badge/scikit--learn-1.4+-F7931E?style=flat&logo=scikit-learn&logoColor=white)](https://scikit-learn.org)
[![Python](https://img.shields.io/badge/Python-3.9+-3776AB?style=flat&logo=python&logoColor=white)](https://python.org)
[![Tests](https://img.shields.io/badge/Tests-66%20Passed%20(100%25)-brightgreen?style=flat&logo=pytest&logoColor=white)](https://docs.pytest.org)

---

## 📋 Table of Contents
- [Overview](#-overview)
- [Key Capabilities](#-key-capabilities)
- [System Architecture](#-system-architecture)
- [Repository Structure](#-repository-structure)
- [Quick Start Guide](#-quick-start-guide)
  - [Prerequisites](#prerequisites)
  - [Backend Setup (FastAPI + SQLite + ML)](#1-backend-setup)
  - [Frontend Setup (Vite + React)](#2-frontend-setup)
- [API Reference](#-api-reference)
- [Machine Learning & Robustness Pipeline](#-machine-learning--robustness-pipeline)
- [Verification & Automated Tests](#-verification--automated-tests)
- [Clinical & Prototype Disclaimer](#-clinical--prototype-disclaimer)

---

## 🌟 Overview

In high-volume Emergency Departments (EDs), triage has historically been treated as a static, single-point-in-time assessment. However, patients waiting in the emergency queue can decompensate rapidly before receiving physician care.

**PatientTriage.ai** transforms the emergency intake process into a **dynamic, continuous clinical monitoring and resource orchestration engine**. By combining interpretable machine learning risk scoring, automated vital sign deterioration detection, capability-based bed matching, physician workload balancing, and crisis surge scalability, PatientTriage.ai empowers clinical teams to make faster, safer, and fully auditable triage decisions.

---

## 🚀 Key Capabilities

### 1. 📋 Rapid 6-Step Patient Intake
- **Sequential Stepper**: Demographics $\rightarrow$ Chief Complaint $\rightarrow$ Physiological Vitals $\rightarrow$ Symptoms $\rightarrow$ History & Allergies $\rightarrow$ Review & Assess.
- **Real-Time Validation**: Enforces complete entry of baseline hemodynamics (HR, SBP, DBP, SpO2, RR, Temp, GCS) before progression.
- **One-Click Clinical Templates**: Common emergency scenarios (STEMI, acute asthma, septic shock, trauma, migraine) for rapid intake.

### 2. 🧠 Explainable ML Risk & 5-Level ESI Triage
- **Calibrated Multi-Class Model**: Interpretable Multinomial Logistic Regression model predicting Emergency Severity Index (ESI Levels 1 to 5) alongside continuous 0–100 clinical risk scores.
- **Out-of-Vocabulary (OOV) Robustness**: Gracefully handles novel, unseen, or vague clinical complaints without encoding errors or arbitrary risk inflation.
- **Age-Cohort Baselines**: Automated age-stratified vital sign evaluation for Pediatric ($<18\text{y}$), Adult ($18\text{--}64\text{y}$), and Geriatric ($\ge 65\text{y}$) cohorts.
- **Local Feature Explainability**: Clinician-friendly factor cards displaying physiological drivers, severity impact badges, and logit contribution weights.

### 3. ⏱️ Real-Time Reassessment & Deterioration Monitoring
- **Dynamic Reassessment Timers**: Automatic monitoring countdowns adjusted based on patient acuity and current hospital surge tier.
- **Vital Sign Deterioration Engine**: Instantly flags physiological deterioration when newly recorded vitals worsen compared to baseline (e.g. acute desaturation, hypotension, tachycardia).
- **Active Queue Alerts**: Generates prominent, dismissible deterioration alert banners directly on the clinical dashboard.
- **Clinician Override**: Enables attending clinicians to adjust AI triage levels with mandatory reason logging and full audit traceability.

### 4. 🛏️ Bed Map & Active Treatment Management
- **Department Floor Map**: Real-time bed occupancy across Emergency, Trauma Resuscitation, ICU, Step-Down, and Observation units.
- **Capability-Based Bed Matching**: Matches patient acuity and respiratory/monitoring needs to optimal available beds.
- **Terminal Disinfection Workflow**: Automated cleaning countdown timers upon bed discharge with a manual *"Complete Cleaning"* action.
- **Active Treatments & Infusion Tracking**: Live tracking of IV medications, oxygen therapy, and continuous infusions with real-time remaining volume calculations.

### 5. 👨‍⚕️ Physician Roster & Intelligent Routing
- **Shift Check-In Modal**: Real-time doctor check-in and shift status toggling (`Active`, `On Break`, `Off Duty`).
- **Caseload Utilization Charts**: Visual bar charts displaying active patient capacity across ED attending physicians.
- **Intelligent Routing**: Matches incoming triage acuity and medical specialty to the optimal physician with available caseload.

### 6. 🚨 4-Tier Surge Escalation Protocol
- **Dynamic Hospital Capacity**: 4-Tier crisis matrix (`Normal`, `Elevated`, `Critical`, `Disaster`) scaling waiting room thresholds and hospital bed allocations.
- **Surge Compression**: Automatically compresses reassessment intervals during crisis periods to increase surveillance frequency on vulnerable patients.

### 7. 📜 Immutable Clinical Audit Trail
- **Regulatory Event Logging**: Chronological SQLite audit trail logging every triage score, vitals update, bed assignment, override, and surge change.
- **One-Click CSV Export**: Instant export of audit logs for clinical governance, M&M reviews, and hospital compliance.

---

## 🏗️ System Architecture

```
                                  ┌────────────────────────┐
                                  │   React + Vite (SPA)   │
                                  │ (Tailwind CSS, Lucide) │
                                  └───────────┬────────────┘
                                              │ HTTP / JSON
                                              ▼
                                  ┌────────────────────────┐
                                  │  FastAPI Backend Core  │
                                  │ (Uvicorn REST Service) │
                                  └─────┬───────────┬──────┘
                                        │           │
                     ┌──────────────────┴──┐     ┌──┴──────────────────┐
                     │  ML & Rules Engine  │     │  Database & State   │
                     ├─────────────────────┤     ├─────────────────────┤
                     │ • Scikit-Learn Model│     │ • SQLite Database   │
                     │ • OOV Preprocessor  │     │ • SQLAlchemy ORM    │
                     │ • Age Cohort Engine │     │ • Dynamic Treatments│
                     │ • Reassessment Svc  │     │ • Audit Trail Store │
                     └─────────────────────┘     └─────────────────────┘
```

---

## 📁 Repository Structure

```text
patientTriage/
├── backend/                        # FastAPI Backend Application
│   ├── app/
│   │   ├── api/                    # REST API Endpoints & Route Handlers
│   │   │   ├── audit.py            # Audit log endpoints & CSV export
│   │   │   ├── auth.py             # Clinician authentication & tokens
│   │   │   ├── beds.py             # Bed recommendation, assignment & release
│   │   │   ├── doctors.py          # Physician roster & check-in
│   │   │   ├── hospital.py         # Capacity snapshots & hospital profiles
│   │   │   ├── patients.py         # Patient CRUD & intake persistence
│   │   │   ├── reassessment.py     # Deterioration engine & vitals updates
│   │   │   ├── surge.py            # 4-tier surge escalation API
│   │   │   ├── tests.py            # Diagnostic lab/imaging protocols
│   │   │   ├── treatments.py       # Active treatments & dynamic infusion tracking
│   │   │   └── triage.py           # Triage scoring & explainability
│   │   ├── core/                   # Configuration & security settings
│   │   ├── db/                     # SQLAlchemy models & SQLite session management
│   │   ├── schemas/                # Pydantic validation schemas
│   │   └── services/               # Core business & clinical logic services
│   └── main.py                     # FastAPI application entrypoint
├── frontend/                       # Consolidated Vite + React Frontend
│   ├── src/
│   │   ├── api/                    # Centralized Axios API service layer
│   │   ├── components/             # Reusable clinical UI components
│   │   │   ├── assessment/         # Explainability & test panels
│   │   │   ├── beds/               # Floor maps & bed tiles
│   │   │   ├── common/             # Badges, vitals pills, confidence gauges
│   │   │   ├── doctors/            # Shift cards & caseload charts
│   │   │   ├── intake/             # 6-step wizard headers & symptom chips
│   │   │   └── layout/             # Side navigation, top bar & surge banners
│   │   ├── pages/                  # Main application views
│   │   │   ├── AssessmentPage.jsx  # Triage assessment & explainability
│   │   │   ├── AuditPage.jsx       # Immutable clinical audit trail
│   │   │   ├── BedMapPage.jsx      # Bed map & active treatments
│   │   │   ├── DashboardPage.jsx   # Active queue & deterioration alerts
│   │   │   ├── DoctorsPage.jsx     # Physician roster & shift check-in
│   │   │   ├── IntakePage.jsx      # 6-Step rapid intake wizard
│   │   │   └── SurgePage.jsx       # 4-Tier surge escalation control
│   │   ├── App.jsx                 # Routing configuration
│   │   └── index.css               # Clinical design styling
│   ├── package.json                # Frontend dependencies
│   └── vite.config.js              # Vite server & proxy configuration
├── model/                          # Machine Learning & Feature Pipeline
│   ├── artifacts/                  # Serialized Joblib model & scaler pipeline
│   ├── features.py                 # 32-Feature extraction & OOV text classification
│   ├── predictor.py                # Inference, 5-level calibration & explainability
│   └── train.py                    # Model training & serialization script
├── data/                           # Synthetic clinical datasets & generators
├── tests/                          # Automated Pytest Suite (66 unit/integration tests)
└── README.md                       # Repository Documentation
```

---

## ⚡ Quick Start Guide

### Prerequisites
- **Python**: `3.9` or higher
- **Node.js**: `18.0.0` or higher
- **npm**: `9.0.0` or higher

---

### 1. Backend Setup

1. **Navigate to project root and create virtual environment**:
   ```bash
   python -m venv venv
   # Windows:
   .\venv\Scripts\activate
   # macOS/Linux:
   source venv/bin/activate
   ```

2. **Install Python dependencies**:
   ```bash
   pip install fastapi uvicorn sqlalchemy pydantic scikit-learn pandas numpy pytest passlib python-jose python-multipart
   ```

3. **Start the FastAPI server**:
   ```bash
   python -m uvicorn backend.app.main:app --host 127.0.0.1 --port 8000 --reload
   ```
   - **Backend API**: [http://127.0.0.1:8000](http://127.0.0.1:8000)
   - **Interactive Swagger Docs**: [http://127.0.0.1:8000/docs](http://127.0.0.1:8000/docs)

---

### 2. Frontend Setup

1. **Open a new terminal, navigate to `frontend/`, and install dependencies**:
   ```bash
   cd frontend
   npm install
   ```

2. **Start the Vite development server**:
   ```bash
   npm run dev
   ```
   - **Web Application URL**: [http://127.0.0.1:3000](http://127.0.0.1:3000)

---

## 🔌 API Reference

| Method | Endpoint | Description |
| :--- | :--- | :--- |
| `GET` | `/health` | Hospital capacity & health check |
| `POST` | `/api/patients` | Register new patient intake |
| `GET` | `/api/patients` | Retrieve active waiting queue |
| `POST` | `/api/triage/score` | Score patient acuity with explainable ML |
| `GET` | `/api/reassessment/status/{id}`| Check reassessment timers & deterioration state |
| `POST` | `/api/reassessment/vitals/{id}`| Record new vitals & trigger automated deterioration evaluation |
| `POST` | `/api/reassessment/override/{id}`| Apply clinician override with audit trail |
| `GET` | `/api/beds/map` | Floor map & unit inventory |
| `POST` | `/api/beds/recommend` | Capability-based bed allocation recommendation |
| `POST` | `/api/beds/assign` | Assign patient to hospital bed |
| `POST` | `/api/beds/release/{id}` | Discharge patient & begin terminal cleaning |
| `POST` | `/api/treatments/patient/{id}` | Log medication, IV infusion, or active treatment |
| `GET` | `/api/doctors/roster` | List attending physicians & caseloads |
| `POST` | `/api/surge/tier` | Update emergency surge status (`normal`, `elevated`, `critical`, `disaster`) |
| `GET` | `/api/audit/logs` | Fetch chronological clinical audit trail (supports CSV export) |

---

## 🧠 Machine Learning & Robustness Pipeline

The triage decision-support engine employs an interpretable **Multinomial Logistic Regression with L2 Regularization** trained on structured emergency intake features:

```
INPUTS (32 Features)                       MODEL CORE                         OUTPUTS
• Physiological Vitals (HR, BP, SpO2, RR, Temp, GCS)  ────────►  ┌────────────────────────┐  ──────►  • Predicted ESI Level (1..5)
• Demographics (Age, Pediatric, Geriatric)            ────────►  │ Interpretable Logistic│  ──────►  • Continuous Risk Score (0..100)
• High-Risk Syndromes (Chest Pain, Stroke, Trauma)    ────────►  │ Regression + Scaler   │  ──────►  • Model Confidence (%)
• Clinician Observations (Diaphoresis, Cyanosis)      ────────►  │ + Safety Guardrails   │  ──────►  • Explainability Factor Weights
• Hospital Capacity Context (Waiting Room Ratio)      ────────►  └────────────────────────┘  ──────►  • Input Classification Tags
```

### Safety Guardrails & OOV Invariants:
1. **Unseen / OOV Complaints**: Categorized as `UNKNOWN/UNSEEN`; evaluated via baseline physiological hemodynamics with an uncertainty penalty rather than arbitrary emergency escalation.
2. **Missing Vital Fallbacks**: Safe physiological adult baselines are imputed with explicit `MISSING` categorization and clinician review alerts.
3. **Safety Invariant (No Silent Downgrades)**: Critical physiological abnormalities ($\text{GCS} \le 8, \text{SpO}_2 < 85\%, \text{SBP} < 70$) are held strictly at **Level 1 Resuscitation** regardless of missing or unclassified text fields.

---

## 🧪 Verification & Automated Tests

Run the complete backend and ML robustness regression test suite:

```bash
python -m pytest tests/ -v
```

### Test Suite Summary:
```text
tests/test_api.py ......................... [ 21%]
tests/test_auth_api.py .................... [ 26%]
tests/test_beds_and_treatments.py ......... [ 32%]
tests/test_full_integration.py ............ [ 39%]
tests/test_milestone1_data.py ............. [ 57%]
tests/test_ml_robustness.py ............... [ 72%]
tests/test_model.py ....................... [ 83%]
tests/test_reassessment.py ................ [ 90%]
tests/test_seed_data_api.py ............... [ 95%]
tests/test_stage_a.py ..................... [100%]

======================= 66 passed, 6 warnings in 14.66s =======================
```

To build the frontend production distribution:
```bash
cd frontend && npm run build
# ✓ 1667 modules transformed.
# ✓ built in 4.84s (0 errors)
```

---

## ⚠️ Clinical & Prototype Disclaimer

> **IMPORTANT CLINICAL NOTICE**:  
> PatientTriage.ai is developed for **architectural demonstration, software evaluation, and healthcare technology research purposes**.  
> The included clinical models, test rules, and synthetic patient datasets are **NOT clinically certified** or validated for actual medical diagnosis, autonomous triage, or definitive patient management. All recommendations are intended to serve as decision support and must be verified by licensed medical professionals.

---

## 📄 License

Distributed under the **MIT License**. See `LICENSE` for more information.
