# DormiFlow Design Documentation

## 1. Design Overview
DormiFlow is a minimal dormitory management system designed with a clean orange and white aesthetic. The interface focuses on clarity, ease of use, and a welcoming professional atmosphere.

## 2. Visual Identity
- **Color Palette**:
  - Primary: Vivid Orange (#FF8C00) — primary CTAs, active states, and branding
  - Surface: White (#FFFFFF) and Soft Cream (#FFF8F5) — backgrounds for minimal feel
  - Success/Status: Green/Orange tones depending on context
- **Typography**: Inter (Sans-serif) for high readability and a modern feel
- **Visual Style**: Soft shadows, rounded corners (8px+), generous whitespace

## 3. Screen Breakdown

### Dashboard
- **Purpose**: High-level overview of dormitory operations
- **Key Features**:
  - Occupancy radial chart
  - Revenue growth line chart
  - Maintenance task list with urgency badges
  - Recent activity feed

### Room Management
- **Purpose**: Visual inventory of rooms and their current status
- **Key Features**:
  - Status filters (All, by Floor)
  - Room cards showing occupancy status (Occupied, Available, Maintenance)
  - Tenant quick-view on occupied room cards
  - "Add New Room" action

### Tenant Directory
- **Purpose**: Management of resident data and contract lifecycle
- **Key Features**:
  - Summary stats (Total residents, active contracts, renewals)
  - Data table with tenant name, contact info, and contract status badges (Active, Inactive)
  - Pagination and quick search

### Payments & Billing
- **Purpose**: Financial tracking and invoice management
- **Key Features**:
  - Monthly revenue summary with progress bar against expected totals
  - Action cards for overdue and pending amounts
  - Invoice list with status indicators (Paid, Overdue, Unpaid)
  - "New Bill" and "Record Payment" primary actions

## 4. Interaction Patterns
- **Navigation**: Persistent left-hand sidebar for quick access between modules
- **Filtering**: Segmented controls and dropdowns for data management
- **Feedback**: Color-coded badges to communicate status at a glance
