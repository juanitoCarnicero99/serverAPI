# Flutter MVC Login API

This project is a simple Flutter application that implements user login functionality using the Model-View-Controller (MVC) pattern. It validates user credentials against a backend API.

## Project Structure

```
flutter_mvc_login
├── lib
│   ├── main.dart                # Entry point of the application
│   ├── controllers              # Contains the AuthController for managing authentication logic
│   ├── models                   # Contains the User model
│   ├── views                    # Contains the LoginView for the UI
│   ├── services                 # Contains the ApiService for handling HTTP requests
│   ├── repositories             # Contains the UserRepository for interacting with the ApiService
│   └── utils                    # Contains utility functions for input validation
├── test                         # Contains unit tests for the application
│   └── auth_controller_test.dart # Tests for the AuthController
├── pubspec.yaml                 # Flutter project configuration
├── analysis_options.yaml        # Dart analyzer configuration
├── .gitignore                   # Files and directories to ignore in version control
└── README.md                    # Project documentation
```

## Setup Instructions

1. **Clone the repository:**
   ```
   git clone <repository-url>
   cd flutter_mvc_login
   ```

2. **Install dependencies:**
   ```
   flutter pub get
   ```

3. **Run the application:**
   ```
   flutter run
   ```

## Usage

- Open the application, and you will see the login screen.
- Enter your username and password.
- Click the login button to authenticate.

## Contributing

Feel free to submit issues or pull requests for improvements or bug fixes.