const facts = {
  assetCost: 100,
  annualRevenue: 80,
  otherCosts: 35,
};

const scenario = {
  title: "Short-term earnings focus",
  description:
    "The board has made it clear they are concerned with short term performance. If you don't maximize Net Income for the next 1-2 years, you could be fired.",
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
      "Start with a 3-year useful life. You can test 1 to 7 years; a longer useful life spreads the cost over more years and usually raises net income now.",
  },
  {
    key: "residual",
    step: "Decision 3 of 3",
    title: "What will the equipment be worth at the end?",
    text:
      "A $0M residual value is the simplest starting estimate. A higher residual value means less of the equipment cost gets depreciated.",
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
    title: "CFO chat",
    text: "We can chat here if you need help.",
    button: "Got it",
  },
};

let state = {
  started: false,
  activeStep: 0,
  approved: false,
  tutorialStep: "background",
  method: null,
  usefulLife: 3,
  residualValue: 0,
};

const els = {
  landingScreen: document.querySelector("#landingScreen"),
  simulationScreen: document.querySelector("#simulationScreen"),
  startSimulationButton: document.querySelector("#startSimulationButton"),
  scenarioTitle: document.querySelector("#scenarioTitle"),
  scenarioDescription: document.querySelector("#scenarioDescription"),
  decisionHeading: document.querySelector("#decisionHeading"),
  cfoCard: document.querySelector("#cfoCard"),
  cfoTitle: document.querySelector("#cfoTitle"),
  cfoText: document.querySelector("#cfoText"),
  startTip: document.querySelector("#startTip"),
  tutorialTitle: document.querySelector("#tutorialTitle"),
  tutorialText: document.querySelector("#tutorialText"),
  tutorialBackdrop: document.querySelector("#tutorialBackdrop"),
  dismissTipButton: document.querySelector("#dismissTipButton"),
  introPanel: document.querySelector(".intro"),
  backgroundInfo: document.querySelector(".intro-case"),
  decisionPanel: document.querySelector(".decision-panel"),
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

function renderIncomeChart(schedule) {
  const maxIncome = Math.max(...schedule.map((row) => Math.abs(row.netIncome)), 1);
  els.incomeChart.style.setProperty("--year-count", schedule.length);

  els.incomeChart.innerHTML = schedule
    .map((row) => {
      const height = Math.max(4, (Math.abs(row.netIncome) / maxIncome) * 148);
      const barClass = row.netIncome < 0 ? "income-bar is-negative" : "income-bar";

      return `
        <div class="chart-column">
          <div class="chart-value">${money(row.netIncome)}</div>
          <div class="column-track">
            <div class="vertical-bar ${barClass}" style="height: ${height}px"></div>
          </div>
          <div class="year-label">Year ${row.year}</div>
        </div>
      `;
    })
    .join("");
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

function renderFinal(metrics) {
  if (!state.approved || !metrics) {
    els.finalPanel.classList.add("is-hidden");
    return;
  }

  const benchmark = getBenchmark();
  els.finalPanel.classList.remove("is-hidden");

  const gap = benchmark.bestShortTerm - metrics.shortTermIncome;
  els.finalTitle.textContent = "Short-term result";
  els.finalText.textContent =
    gap < 0.5
      ? `You maximized Years 1 and 2 net income in this model at ${money(
          metrics.shortTermIncome
        )}. The tradeoff is that less expense is recognized early.`
      : `Your Years 1 and 2 net income is ${money(
          metrics.shortTermIncome
        )}. The highest possible short-term result in this model is ${money(
          benchmark.bestShortTerm
        )}, so this policy leaves ${money(gap)} of short-term earnings on the table.`;
}

function methodLabel(method) {
  return method === "straight" ? "straight-line" : "accelerated";
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

  if (state.usefulLife >= 6) {
    notes.push(
      `A ${state.usefulLife}-year useful life may look aggressive for this equipment. It helps near-term income, but we would need strong support for that estimate because it could create problems later.`
    );
  }

  if (state.residualValue > 10) {
    notes.push(
      `A residual value above ${money(10)} also reduces depreciation expense. That assumption should be documented carefully because it raises net income now.`
    );
  }

  if (state.usefulLife < 6 && state.residualValue <= 10) {
    notes.push(
      "I do not see an obviously aggressive useful life or residual value, but we should still be ready to explain the estimates."
    );
  }

  return notes.join(" ");
}

function render() {
  const prompt = cfoPrompts[state.activeStep];
  const hasMethod = Boolean(state.method);
  const schedule = hasMethod ? calculateSchedule() : [];
  const metrics = hasMethod ? getMetrics(schedule) : null;
  const reviewMode = prompt.key === "review";
  const controlOrder = ["method", "life", "residual"];
  const unlockedControls = reviewMode
    ? controlOrder
    : controlOrder.slice(0, Math.min(state.activeStep + 1, controlOrder.length));

  els.landingScreen.classList.toggle("is-hidden", state.started);
  els.simulationScreen.classList.toggle("is-hidden", !state.started);

  els.scenarioTitle.textContent = scenario.title;
  els.scenarioDescription.textContent = scenario.description;

  els.decisionHeading.textContent = state.approved ? "Decision approved" : prompt.step;
  els.cfoTitle.textContent = state.approved
    ? "Here is the policy we approved."
    : reviewMode
      ? "Here is what I am sending for review."
      : prompt.title;
  els.cfoText.textContent = state.approved || reviewMode ? getCfoReviewMessage() : prompt.text;
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
    const enabled = !state.approved && unlockedControls.includes(control.dataset.control);
    const active = !state.approved && control.dataset.control === prompt.key;

    control.classList.toggle("is-active", active);
    control.classList.toggle("is-inactive", !enabled);
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
  els.nextButton.disabled = state.approved || (prompt.key === "method" && !hasMethod);

  els.previewPanel.classList.toggle("is-hidden", !hasMethod);

  if (hasMethod) {
    renderIncomeChart(schedule);
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
  state.tutorialStep = "background";
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

els.resetButton.addEventListener("click", () => {
  state = {
    started: true,
    activeStep: 0,
    approved: false,
    tutorialStep: "background",
    method: null,
    usefulLife: 3,
    residualValue: 0,
  };
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
