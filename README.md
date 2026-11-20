# Eyewitness Memory & Social Media Experiment

A static, browser-based psychology experiment examining post-event misinformation and confidence changes after feedback. It uses the two supplied moving traffic-incident clips.

## Files

- `index.html` — participant-facing experiment
- `styles.css` — page styling
- `script.js` — random assignment, presentation, questions, confidence measures, scoring, and CSV exports
- `accident_stop.mp4` — supplied clip showing a STOP sign
- `accident_yield.mp4` — supplied clip showing a YIELD sign

## Run locally

1. Keep all six files in the same folder.
2. Open `index.html` in a current version of Chrome, Firefox, Safari, or Edge.
3. Complete the experiment. The selected video plays once; after it ends, the Continue button becomes available.
4. After the final response, the results screen displays the participant's score, accuracy percentage, misinformation-consistent errors, and confidence rating. It also explains expected group-level patterns using the misinformation effect, reconstructive memory, source-monitoring errors, and feedback-related confidence changes. The explanation discusses why an individual's result may differ from the expected pattern.
5. As soon as the results screen appears, the app automatically uploads `summary_<sid>.csv` and `trials_<sid>.csv` to the Team 4 DataPipe experiment. The participant can read the debrief and take a break. The **Continue to next activity** button remains disabled until both files are accepted; the participant must press it to advance with the same anonymous `sid` and chain `B`.
6. If automatic saving fails, the participant can retry or download both CSV files as a backup. Add `?test=1` to the app URL to show backup-download controls during testing.

If a browser blocks video playback when opening the file directly, run a simple local static server from this folder:

```bash
python3 -m http.server 8000
```

Then open `http://localhost:8000`.

## Publish with GitHub Pages

1. Create a new GitHub repository.
2. Upload all six project files to the repository root (not just the HTML file).
3. In the repository, open **Settings → Pages**.
4. Under Build and deployment, select **Deploy from a branch**.
5. Select the `main` branch and `/ (root)`, then Save.
6. Wait for GitHub Pages to publish and open the public URL shown in Settings → Pages.

The MP4 files must remain in the repository root with their exact filenames because `script.js` references them.

## Experimental design

Participants are independently randomized to:

- **Post-event information:** accurate or misleading.
- **Feedback:** strongly confirming or neutral.
- **Clip version:** STOP-sign or YIELD-sign version (randomly selected).

This creates a 2 × 2 design for information accuracy and feedback, with clip version randomized as a stimulus variant. The misleading post reverses the road-sign detail and which vehicle approached from the left/right. The accurate post describes those details as shown in the assigned clip.

The four memory questions ask about:
1. Road sign at the intersection.
2. Vehicle approaching from the left.
3. Vehicle approaching from the right.
4. Outcome of the event.

Participants receive their assigned feedback first, then rate overall confidence once on a 0–100 scale. Feedback assignment is independent of answer accuracy. The confirming feedback is deliberately non-contingent; it should not be interpreted as a true performance score.

## Data files

At completion, participants can download:

- **Summary CSV:** one row per session.
- **Trial-level CSV:** four rows per session, one per memory question.

The app sends anonymous CSV data to DataPipe using the assigned Team 4 experiment ID. Each participant receives one random session ID, and the same ID is included in both files and passed to the next project. No names, email addresses, passwords, API keys, or other direct identifiers are collected or transmitted. The DataPipe experiment ID is configuration, not a secret credential.

## Important research notes

- The supplied clips are approximately 6.6 seconds and 5.1 seconds long, respectively. They show a staged collision between a dark sedan and a white SUV at an intersection; the main visible difference is the STOP versus YIELD sign.
- The misleading post intentionally changes the sign and vehicle approach directions. This is a strong manipulation, so pilot-test it with people who are not in the final sample.
- The two clip variants differ in road-sign content. The script randomizes clip version independently of the two experimental variables and stores the version in the data so it can be controlled for in analysis.
- This is a class-project prototype, not a validated instrument. Obtain instructor approval for consent, debriefing, participant age, data handling, and any required ethics review before collecting data.
