# KVS Ahmedabad Region – Music Teachers Workshop Participant Hub

Standalone, mobile-responsive participant website for the five-day CPD workshop at ZIET Mumbai.

- **Theme:** लय, राग और आत्मचिंतन | Rhythm, Raga and Reflection
- **Dates:** 02–06 November 2026
- **Venue:** ZIET Mumbai
- **Audience:** Music Teacher Participants, KVS Ahmedabad Region

## GitHub Pages deployment
1. Open **Settings → Pages**.
2. Under **Build and deployment**, select **Deploy from a branch**.
3. Choose branch **main** and folder **/(root)**, then Save.
4. Site URL: https://taprimaryzietmumbai-kjrd.github.io/MUSIC-TEACHERS-AHMEDABAD-REGION-WORKSHOP/

## Before public circulation
- Replace draft day-wise session titles with the approved timetable.
- Add approved resource, concept note, handout, photo album and recording links.
- Connect Contributions and Reflection to an approved Google Form or Apps Script endpoint for central collection. In this starter build, these forms only download local text notes; nothing is sent to a server.
- Publish only approved participant photos and recordings with appropriate permissions.

No build step, framework, external library or paid hosting is required.


## Session-wise resource links (one-time setup)

The Schedule section now provides a small **Resources** panel under every Morning Assembly and Session 1–4 cell. An authorised coordinator can add a resource title and a Google Drive, PDF, PPT, video, feedback form, report, QR-code image, or website link. Saved links are stored centrally in a Google Sheet and displayed to all participants.

### Connect shared storage

1. Open [Google Apps Script](https://script.google.com) and create a **New project**.
2. Open this repository's `Code.gs` file, copy its complete contents, and paste them into the Apps Script editor (replace the starter code).
3. Save the project. Select `initializeResourceStore` in the function dropdown and click **Run**. Approve the requested Google permissions. This creates the shared Google Sheet automatically. Keep that Sheet in the workshop coordination account.
4. In Apps Script, open **Project Settings → Script Properties → Add script property**:
   - Property: `ADMIN_PIN`
   - Value: create a private PIN and share it only with the resource coordinator(s).
5. Click **Deploy → New deployment → Web app**:
   - Execute as: **Me**
   - Who has access: **Anyone**
   - Deploy and authorise if prompted.
6. Copy the deployed Web app URL ending in `/exec`.
7. In `index.html`, find `const RESOURCE_API_URL =` near the resource form code and replace `PASTE_YOUR_GOOGLE_APPS_SCRIPT_WEB_APP_URL_HERE` with that URL. Keep the URL inside the quotation marks.
8. Commit the updated `index.html` to the `main` branch. Allow GitHub Pages a minute or two to publish.

### Add resources after setup

- Open the Schedule tab.
- Go to the required date and session.
- Enter a resource title and paste its shareable link.
- Click **Add Hyperlink**. The first time, enter the private administrator PIN.
- The saved link appears under that session and is available to other participants after the page refreshes.

**Important:** For Google Drive files, set sharing to the access level permitted by KVS/ZIET policy (for example, anyone with the link can view, if approved). Do not paste private or restricted links. Public visitors can view saved resource links; only users with the administrator PIN can add new ones. If you redeploy Apps Script as a new version later, update the deployment rather than creating a different URL wherever possible.
