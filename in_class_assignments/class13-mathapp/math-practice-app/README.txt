MATH PRACTICE APP
=================

A friendly math flashcard app for kids ages 7 to 12. It practices addition,
subtraction, multiplication and division across four difficulty levels,
remembers missed questions, and builds similar questions to review them.

Everything runs in the browser. There is no account, no server and no
tracking. Progress is saved in the browser's localStorage on this device.

Built with React 19, TypeScript, Vite and React Router.


1. REQUIREMENTS
---------------

- Node.js 20.19 or newer (or 22.12 or newer). Check with:   node -v
- npm (comes with Node.js).                                 npm -v
- A modern browser (Chrome, Edge, Firefox or Safari).


2. QUICK START
--------------

Open a terminal in this folder (math-practice-app) and run:

    npm install
    npm run dev

Then open the address it prints, usually:

    http://localhost:5173

Press Ctrl+C in the terminal to stop the server.


3. INSTALL DEPENDENCIES
-----------------------

    npm install

This reads package.json and package-lock.json and downloads everything into
the node_modules folder. Run it once after cloning, and again whenever
package.json changes. node_modules is not committed to git; npm install
always recreates it.

For a clean install that matches the lock file exactly:

    npm ci


4. RUN THE APP LOCALLY (DEVELOPMENT)
------------------------------------

    npm run dev

- Starts the Vite development server at http://localhost:5173.
- The page reloads automatically when you save a file.
- To use a different port:   npm run dev -- --port 3000
- To open it from another device on your network:   npm run dev -- --host


5. CHECK THE CODE
-----------------

    npm test              Run every test once (Vitest)
    npm run test:watch    Re-run tests when files change
    npm run typecheck     TypeScript type check
    npm run lint          ESLint
    npm run lint:fix      ESLint with automatic fixes
    npm run format        Format all files with Prettier
    npm run format:check  Check formatting without changing files

Run a subset of tests by adding a folder or file name, for example:

    npm test -- src/services


6. BUILD FOR DEPLOYMENT
-----------------------

    npm run build

- Type-checks the project, then creates an optimized production build in
  the dist folder.
- dist contains index.html, the assets folder, favicon.svg and _redirects.

Preview the production build on your own computer before deploying:

    npm run build
    npm run preview

Then open http://localhost:4173.

Important: npm run preview only serves what is already in dist. If you see
"This localhost page can't be found" (HTTP 404), run npm run build first.
Run npm run build again after every code change.


7. DEPLOY
---------

The dist folder is a static website and can be hosted anywhere.

Netlify (drag and drop, no account setup in the terminal):
  1. Run npm run build.
  2. Open https://app.netlify.com/drop in your browser.
  3. Drag the dist folder onto the page.
  4. Netlify gives you a public URL.

The file public/_redirects (copied into dist) tells Netlify to serve the app
for every URL, so links like /statistics and /settings work when opened
directly or refreshed. Other hosts need the same "single page app" rule:
send every path to /index.html with status 200.

After deploying, check:
  - Every page loads when its URL is typed directly.
  - Progress is still there after closing and reopening the browser.
  - The layout works on a phone and a tablet.
  - The browser console shows no errors.


8. PROJECT LAYOUT
-----------------

    index.html            Page shell (title, favicon)
    public/               Files copied to dist as-is (favicon, _redirects)
    src/main.tsx          Entry point; repairs stored data, then renders
    src/app/              App, routes, providers (settings, practice session)
    src/pages/            One component per page (Home, Setup, Practice, ...)
    src/components/       UI pieces (common, layout, practice, setup, statistics)
    src/services/         Logic: question generation, storage, statistics,
                          mistake tracking, review and mastery
    src/hooks/            React hooks (settings, practice session, a11y helpers)
    src/types/            Shared TypeScript types
    src/utils/            Small helpers (random numbers, shuffle, labels)
    src/test/             Test setup, helpers, integration and a11y tests

Design notes: ../DESIGN.md
Specification: ../math-practice-app-specification.md
Task list and progress: ../TODO.md and ../PROGRESS.md


9. DATA AND PRIVACY
-------------------

- All data is stored in this browser only, under keys that start with
  "mathPractice." (settings, sessions, attempts, mistake patterns,
  statistics, the active session and a schema version).
- No personal information is collected and nothing is sent anywhere.
- Clearing browser data, or using Settings > Clear All Application Data,
  erases progress.
- Statistics > Reset Statistics clears practice history but keeps settings.


10. TROUBLESHOOTING
-------------------

- 404 on npm run preview: run npm run build first (see section 6).
- "Port 5173 is in use": another dev server is running. Stop it with Ctrl+C,
  or start on another port with  npm run dev -- --port 5174
- npm install fails: check  node -v  meets the requirement in section 1,
  then delete node_modules and run  npm install  again.
- The page looks stuck after a code change: refresh the browser, or stop and
  restart npm run dev.
- Old or broken saved data: open Settings and use Clear All Application Data,
  or clear this site's data in the browser.
