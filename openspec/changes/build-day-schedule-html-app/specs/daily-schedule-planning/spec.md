## ADDED Requirements

### Requirement: Outlook-style day timeline view
The system SHALL render an Outlook-style day schedule view with a vertical timeline and task area for a single selected date.

#### Scenario: Day timeline is shown
- **WHEN** the schedule page is opened
- **THEN** the UI shows a vertical time axis and a corresponding task placement area for one day

### Requirement: Operating hours are constrained to 7:30-18:00
The system SHALL only display and accept schedule times within the inclusive range from 07:30 to 18:00.

#### Scenario: Out-of-range time is prevented
- **WHEN** a user attempts to create or edit a task outside 07:30-18:00
- **THEN** the system prevents the value or normalizes it into the valid range before saving

### Requirement: Task time input supports 15-minute intervals
The system SHALL allow task times to be entered and stored only in 15-minute increments.

#### Scenario: Non-15-minute input is normalized
- **WHEN** a user inputs a time not aligned to a 15-minute boundary
- **THEN** the system snaps the time to the nearest valid 15-minute slot and reflects the normalized value in the UI

### Requirement: Selected date is visible at top-left
The system SHALL display the currently opened date in the top-left area of the schedule UI.

#### Scenario: Date is shown in top-left header
- **WHEN** the schedule page is rendered for a specific date
- **THEN** the selected date appears in the top-left header region and remains visible during normal interaction

### Requirement: Deliverable is browser-openable HTML
The system SHALL provide the schedule application as HTML that can be opened and used in a web browser.

#### Scenario: HTML output works in browser
- **WHEN** a user opens the delivered HTML in a modern browser
- **THEN** the schedule UI loads and the core behaviors (timeline display, date header, and 15-minute constrained input) are available
