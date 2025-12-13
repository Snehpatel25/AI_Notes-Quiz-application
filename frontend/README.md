# PlayPower Frontend

React-based frontend application for PlayPower Notes & Quiz Application.

## Setup

1. Install dependencies:
```bash
npm install
```

2. Create a `.env` file in the frontend directory:
```
REACT_APP_API_URL=http://localhost:5000/api
REACT_APP_GROQ_API_KEY=your-groq-api-key-here
```

3. Start the development server:
```bash
npm start
```

The app will run on `http://localhost:3000`

## Features

- Custom Rich Text Editor (built from scratch)
- Note Management (create, edit, delete, pin, search)
- AI-Powered Features (glossary highlighting, summarization, tags, grammar check)
- Note Encryption with password protection
- Data Persistence with IndexedDB
- Modern, Responsive UI

## Build for Production

```bash
npm run build
```

The build folder will contain the production-ready files.





