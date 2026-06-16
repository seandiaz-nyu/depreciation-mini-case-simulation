const facts = {
  assetCost: 100,
  annualRevenue: 80,
  otherCosts: 35,
};

const performanceTargets = {
  dangerShortTermIncome: 50,
  bonusShortTermIncome: 60,
};

const scenario = {
  title: "Short-term earnings focus",
  description:
    "The board is paying close attention to the next 1-2 years of performance after this equipment purchase.",
};

const cfoPrompts = [
  {
    key: "method",
    step: "Decision 1 of 3",
    title: "Which depreciation method should we use?",
    text:
      "Straight-line makes depreciation expense even. Accelerated depreciation records more expense earlier and less later.",
  },
  {
    key: "life",
    step: "Decision 2 of 3",
    title: "How long will the equipment be useful?",
    text:
      "Start with a 3-year useful life. You can test 1 to 7 years; a longer useful life spreads the cost over more years and usually raises net income now. Just remember that anything beyond 5 years may need extra support.",
  },
  {
    key: "residual",
    step: "Decision 3 of 3",
    title: "What will the equipment be worth at the end?",
    text:
      "A $0M residual value is the simplest starting estimate. A higher residual value means less of the equipment cost gets depreciated, but the estimate has to be believable when we eventually dispose of the asset.",
  },
  {
    key: "review",
    step: "Review",
    title: "Review the full depreciation policy.",
    text:
      "You have considered each assumption one at a time. Now you can adjust all three before approving the final policy.",
  },
];

const tutorialSteps = {
  background: {
    title: "Background information",
    text:
      "We just purchased equipment. Review our numbers before jumping into the depreciation decisions.",
    button: "Next",
  },
  decision: {
    title: "Decision area",
    text: "This is where we will make each depreciation decision before approving the policy.",
    button: "Next",
  },
  cfo: {
    title: "WorkChat",
    text: "Jordan Lee, our CFO, will send context and ask for each decision here.",
    button: "Got it",
  },
};

let state = {
  started: true,
  activeStep: 0,
  approved: false,
  tutorialStep: null,
  dashboardOpen: false,
  chatStage: "opening",
  tourSkipped: false,
  method: null,
  usefulLife: 3,
  residualValue: 0,
};

let previousChatMessageCount = 0;

const els = {
  landingScreen: document.querySelector("#landingScreen"),
  simulationScreen: document.querySelector("#simulationScreen"),
  startSimulationButton: document.querySelector("#startSimulationButton"),
  scenarioTitle: document.querySelector("#scenarioTitle"),
  scenarioDescription: document.querySelector("#scenarioDescription"),
  decisionHeading: document.querySelector("#decisionHeading"),
  cfoCard: document.querySelector("#cfoCard"),
  chatThread: document.querySelector("#chatThread"),
  startTip: document.querySelector("#startTip"),
  tutorialTitle: document.querySelector("#tutorialTitle"),
  tutorialText: document.querySelector("#tutorialText"),
  tutorialBackdrop: document.querySelector("#tutorialBackdrop"),
  dismissTipButton: document.querySelector("#dismissTipButton"),
  introPanel: document.querySelector(".intro"),
  backgroundInfo: document.querySelector(".intro-case"),
  decisionPanel: document.querySelector(".decision-panel"),
  controlsGrid: document.querySelector(".controls-grid"),
  methodCard: document.querySelector('[data-control="method"]'),
  nextButton: document.querySelector("#nextButton"),
  resetButton: document.querySelector("#resetButton"),
  methodButtons: [...document.querySelectorAll("[data-method]")],
  controls: [...document.querySelectorAll(".control-card")],
  lifeInput: document.querySelector("#lifeInput"),
  lifeOutput: document.querySelector("#lifeOutput"),
  residualInput: document.querySelector("#residualInput"),
  residualOutput: document.querySelector("#residualOutput"),
  previewPanel: document.querySelector(".preview-panel"),
  incomeTargetPanel: document.querySelector("#incomeTargetPanel"),
  incomeTargetStatus: document.querySelector("#incomeTargetStatus"),
  incomeChartTitle: document.querySelector("#incomeChartTitle"),
  incomeChart: document.querySelector("#incomeChart"),
  assetTableBody: document.querySelector("#assetTableBody"),
  finalPanel: document.querySelector("#finalPanel"),
  finalTitle: document.querySelector("#finalTitle"),
  finalText: document.querySelector("#finalText"),
};

function money(value) {
  const rounded = Math.round(value);
  return rounded < 0 ? `-$${Math.abs(rounded)}M` : `$${rounded}M`;
}

function getTutorialTarget() {
  if (state.tutorialStep === "background") {
    return els.backgroundInfo;
  }

  if (state.tutorialStep === "decision") {
    return els.decisionPanel;
  }

  return els.cfoCard;
}

function updateTutorialFocus(showTutorial) {
  els.introPanel.classList.toggle(
    "is-tutorial-focus",
    showTutorial && state.tutorialStep === "background"
  );
  els.decisionPanel.classList.toggle("is-tutorial-focus", showTutorial && state.tutorialStep === "decision");
  els.cfoCard.classList.toggle("is-tutorial-focus", showTutorial && state.tutorialStep === "cfo");
}

function positionStartTip() {
  const target = getTutorialTarget();
  const cardRect = target.getBoundingClientRect();
  const margin = 16;
  const gap = 12;
  const tipWidth = els.startTip.offsetWidth || 320;
  const tipHeight = els.startTip.offsetHeight || 120;
  let top = cardRect.top + 8;
  let left = cardRect.right + gap;
  let below = false;

  if (state.tutorialStep === "decision") {
    top = cardRect.top + 48;
    left = Math.min(
      window.innerWidth - tipWidth - margin,
      Math.max(margin, cardRect.left + 24)
    );
  } else if (left + tipWidth > window.innerWidth - margin) {
    below = true;
    left = Math.min(window.innerWidth - tipWidth - margin, Math.max(margin, cardRect.left));
    top = cardRect.bottom + gap;
  }

  if (top + tipHeight > window.innerHeight - margin) {
    top = Math.max(margin, window.innerHeight - tipHeight - margin);
  }

  els.startTip.style.left = `${left}px`;
  els.startTip.style.top = `${top}px`;
  els.startTip.classList.toggle("is-below", below);
  els.startTip.classList.toggle("is-floating", state.tutorialStep === "decision");
}

function sum(values) {
  return values.reduce((total, value) => total + value, 0);
}

function depreciationForYear(policy, year) {
  const depreciableCost = facts.assetCost - policy.residualValue;

  if (year > policy.usefulLife) {
    return 0;
  }

  if (policy.method === "straight") {
    return depreciableCost / policy.usefulLife;
  }

  const yearsSum = (policy.usefulLife * (policy.usefulLife + 1)) / 2;
  const remainingYears = policy.usefulLife - year + 1;
  return depreciableCost * (remainingYears / yearsSum);
}

function getIncomeHorizon(policy = state) {
  return Math.max(5, policy.usefulLife);
}

function calculateSchedule(policy = state, years = getIncomeHorizon(policy)) {
  const schedule = [];
  let bookValue = facts.assetCost;

  for (let year = 1; year <= years; year += 1) {
    const depreciation = Math.min(
      depreciationForYear(policy, year),
      Math.max(0, bookValue - policy.residualValue)
    );
    bookValue = Math.max(policy.residualValue, bookValue - depreciation);

    schedule.push({
      year,
      depreciation,
      bookValue,
      revenue: facts.annualRevenue,
      netIncome: facts.annualRevenue - facts.otherCosts - depreciation,
    });
  }

  return schedule;
}

function getMetrics(schedule) {
  const netIncomes = schedule.map((row) => row.netIncome);

  return {
    yearOneIncome: schedule[0].netIncome,
    shortTermIncome: schedule[0].netIncome + schedule[1].netIncome,
    fiveYearIncome: sum(netIncomes),
    incomeRange: Math.max(...netIncomes) - Math.min(...netIncomes),
  };
}

function getPerformanceStatus(metrics) {
  if (!metrics) {
    return {
      key: "pending",
      label: "Choose a method to test performance.",
    };
  }

  if (metrics.shortTermIncome < performanceTargets.dangerShortTermIncome) {
    return {
      key: "danger",
      label: `${money(metrics.shortTermIncome)} in Years 1-2: CEO is in danger.`,
    };
  }

  if (metrics.shortTermIncome >= performanceTargets.bonusShortTermIncome) {
    return {
      key: "bonus",
      label: `${money(metrics.shortTermIncome)} in Years 1-2: bonus likely.`,
    };
  }

  return {
    key: "safe",
    label: `${money(metrics.shortTermIncome)} in Years 1-2: target cleared.`,
  };
}

function allPossiblePolicies() {
  const policies = [];

  ["straight", "accelerated"].forEach((method) => {
    for (let usefulLife = 1; usefulLife <= 7; usefulLife += 1) {
      for (let residualValue = 0; residualValue <= 30; residualValue += 5) {
        policies.push({ method, usefulLife, residualValue });
      }
    }
  });

  return policies;
}

function getBenchmark() {
  const policyMetrics = allPossiblePolicies().map((policy) => {
    const schedule = calculateSchedule(policy);
    const metrics = getMetrics(schedule);
    return { policy, metrics };
  });

  const bestShortTerm = Math.max(...policyMetrics.map((item) => item.metrics.shortTermIncome));

  return { bestShortTerm };
}

function renderIncomeChart(schedule, metrics) {
  const maxIncome = Math.max(...schedule.map((row) => Math.abs(row.netIncome)), 1);
  const performanceStatus = getPerformanceStatus(metrics);
  els.incomeChart.style.setProperty("--year-count", schedule.length);

  els.incomeChart.innerHTML = schedule
    .map((row) => {
      const height = Math.max(4, (Math.abs(row.netIncome) / maxIncome) * 148);
      const barClasses = ["income-bar"];
      const columnClasses = ["chart-column"];

      if (row.netIncome < 0) {
        barClasses.push("is-negative");
      }

      if (row.year <= 2) {
        columnClasses.push("is-target-window", `is-${performanceStatus.key}`);
        barClasses.push(`is-${performanceStatus.key}`);
      }

      return `
        <div class="${columnClasses.join(" ")}">
          <div class="chart-value">${money(row.netIncome)}</div>
          <div class="column-track">
            <div class="vertical-bar ${barClasses.join(" ")}" style="height: ${height}px"></div>
          </div>
          <div class="year-label">Year ${row.year}${row.year <= 2 ? "<span>target</span>" : ""}</div>
        </div>
      `;
    })
    .join("");
}

function renderIncomeTarget(metrics) {
  const performanceStatus = getPerformanceStatus(metrics);
  els.incomeTargetPanel.dataset.status = performanceStatus.key;
  els.incomeTargetStatus.textContent = performanceStatus.label;
}

function renderAssetTable(schedule) {
  els.assetTableBody.innerHTML = schedule
    .filter((row) => row.year <= state.usefulLife)
    .map((row) => {
      return `
        <tr>
          <td>Year ${row.year}</td>
          <td>${money(row.depreciation)}</td>
          <td>${money(row.bookValue)}</td>
        </tr>
      `;
    })
    .join("");
}

function methodLabel(method) {
  return method === "straight" ? "straight-line" : "accelerated";
}

function getUsefulLifeWarning(usefulLife = state.usefulLife) {
  if (usefulLife === 6) {
    return {
      severity: "warning",
      title: "I would flag this for documentation.",
      text:
        "A 6-year useful life may invite scrutiny. Equipment of this type does not typically last longer than 5 years, so we should be prepared to support why this asset is different.",
    };
  }

  if (usefulLife >= 7) {
    return {
      severity: "urgent",
      title: "I am not comfortable with this assumption.",
      text:
        "A 7-year useful life is far outside the norm. If the equipment does not actually last that long, we may have to recognize new expenses sooner than expected and answer uncomfortable questions about the original estimate.",
    };
  }

  return null;
}

function getAcceptableResidualValue(usefulLife = state.usefulLife) {
  return usefulLife < 5 ? 20 : 10;
}

function getResidualWarning(
  usefulLife = state.usefulLife,
  residualValue = state.residualValue
) {
  const acceptableResidualValue = getAcceptableResidualValue(usefulLife);

  if (residualValue <= acceptableResidualValue) {
    return null;
  }

  if (usefulLife >= 6) {
    return {
      severity: residualValue >= 25 || usefulLife >= 7 ? "urgent" : "warning",
      title:
        residualValue >= 25 || usefulLife >= 7
          ? "This residual value is hard to defend."
          : "This residual value needs support.",
      text:
        `${money(residualValue)} residual value is aggressive with a ${usefulLife}-year useful life. Once we are already assuming a long life, assuming more than ${money(10)} of value at disposal raises the risk of a future write-down if we cannot sell the equipment for that price.`,
    };
  }

  return {
    severity: residualValue >= 25 ? "urgent" : "warning",
    title:
      residualValue >= 25
        ? "This residual value may be too optimistic."
        : "I would document this residual value carefully.",
    text:
      `${money(residualValue)} residual value is above the normal supportable range for a ${usefulLife}-year useful life. If we cannot sell the equipment for that amount at the end of its use for us, we could face a write-down later.`,
  };
}

function getPolicyWarnings(policy = state) {
  return [
    getUsefulLifeWarning(policy.usefulLife),
    getResidualWarning(policy.usefulLife, policy.residualValue),
  ].filter(Boolean);
}

function getAccountingTrouble(policy = state) {
  const usefulLifeWarning = getUsefulLifeWarning(policy.usefulLife);
  const residualWarning = getResidualWarning(policy.usefulLife, policy.residualValue);
  const warningCategories = [usefulLifeWarning, residualWarning].filter(Boolean);
  const hasUrgentWarning = warningCategories.some((warning) => warning.severity === "urgent");

  if (!hasUrgentWarning && warningCategories.length < 2) {
    return null;
  }

  if (hasUrgentWarning) {
    return {
      key: "audit",
      title: "Audit failure",
      text:
        "The short-term numbers looked better, but the assumptions were too aggressive to defend. The auditors force a correction, the audit committee opens an investigation, and the board questions whether management used depreciation estimates to dress up earnings.",
    };
  }

  return {
    key: "press",
    title: "Accounting controversy",
    text:
      "You avoided the immediate performance problem, but both the useful life and residual value assumptions raise red flags. A business press article questions the company's depreciation practices, investors notice, and the board has to respond publicly.",
  };
}

function getEmploymentOutcome(metrics) {
  if (metrics.shortTermIncome < performanceTargets.dangerShortTermIncome) {
    return {
      key: "fired",
      title: "You got fired",
      text:
        `${money(metrics.shortTermIncome)} in Years 1-2 net income missed the board's minimum target. The board decides the performance gap is too large and replaces the CEO.`,
    };
  }

  if (metrics.shortTermIncome >= performanceTargets.bonusShortTermIncome) {
    return {
      key: "bonus",
      title: "You kept your job and earned the bonus",
      text:
        `${money(metrics.shortTermIncome)} in Years 1-2 net income cleared the bonus threshold. The board is pleased with the near-term performance and approves the bonus.`,
    };
  }

  return {
    key: "safe",
    title: "You kept your job, but no bonus",
    text:
      `${money(metrics.shortTermIncome)} in Years 1-2 net income kept you above the danger line, but it did not reach the bonus threshold. The board keeps you in the role but holds back the payout.`,
  };
}

function renderFinal(metrics) {
  if (!state.approved || !metrics) {
    els.finalPanel.classList.add("is-hidden");
    els.finalPanel.dataset.outcome = "";
    return;
  }

  const accountingTrouble = getAccountingTrouble();
  const outcome = accountingTrouble || getEmploymentOutcome(metrics);

  els.finalPanel.classList.remove("is-hidden");
  els.finalPanel.dataset.outcome = outcome.key;
  els.finalTitle.textContent = outcome.title;
  els.finalText.textContent = outcome.text;
}

function getCfoReviewMessage() {
  const methodName = methodLabel(state.method);
  const notes = [];

  notes.push(
    `You chose ${methodName} depreciation, a ${state.usefulLife}-year useful life, and a ${money(
      state.residualValue
    )} residual value.`
  );

  if (state.method === "accelerated") {
    notes.push(
      "Accelerated depreciation moves more expense into the early years, which usually lowers near-term net income and raises it later."
    );
  } else {
    notes.push(
      "Straight-line depreciation spreads the expense evenly, so the income effect is steadier year to year."
    );
  }

  if (getPolicyWarnings().length === 0) {
    notes.push(
      "I do not see an obviously aggressive useful life or residual value. We should still be ready to explain the estimates, but these assumptions are easier to support."
    );
  } else {
    notes.push("Before you approve, I want to call out the assumptions most likely to draw questions.");
  }

  return notes.join(" ");
}

function createChatMessage(
  { title, text, actionLabel, action, actions, warnings = [] },
  isNew = false
) {
  const message = document.createElement("div");
  message.className = "cfo-message";
  message.classList.toggle("is-new", isNew);

  message.innerHTML = `
    <div class="cfo-avatar" aria-hidden="true" title="Jordan Lee, CFO">
      <span class="avatar-hair"></span>
      <span class="avatar-head"></span>
      <i class="avatar-body"></i>
    </div>
    <div class="cfo-copy">
      <div class="chat-bubble">
        <h2></h2>
        <p></p>
      </div>
    </div>
  `;

  message.querySelector("h2").textContent = title;
  message.querySelector("p").textContent = text;

  if (warnings.length > 0) {
    const warningList = document.createElement("div");
    warningList.className = "chat-warning-list";

    warnings.forEach((warning) => {
      const warningItem = document.createElement("section");
      warningItem.className = `chat-warning is-${warning.severity}`;

      const warningTitle = document.createElement("strong");
      warningTitle.textContent =
        warning.severity === "urgent"
          ? `Stronger warning: ${warning.title}`
          : `Warning: ${warning.title}`;

      const warningText = document.createElement("p");
      warningText.textContent = warning.text;

      warningItem.append(warningTitle, warningText);
      warningList.append(warningItem);
    });

    message.querySelector(".chat-bubble").append(warningList);
  }

  const messageActions = actions || (actionLabel && action ? [{ label: actionLabel, action }] : []);

  if (messageActions.length > 0) {
    const actionsRow = document.createElement("div");
    actionsRow.className = "chat-actions";

    messageActions.forEach((messageAction, index) => {
      const button = document.createElement("button");
      button.className = `${index === 0 ? "primary-button" : "secondary-button"} dashboard-action`;
      button.type = "button";
      button.dataset.chatAction = messageAction.action;
      button.textContent = messageAction.label;
      actionsRow.append(button);
    });

    message.querySelector(".chat-bubble").append(actionsRow);
  }

  return message;
}

function getChatMessages(prompt, reviewMode) {
  const messages = [
    {
      title: "I need your attention on this equipment purchase.",
      text:
        "I built a dashboard so we can make a few depreciation decisions together for the new equipment purchase. The board is especially focused on the next 1-2 years of performance. When you're ready, open the dashboard.",
      actions: state.dashboardOpen
        ? []
        : [
            { label: "Open dashboard", action: "open-dashboard" },
          ],
    },
  ];

  if (state.dashboardOpen && !state.tourSkipped) {
    messages.push({
      title: "First, here is the background.",
      text:
        "The new equipment cost $100M. We expect $80M in annual revenue and $35M in other operating costs before depreciation. These are the numbers the dashboard will use.",
      actions:
        state.chatStage === "background"
          ? [
              { label: "Next: decision area", action: "show-decision-area" },
              { label: "Skip tour", action: "skip-tour" },
            ]
          : [],
    });
  }

  if (
    !state.tourSkipped &&
    (["decision", "active"].includes(state.chatStage) || state.activeStep > 0 || state.approved)
  ) {
    messages.push({
      title: "Now look at the decision area.",
      text:
        "This is where we will choose the depreciation method, useful life, and residual value. Each choice changes the income picture the board will see.",
      actionLabel: state.chatStage === "decision" ? "Start decisions" : null,
      action: "start-decisions",
    });
  }

  if (state.chatStage === "active" || state.activeStep > 0 || state.approved) {
    const promptLimit = state.approved ? cfoPrompts.length - 1 : state.activeStep;

    for (let index = 0; index <= promptLimit; index += 1) {
      const chatPrompt = cfoPrompts[index];
      const isReviewPrompt = chatPrompt.key === "review";

      messages.push({
        title: state.approved && isReviewPrompt
          ? "Here is the policy we approved."
          : isReviewPrompt
            ? "Here is what I am sending for review."
            : chatPrompt.title,
        text: isReviewPrompt ? getCfoReviewMessage() : chatPrompt.text,
        warnings: isReviewPrompt ? getPolicyWarnings() : [],
      });
    }
  }

  return messages;
}

function renderChatMessages(prompt, reviewMode) {
  const messages = getChatMessages(prompt, reviewMode);
  const previousCount = messages.length < previousChatMessageCount ? 0 : previousChatMessageCount;

  els.chatThread.innerHTML = "";
  messages.forEach((message, index) => {
    els.chatThread.append(createChatMessage(message, index >= previousCount));
  });
  previousChatMessageCount = messages.length;

  requestAnimationFrame(() => {
    els.cfoCard.scrollTo({
      top: els.cfoCard.scrollHeight,
      behavior: messages.length > previousCount ? "smooth" : "auto",
    });
  });
}

function render() {
  const prompt = cfoPrompts[state.activeStep];
  const hasMethod = Boolean(state.method);
  const schedule = hasMethod ? calculateSchedule() : [];
  const metrics = hasMethod ? getMetrics(schedule) : null;
  const reviewMode = prompt.key === "review";
  const controlOrder = ["method", "life", "residual"];
  const unlockedControls = reviewMode || state.tourSkipped
    ? controlOrder
    : controlOrder.slice(0, Math.min(state.activeStep + 1, controlOrder.length));

  els.landingScreen.classList.toggle("is-hidden", state.started);
  els.simulationScreen.classList.toggle("is-hidden", !state.started);
  els.simulationScreen.classList.toggle("is-opening", !state.dashboardOpen);
  els.simulationScreen.classList.toggle(
    "is-dashboard-focus",
    state.dashboardOpen && ["background", "decision"].includes(state.chatStage)
  );
  els.simulationScreen.classList.toggle("is-background-focus", state.chatStage === "background");
  els.simulationScreen.classList.toggle("is-decision-focus", state.chatStage === "decision");
  els.backgroundInfo.classList.toggle(
    "is-spotlight",
    state.dashboardOpen && state.chatStage === "background"
  );
  els.controlsGrid.classList.toggle("is-spotlight", state.chatStage === "decision");
  els.decisionPanel.classList.toggle("is-ended", state.approved);

  els.scenarioTitle.textContent = scenario.title;
  els.scenarioDescription.textContent = scenario.description;

  els.decisionHeading.textContent = state.approved ? "Decision approved" : prompt.step;
  renderChatMessages(prompt, reviewMode);
  const tutorial = state.tutorialStep ? tutorialSteps[state.tutorialStep] : null;
  const showTutorial = state.started && tutorial && state.activeStep === 0 && !state.approved;
  els.startTip.classList.toggle("is-hidden", !showTutorial);
  els.tutorialBackdrop.classList.toggle("is-hidden", !showTutorial);
  updateTutorialFocus(showTutorial);
  if (showTutorial) {
    els.tutorialTitle.textContent = tutorial.title;
    els.tutorialText.textContent = tutorial.text;
    els.dismissTipButton.textContent = tutorial.button;
    positionStartTip();
  }

  els.controls.forEach((control) => {
    const enabled =
      state.chatStage === "active" &&
      !state.approved &&
      unlockedControls.includes(control.dataset.control);
    const visible = state.chatStage === "decision" || enabled;
    const active =
      enabled &&
      (state.tourSkipped ? control.dataset.control === "method" : control.dataset.control === prompt.key);

    control.classList.toggle("is-active", active);
    control.classList.toggle("is-inactive", !visible);
    control.querySelectorAll("input, button").forEach((input) => {
      input.disabled = !enabled;
    });
  });

  els.methodButtons.forEach((button) => {
    const selected = button.dataset.method === state.method;
    button.classList.toggle("is-selected", selected);
    button.setAttribute("aria-pressed", String(selected));
  });

  els.lifeInput.value = state.usefulLife;
  els.lifeOutput.textContent = `${state.usefulLife} years`;
  els.incomeChartTitle.textContent = `Net income over ${getIncomeHorizon()} years`;
  els.residualInput.value = state.residualValue;
  els.residualOutput.textContent = money(state.residualValue);

  els.nextButton.textContent =
    state.activeStep === cfoPrompts.length - 1
      ? "Approve policy"
      : state.activeStep === cfoPrompts.length - 2
        ? "Review choices"
        : "Next decision";
  els.nextButton.disabled =
    state.chatStage !== "active" || state.approved || (prompt.key === "method" && !hasMethod);

  els.previewPanel.classList.toggle("is-hidden", !state.dashboardOpen);
  renderIncomeTarget(metrics);

  if (hasMethod) {
    renderIncomeChart(schedule, metrics);
    renderAssetTable(schedule);
  } else {
    els.incomeChart.innerHTML = "";
    els.assetTableBody.innerHTML = "";
  }

  renderFinal(metrics);
}

els.methodButtons.forEach((button) => {
  button.addEventListener("click", () => {
    state.method = button.dataset.method;
    render();
  });
});

els.lifeInput.addEventListener("input", (event) => {
  state.usefulLife = Number(event.target.value);
  render();
});

els.residualInput.addEventListener("input", (event) => {
  state.residualValue = Number(event.target.value);
  render();
});

els.startSimulationButton.addEventListener("click", () => {
  state.started = true;
  state.tutorialStep = null;
  render();
});

els.chatThread.addEventListener("click", (event) => {
  const action = event.target.closest("[data-chat-action]")?.dataset.chatAction;

  if (!action) {
    return;
  }

  if (action === "open-dashboard") {
    state.dashboardOpen = true;
    state.chatStage = "background";
    state.tourSkipped = false;
  } else if (action === "skip-tour") {
    state.dashboardOpen = true;
    state.chatStage = "active";
    state.tourSkipped = true;
  } else if (action === "show-decision-area") {
    state.chatStage = "decision";
  } else if (action === "start-decisions") {
    state.chatStage = "active";
  }

  render();
});

els.nextButton.addEventListener("click", () => {
  state.tutorialStep = null;

  if (state.activeStep === cfoPrompts.length - 1) {
    state.approved = true;
  } else {
    state.activeStep += 1;
  }

  render();
});

els.dismissTipButton.addEventListener("click", () => {
  if (state.tutorialStep === "background") {
    state.tutorialStep = "decision";
  } else if (state.tutorialStep === "decision") {
    state.tutorialStep = "cfo";
  } else {
    state.tutorialStep = null;
  }

  render();
});

window.addEventListener("resize", () => {
  if (state.tutorialStep && state.activeStep === 0 && !state.approved) {
    positionStartTip();
  }
});

render();
