(() => {
  "use strict";

  // Team configuration. The experiment ID is a public routing identifier, not a password.
  const TEAM_ID = "4";
  const CHAIN_ID = "B";
  const DATAPIPE_EXPERIMENT_ID = "gZZ1nvUDsmz4";
  const NEXT_PROJECT_URL = "https://laurenbier.github.io/Memory-on-trial/";
  const DATAPIPE_ENDPOINT = "https://pipe.jspsych.org/api/data/";

  const $ = (id) => document.getElementById(id);
  const screens = ["consentScreen", "welcome", "videoScreen", "postScreen", "questionScreen", "feedbackScreen", "resultsScreen"];
  const show = (id) => screens.forEach((screen) => $(screen).classList.toggle("hidden", screen !== id));
  const now = () => new Date().toISOString();

  // FIRST project: create one anonymous ID once, at the beginning of the session.
  function makeSessionId() {
    const alphabet = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";
    const bytes = new Uint8Array(12);
    if (window.crypto && window.crypto.getRandomValues) {
      window.crypto.getRandomValues(bytes);
      return Array.from(bytes, (byte) => alphabet[byte % alphabet.length]).join("");
    }
    return Array.from({ length: 12 }, () => alphabet[Math.floor(Math.random() * alphabet.length)]).join("");
  }
  const sid = makeSessionId();

  const clip = Math.random() < 0.5 ? "stop" : "yield";
  const misinformation = Math.random() < 0.5 ? "misleading" : "accurate";
  const feedbackCondition = Math.random() < 0.5 ? "confirming" : "neutral";
  const sign = clip === "stop" ? "STOP" : "YIELD";
  const wrongSign = clip === "stop" ? "YIELD" : "STOP";
  const signAccurate = `The intersection had a ${sign} sign.`;
  const signMisleading = `The intersection had a ${wrongSign} sign.`;
  const directionAccurate = "A dark sedan approached from the left, while a white SUV approached from the right.";
  const directionMisleading = "A white SUV approached from the left, while a dark sedan approached from the right.";
  const questions = [
    { id: "road_sign", text: "Which road sign was visible at the intersection?", options: ["STOP sign", "YIELD sign", "Traffic light", "No sign was visible"], correct: clip === "stop" ? "STOP sign" : "YIELD sign", misinformationOptions: [wrongSign + " sign"] },
    { id: "left_vehicle", text: "Which vehicle approached the intersection from the left side of the video?", options: ["A dark sedan", "A white SUV", "A red pickup truck", "A bus"], correct: "A dark sedan", misinformationOptions: ["A white SUV"] },
    { id: "right_vehicle", text: "Which vehicle approached the intersection from the right side of the video?", options: ["A dark sedan", "A white SUV", "A red pickup truck", "A bus"], correct: "A white SUV", misinformationOptions: ["A dark sedan"] },
    { id: "event_outcome", text: "What happened between the two vehicles?", options: ["They collided at the intersection", "They stopped safely without contact", "One vehicle made a U-turn", "They passed through without interacting"], correct: "They collided at the intersection", misinformationOptions: [] }
  ];

  const answers = [];
  const trials = [];
  let qIndex = 0;
  let videoWatched = false;
  let postConfidence = null;
  let startedAt = null;
  let videoStartedAt = null;
  let postShownAt = null;
  let summaryData = null;
  let uploadInProgress = false;
  let uploadComplete = false;

  const video = $("eventVideo");
  $("videoSource").src = clip === "stop" ? "accident_stop.mp4" : "accident_yield.mp4";
  video.load();

  $("consentProceed").addEventListener("click", () => show("welcome"));

  $("beginBtn").addEventListener("click", () => {
    startedAt = now();
    show("videoScreen");
    video.play().catch(() => {
      $("videoStatus").textContent = "If the video does not start automatically, check your browser settings and reload the page.";
    });
  });

  video.addEventListener("ended", () => {
    videoWatched = true;
    $("videoStatus").textContent = "Video complete. You may continue.";
    $("videoContinue").disabled = false;
  });
  video.addEventListener("play", () => { if (!videoStartedAt) videoStartedAt = now(); });

  $("videoContinue").addEventListener("click", () => {
    if (!videoWatched) return;
    const post = misinformation === "accurate"
      ? `${signAccurate} ${directionAccurate} The vehicles collided in the intersection.`
      : `${signMisleading} ${directionMisleading} The vehicles collided in the intersection.`;
    $("socialText").textContent = post;
    postShownAt = now();
    show("postScreen");
  });

  $("postContinue").addEventListener("click", () => {
    qIndex = 0;
    renderQuestion();
    show("questionScreen");
  });

  function renderQuestion() {
    const q = questions[qIndex];
    $("questionCount").textContent = `Question ${qIndex + 1} of ${questions.length}`;
    $("questionProgress").style.width = `${((qIndex + 1) / questions.length) * 100}%`;
    $("questionText").textContent = q.text;
    $("answerOptions").innerHTML = "";
    $("nextQuestion").disabled = true;
    q.options.forEach((option) => {
      const label = document.createElement("label");
      label.className = "option";
      const radio = document.createElement("input");
      radio.type = "radio";
      radio.name = "answer";
      radio.value = option;
      radio.addEventListener("change", () => { $("nextQuestion").disabled = false; });
      const span = document.createElement("span");
      span.textContent = option;
      label.append(radio, span);
      $("answerOptions").append(label);
    });
    $("nextQuestion").textContent = qIndex === questions.length - 1 ? "Submit answers" : "Next question";
  }

  $("questionForm").addEventListener("submit", (event) => {
    event.preventDefault();
    const selected = document.querySelector('input[name="answer"]:checked');
    if (!selected) return;
    const q = questions[qIndex];
    answers.push({
      question_id: q.id,
      question: q.text,
      response: selected.value,
      correct: selected.value === q.correct,
      misinformation_consistent: q.misinformationOptions.includes(selected.value)
    });
    qIndex++;
    if (qIndex < questions.length) renderQuestion();
    else showFeedbackScreen();
  });

  function showFeedbackScreen() {
    $("feedbackMessage").textContent = feedbackCondition === "confirming"
      ? "Your responses appear highly consistent with the event details. You did a very good job identifying what happened."
      : "Your responses have been recorded. Thank you for completing the memory questions.";
    show("feedbackScreen");
  }

  $("postConfidence").addEventListener("input", () => {
    $("postConfidenceValue").textContent = $("postConfidence").value;
  });

  function buildCSV(rows) {
    if (!rows.length) return "";
    const headers = Object.keys(rows[0]);
    const csvCell = (value) => {
      if (value === null || value === undefined) return "";
      const stringValue = String(value);
      return /[",\n\r]/.test(stringValue) ? `"${stringValue.replace(/"/g, '""')}"` : stringValue;
    };
    return [headers.join(","), ...rows.map((row) => headers.map((header) => csvCell(row[header])).join(","))].join("\r\n");
  }

  function downloadCSV(filename, rows) {
    const csv = buildCSV(rows);
    if (!csv) return;
    const blob = new Blob(["\uFEFF", csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = filename;
    document.body.appendChild(link);
    link.click();
    link.remove();
    URL.revokeObjectURL(url);
  }

  function showBackupDownloads() {
    $("downloadActions").classList.remove("hidden");
  }

  async function uploadCSV(filename, csvText) {
    const response = await fetch(DATAPIPE_ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        experimentID: DATAPIPE_EXPERIMENT_ID,
        filename,
        data: csvText
      })
    });

    let result = {};
    try { result = await response.json(); } catch (_) { /* Non-JSON error response. */ }

    if (response.status === 201 || response.status === 202) return;
    // A retry after a partial success can encounter a file already stored by the first attempt.
    if (response.status === 400 && result.error === "FILE_EXISTS") return;

    const reason = result.message || result.error || `HTTP ${response.status}`;
    throw new Error(`${filename}: ${reason}`);
  }

  function redirectToNextProject() {
    const destination = new URL(NEXT_PROJECT_URL);
    destination.searchParams.set("sid", sid);
    destination.searchParams.set("chain", CHAIN_ID);
    window.location.assign(destination.toString());
  }

  async function saveAndContinue() {
    if (uploadInProgress || uploadComplete) return;
    uploadInProgress = true;
    $("finishBtn").disabled = true;
    $("saveStatus").className = "save-status";
    $("saveStatus").textContent = "Saving your responses securely… Please keep this page open.";
    $("retryUploads").classList.add("hidden");
    $("downloadActions").classList.add("hidden");

    try {
      const summaryCSV = buildCSV([summaryData]);
      const trialsCSV = buildCSV(trials);
      await Promise.all([
        uploadCSV(`summary_${sid}.csv`, summaryCSV),
        uploadCSV(`trials_${sid}.csv`, trialsCSV)
      ]);
      uploadComplete = true;
      $("saveStatus").className = "save-status success";
      $("saveStatus").textContent = "Your responses have been saved successfully. Read the explanation above, take a break if you wish, then press Continue to next activity when you are ready.";
      $("continueBtn").disabled = false;
      $("continueHelp").textContent = "Saving is complete. You control when to move on; the next activity will not open until you press the button.";
      if (isTestRun) showBackupDownloads();
    } catch (error) {
      console.error("DataPipe upload failed:", error);
      uploadInProgress = false;
      $("finishBtn").disabled = false;
      $("saveStatus").className = "save-status error";
      $("saveStatus").textContent = "We couldn't confirm that your responses were saved. Your answers are still available on this page. Please retry saving. If it still fails, download both CSV files below and give them to the researcher.";
      $("retryUploads").classList.remove("hidden");
      $("continueBtn").disabled = true;
      $("continueHelp").textContent = "The next activity will remain paused until the upload succeeds. You can retry saving or download the CSV backups for the researcher.";
      showBackupDownloads();
      return;
    }
    uploadInProgress = false;
  }

  $("finishBtn").addEventListener("click", () => {
    if (summaryData) return;
    postConfidence = Number($("postConfidence").value);
    const correctCount = answers.filter((answer) => answer.correct).length;
    const falseMemoryCount = answers.filter((answer) => answer.misinformation_consistent && !answer.correct).length;
    summaryData = {
      session_id: sid,
      team_id: TEAM_ID,
      chain_id: CHAIN_ID,
      started_at: startedAt,
      completed_at: now(),
      clip_condition: clip,
      sign_shown: sign,
      information_condition: misinformation,
      feedback_condition: feedbackCondition,
      post_feedback_confidence: postConfidence,
      memory_accuracy_count: correctCount,
      memory_accuracy_percent: correctCount / questions.length * 100,
      misinformation_consistent_errors: falseMemoryCount,
      video_started_at: videoStartedAt,
      post_shown_at: postShownAt,
      video_watched_to_end: videoWatched
    };

    answers.forEach((answer, index) => {
      trials.push({
        session_id: sid,
        team_id: TEAM_ID,
        chain_id: CHAIN_ID,
        trial_number: index + 1,
        clip_condition: clip,
        information_condition: misinformation,
        feedback_condition: feedbackCondition,
        question_id: answer.question_id,
        question: answer.question,
        response: answer.response,
        correct_answer: questions[index].correct,
        correct: answer.correct,
        misinformation_consistent: answer.misinformation_consistent,
        post_feedback_confidence: postConfidence
      });
    });

    window.studySummary = summaryData;
    window.studyTrials = trials;
    $("resultSummary").innerHTML = `
      <div class="result-grid">
        <div class="metric"><strong>${correctCount} / 4</strong><span>Correct answers</span></div>
        <div class="metric"><strong>${Math.round(correctCount / 4 * 100)}%</strong><span>Memory accuracy</span></div>
        <div class="metric"><strong>${postConfidence}</strong><span>Confidence after feedback</span></div>
      </div>`;
    const misinformationErrors = answers.filter((answer) => answer.misinformation_consistent && !answer.correct).length;
    const confidenceLabel = postConfidence >= 70 ? "high" : postConfidence <= 30 ? "low" : "moderate";
    let interpretation = `<p>You answered <strong>${correctCount} of 4 questions correctly (${Math.round(correctCount / 4 * 100)}%)</strong>. You made <strong>${misinformationErrors}</strong> error(s) that matched a detail suggested by the later post. Your confidence after feedback was <strong>${postConfidence}/100 (${confidenceLabel})</strong>.</p>`;
    if (misinformation === "misleading") {
      interpretation += `<p>You were assigned to the <strong>misleading-information condition</strong>. The post contained at least one detail that conflicted with the video. ${misinformationErrors > 0 ? "At least one of your incorrect responses matched a suggested detail, which is consistent with a possible misinformation/source-monitoring error." : "You did not select an incorrect answer that matched the misleading detail. That can happen; exposure to misinformation does not affect every person or every detail."}</p>`;
    } else {
      interpretation += `<p>You were assigned to the <strong>accurate-information condition</strong>. The post did not intentionally introduce the incorrect event details used in the misleading condition. Your result provides a comparison point for understanding how later information may influence memory.</p>`;
    }
    interpretation += feedbackCondition === "confirming"
      ? `<p>You received <strong>strongly confirming feedback</strong>. The feedback was assigned randomly and was not based on whether your answers were correct. Your confidence rating is useful for examining whether affirming feedback can influence confidence separately from accuracy.</p>`
      : `<p>You received <strong>neutral feedback</strong>. This condition provides a comparison for examining whether strongly affirming feedback changes confidence beyond the effect of simply completing the questions.</p>`;
    $("individualInterpretation").innerHTML = interpretation;
    const deviationParts = [];
    if (correctCount === 4) deviationParts.push("Your perfect score may reflect careful attention and strong encoding of the event details. It does not mean misleading information can never affect memory.");
    else if (correctCount === 0) deviationParts.push("A lower score can reflect missed details during viewing, difficulty distinguishing similar vehicles, or uncertainty when retrieving the event. It does not mean your memory is generally poor.");
    else deviationParts.push("Your mix of correct and incorrect answers is normal for a brief memory task. Different details may have been encoded with different levels of clarity.");
    if (misinformationErrors > 0) deviationParts.push("The misinformation-consistent response(s) may reflect source confusion: a detail encountered in the later post may have been attributed to the original video.");
    else if (misinformation === "misleading") deviationParts.push("Although you saw misleading information, none of your incorrect answers matched it. People vary in susceptibility, and the effect is probabilistic rather than inevitable.");
    if (feedbackCondition === "confirming" && !answers.every(a => a.correct) && postConfidence >= 70) deviationParts.push("Your confidence was relatively high despite at least one error. This illustrates why confidence should not be treated as a perfect measure of eyewitness accuracy; confirming feedback can influence confidence.");
    else if (feedbackCondition === "neutral" && postConfidence >= 70) deviationParts.push("Your high confidence may have come from your own sense of familiarity or recollection; confidence can be high even when some details are mistaken.");
    else if (postConfidence <= 30) deviationParts.push("Your lower confidence may reflect uncertainty or awareness that some details were difficult to remember. Confidence is subjective and is not identical to accuracy.");
    $("deviationExplanation").innerHTML = deviationParts.map(part => `<p>${part}</p>`).join("");
    show("resultsScreen");
    saveAndContinue();
  });

  $("retryUploads").addEventListener("click", saveAndContinue);
  $("continueBtn").addEventListener("click", () => {
    if (!uploadComplete) return;
    redirectToNextProject();
  });
  $("downloadSummary").addEventListener("click", () => {
    if (summaryData) downloadCSV(`summary_${sid}.csv`, [summaryData]);
  });
  $("downloadTrials").addEventListener("click", () => {
    if (trials.length) downloadCSV(`trials_${sid}.csv`, trials);
  });

  // Local CSV backups are available during an explicitly marked test run.
  const isTestRun = new URLSearchParams(window.location.search).get("test") === "1";
  if (isTestRun) {
    const testNotice = document.createElement("p");
    testNotice.className = "small";
    testNotice.textContent = "TEST MODE: local CSV backup controls will be shown after submission.";
    $("welcome").append(testNotice);
  }
  window.addEventListener("beforeunload", (event) => {
    if (uploadInProgress && !uploadComplete) {
      event.preventDefault();
      event.returnValue = "Your responses are still being saved. Leave this page?";
    }
  });
  if (isTestRun) {
    const originalShowBackupDownloads = showBackupDownloads;
    // Test mode controls are revealed once the result screen is displayed.
    const observer = new MutationObserver(() => {
      if (!$("resultsScreen").classList.contains("hidden")) originalShowBackupDownloads();
    });
    observer.observe($("resultsScreen"), { attributes: true, attributeFilter: ["class"] });
  }
})();
