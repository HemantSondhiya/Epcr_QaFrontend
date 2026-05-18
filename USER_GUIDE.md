# MetroEMS Platform: Role-Based User Guide

This guide explains the specific workflows and responsibilities for every role within the MetroEMS ecosystem, including a real-life scenario to show how the "Flow" connects everyone.

---

## 1. 🛡️ System Administrator (ADMIN)
The Administrator oversees the entire platform and organization structure.
*   **Key Responsibilities:**
    *   **User Management:** Create, update, and deactivate accounts for all staff members.
    *   **Audit Logs:** Monitor every action taken in the system for security and compliance.
    *   **System Settings:** Configure global security policies and HIPAA parameters.
    *   **Access Level:** Full access to all records and configuration screens.

## 2. 🏢 Organization Manager (MANAGER)
Managers handle the operational efficiency of their specific organization.
*   **Key Responsibilities:**
    *   **Workflow Management:** Design the steps that medical records must go through (e.g., from Draft to QA to Finalized).
    *   **Reporting:** Access high-level analytics to see response times and clinical outcomes.
    *   **Organization Settings:** Update office details, contact info, and business associate agreements (BAA).

## 3. 🚑 Paramedic (PARAMEDIC)
Paramedics are the primary creators of data in the system.
*   **Key Responsibilities:**
    *   **EPCR Creation:** Fill out Electronic Patient Care Records during or after an emergency call.
    *   **Vitals Tracking:** Log patient heart rate, blood pressure, and medication administration.
    *   **Record Submission:** Submit records to the QA queue once complete.
    *   **Notifications:** Receive alerts when a record is sent back for corrections.

## 4. ⚖️ QA Reviewer (QA_REVIEWER)
Quality Assurance Reviewers ensure the clinical data meets medical standards.
*   **Key Responsibilities:**
    *   **Reviewing Records:** Score paramedics based on their documentation and care protocols.
    *   **Approval/Rejection:** Approve records to be finalized or reject them if more info is needed.
    *   **Feedback:** Provide direct feedback to paramedics within the system.

## 5. 👨‍⚕️ Physician (PHYSICIAN)
Physicians provide clinical oversight and handle high-level medical requests.
*   **Key Responsibilities:**
    *   **Medical Oversight:** Review complex clinical records and QA outcomes.
    *   **Amendment Approval:** Review and approve requests from patients who want to correct their medical history.
    *   **Clinical Review:** Provide expert clinical feedback on critical incident records.

## 6. 👤 Patient (PATIENT)
Patients use a specialized portal to manage their own health data.
*   **Key Responsibilities:**
    *   **Access Records:** View and download personal medical documents.
    *   **Privacy Rights:** Request data corrections (Amendments) or privacy restrictions.
    *   **Disclosure Tracking:** See exactly who has accessed their medical information.
    *   **Notifications:** Receive instant alerts when records are approved or privacy requests are processed.

---

## 🌟 Real-Life Scenario: "The Story of a Patient Visit"

To better understand how these roles work together, let's follow a real-life example:

### Step 1: The Incident (Paramedic)
John (a **Patient**) has a sudden allergic reaction. Sarah (a **Paramedic**) arrives. Sarah treats John and uses her tablet to create an **EPCR**. She records John’s heart rate (110 bpm) and the medication she gave him. Once Sarah returns to the station, she clicks **Submit**.

### Step 2: The Quality Check (QA Reviewer)
Dr. Miller (a **QA Reviewer**) sees Sarah's record in his "Pending Queue." He reviews the data and sees that Sarah followed all medical protocols perfectly. He gives the record a score of 95% and clicks **Approve**.

### Step 3: The Notification (System)
The moment Dr. Miller clicks approve, the **MetroEMS System** sends an automated notification. John (the **Patient**) gets a ping on his phone and see a red badge on the bell icon in his portal.

### Step 4: Accessing Data (Patient)
John logs into his **Patient Portal** using an OTP. He sees his record is approved. He looks at his vitals chart and notices that while his heart rate was high initially, it stabilized after Sarah's treatment. He feels reassured seeing the data.

### Step 5: The Correction (Patient & Physician)
John realizes he forgot to tell Sarah about a mild allergy to penicillin. He clicks **Request Amendment** in his portal and types in the new information. 

### Step 6: Final Approval (Physician)
Dr. Smith (a **Physician**) receives John's request. He reviews the case and agrees that this is important medical info. He clicks **Approve Amendment**. The record is updated, and John receives one final notification that his medical file is now 100% accurate.

---

## 🔄 The Technical Flow Summary
1.  **PARAMEDIC** → Submits Data.
2.  **QA_REVIEWER** → Validates Data.
3.  **SYSTEM** → Notifies Patient.
4.  **PATIENT** → Reviews Data & Requests Privacy/Corrections.
5.  **PHYSICIAN** → Finalizes HIPAA Requests.
6.  **ADMIN** → Audits the entire process.

---
*Every role is secured with role-based access control (RBAC), ensuring users only see the data necessary for their specific job.*
