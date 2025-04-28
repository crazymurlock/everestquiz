# Quiz Game

## Description
A simple real-time quiz that supports up to 300 players. Players join via QR code, answer 5 questions from a Google Sheet, and race to the top based on speed and accuracy.

## Prerequisites
- Node.js v14+
- Google Cloud project with Sheets API enabled
- Service account credentials JSON
- A Google Sheet with columns (A:F): question, option1, option2, option3, option4, correctAnswerIndex (0-based)

## Setup
1. Clone the repo:
   ```
   git clone <repo-url>
   cd quiz-game
   ```
2. Install dependencies:
   ```
   npm install
   ```
3. Create a `.env` file:
   ```
   GOOGLE_CREDENTIALS='{"type":...,"project_id":...}'
   SHEET_ID=your_google_sheet_id
   SHEET_RANGE=Sheet1!A2:F
   ```
4. Share the sheet with your service account email.
5. Run locally:
   ```
   npm start
   ```
   Visit `http://localhost:3000`, scan the QR code, and play!

## Deployment
- **Glitch**: Import ZIP, set `.env`, go live.
- **Railway/Render**: Connect repo, set env vars, deploy.
