## Features

- **User Authentication**: Login and registration for clients and barbers using Firebase.
- **Role-Based Access**: Different interfaces for clients and barbers.
- **Profile Management**: Edit profiles for both roles.
- **Social Features**: View barber posts, like content, search by hashtags.
- **Reservations**: Book appointments with barbers.
- **Shop and Gifts**: Explore shop items and gift options.
- **Real-Time Connection Status**: Monitor internet connectivity.

## Setup Instructions

1. **Prerequisites**:
   - Node.js (version 14 or higher)
   - npm or yarn
   - Expo CLI: Install globally with `npm install -g @expo/cli`
   - A Firebase project for authentication and data storage (configure in `config/firebase.js`)

2. **Clone the Repository**:

   ```
   git clone <repository-url>
   cd project
   ```

3. **Install Dependencies**:

   ```
   npm install
   ```

4. **Configure Firebase**:
   - Set up your Firebase project.
   - Add your Firebase config to `config/firebase.js`.

5. **Run the App**:
   - Start the Expo development server:
     ```
     npx expo start
     ```
   - Scan the QR code with the Expo Go app on your phone, or run on an emulator/simulator.

## Navigation Guide

AirCut uses a state-based navigation system managed in `App.js`. Here's a step-by-step guide for first-time users:

### Initial Launch

1. **Splash Screen**: The app starts with a splash screen that displays briefly.
2. **Role Selection**: If you're not logged in, you'll see a screen to choose your role: Client or Barber. Select your role to proceed.

### Authentication

3. **Login**: Enter your email and password. If you don't have an account, tap "Go to Register."
4. **Registration**:
   - For clients: Fill in your details on the Register Client screen.
   - For barbers: Fill in your details on the Register Barber screen.
   - After registration, you'll be logged in automatically.

### Main App Navigation

Once logged in, you'll see the main app interface with a header and bottom navigation bar.

#### Bottom Navigation Tabs:

- **Home**: Browse barber posts, view profiles by tapping on a barber's name, and search by hashtags.
- **Like**: View liked content (if implemented).
- **Shop**: Explore shop items.
- **Prenotazioni** (Reservations): Manage your bookings.
- **Gift**: View gift options.
- **Account**: Access your profile. The screen differs based on your role:
  - Clients: Client Account Screen – view and edit your profile.
  - Barbers: Barber Account Screen – view and edit your barber profile.

#### Additional Navigation:

- **Viewing Profiles**: From the Home screen, tap a barber's name to view their detailed profile. Use the back button to return.
- **Editing Profiles**: From the Account screen, navigate to edit your profile. Changes are saved automatically.
- **Search**: Tap on hashtags in posts to search for related content. The search screen filters results accordingly.
- **Logout**: From the Account screen, log out to return to the role selection.

### Tips for Navigation

- The app uses conditional rendering based on login status, user role, and current tab.
- If you encounter issues with roles not loading, the app automatically checks and updates them.
- All navigation is handled through state changes in the main `App.js` component, ensuring a smooth user experience.

## Project Structure

- `App.js`: Main app component handling navigation and state.
- `components/`: Reusable UI components like Header, BottomNavigation, etc.
- `screens/`: Individual screen components for different views.
- `services/`: Firebase authentication and media services.
- `config/`: Firebase configuration.
- `assets/`: Images and other static assets.

## License

This project is licensed under the MIT License.

## M1

Perfect — this is a **Milestone 1 (M1) README**, focused on **what is implemented**, aligned with the spec, and written in a **professional, audit-safe way** (important for approvals and payments).

You can copy-paste this directly as `README.md` for **M1**.

---

# AIRCUT – Milestone 1 (M1)

**Core Infrastructure, Onboarding & Security**

This document describes the work completed for **Milestone 1 (M1)** of the AIRCUT project, based strictly on the agreed scope and execution roadmap(few thing will be seem to be working in future as it require other milestone work on inner screens).

---

## ✅ 1.1 Core Infrastructure Setup

### Project Initialization

- React Native project initialized using **Expo Managed Workflow**
- Clean, scalable folder structure introduced (`src/app`)
- Navigation architecture prepared for long-term scalability (supports deep linking)

### Backend Setup

- Firebase configured with:
  - **Authentication**
  - **Firestore**
  - **Storage**

### Internationalization (I18N)

- Internationalization framework set up
- Language files created:
  - `en.json`
  - `it.json`

- No hardcoded text in the app(as i will start working on other screen there hardcoded languages will be dynamic)
- Language can currently be switched by tapping the **“Aircut”** label on the role selection screen
- Architecture prepared for a proper in-app language toggle in later milestones

### Technical Architecture Goals

- Architecture prepared with a focus on:
  - Zero wait times (cache-ready structure, context for auth implemented)
  - Stability and scalability
  - Clean separation of concerns for future features

---

## ✅ 1.2 Tag Taxonomy Implementation (Database v1.8)

### Tag Taxonomy Structure

- Centralized **Tag Taxonomy** defined in Firestore(in both Language)
- Each tag includes category attributes:
  - `male_unisex`
  - `female_unisex`

### Male / Unisex Tags Implemented

- Low Fade
- Mid Fade
- High Fade
- Taper Fade
- Burst Fade
- Slick Back
- Side Part
- Middle Part
- Edgar Cut
- Barba
- Afro
- Treccine

### Female / Unisex Tags Implemented

- Bob / Caschetto
- Taglio Lungo / Scalato
- Frangia
- Riccio
- Liscio
- Mosso
- Balayage / Shatush
- Blonde / Colpi di Sole
- Vivid Colors
- Sposa / Eventi

All tags are stored in the database and consumed dynamically by the app (no hardcoded tags).

---

## ✅ 1.3 Barber Onboarding & Registration

### UI Implementation

- Registration collects:
  - Professional’s First and Last Name (Username)
  - Salon Name

- Both values are structured to be searchable (e.g. _“John – X Barbershop”_)

### Legal Consent

- Mandatory checkbox implemented with the exact text defined in **Section 4.1**
- User cannot proceed without accepting

### Database Schema (Barber)

The following fields are stored on registration:

```json
{
  "accountType": "barber",
  "termsAccepted": true,
  "liabilityAccepted": true
}
```

---

## ✅ 1.4 Client Onboarding & Registration

### Preferences Selection

- Preferences screen implemented using the **Tag Taxonomy**
- Tags are loaded dynamically from Firestore

### Gender-Based Logic

- Female users see only **Female / Unisex** tags
- Male users see only **Male / Unisex** tags

### Legal Consent

- Mandatory checkbox implemented with the exact text defined in **Section 4.2**

### Database Schema (Client)

The following fields are stored on registration:

```json
{
  "accountType": "client",
  "termsAccepted": true,
  "liabilityAccepted": false,
  "preferredTags": []
}
```

---

## ✅ 1.5 Security & Data Protection (Phase 1)

### Client-Side Input Sanitization

- Basic sanitization applied to user inputs to prevent injection and malformed data
- Applied to all relevant registration fields

### Firestore Security Rules (Users)

Implemented and enforced:

- `isAuthenticated()` – only authenticated users can access protected data
- `isOwner(userId)` – users can only modify their own data
- `isBarber()` – barber-only logic enforced where required
- Users collection rules:
  - Create / Update / Delete only allowed for the document owner
  - **User role is immutable** — a client cannot become a barber after registration

---

## 📌 Notes

- This milestone is **architecture- and foundation-focused**
- Profile editing, inner screens, and advanced UI refinements are intentionally excluded and planned for upcoming milestones
- All implementations strictly follow the provided specification (no features removed)
