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
