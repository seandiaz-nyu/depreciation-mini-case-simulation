# Depreciation Mini-Case Simulation

An interactive mini-case for graduate students in a beginning accounting course at NYU Stern. The simulation helps students see how depreciation choices affect reported business performance, especially when managers have incentives to improve short-term earnings.

## Background

Depreciation is not just a mechanical accounting calculation. It depends on management estimates and choices, including depreciation method, useful life, and residual value. Those choices can change the timing of depreciation expense, the book value of assets, and reported net income.

This prototype frames the issue as a CEO decision. The CFO asks the player to approve accounting assumptions for a new piece of equipment. The current scenario puts pressure on the CEO to maximize short-term net income because the board is focused on performance in the next one to two years.

## Learning Objectives

Students should be able to:

- Explain depreciation as the allocation of an asset's cost over time.
- Compare straight-line and accelerated depreciation methods.
- Describe how useful life and residual value estimates affect annual depreciation expense.
- Interpret how depreciation choices change book value and net income over a five-year period.
- Recognize how accounting estimates can create opportunities for earnings management.
- Discuss the tradeoff between short-term reported performance and longer-term business health.

## Current Prototype

The app is a static browser-based prototype with no build step or external dependencies. It can be opened directly in a browser from `index.html`.

Current interaction flow:

1. A landing screen introduces the CEO role, the board pressure, and the CFO approval process.
2. The CFO chat walks the player through one decision at a time.
3. The player first chooses a depreciation method, then useful life, then residual value.
4. After the three decisions are introduced, the player can review all assumptions together.
5. The CFO summarizes the selected policy and flags unusually aggressive assumptions, such as a long useful life or high residual value.
6. The results show how the approved policy affects net income, depreciation expense, and book value over the relevant time horizon.

## Project Files

- `index.html` contains the application markup.
- `styles.css` contains the visual design and layout.
- `app.js` contains the simulation logic and interaction state.

## Collaboration Notes

Areas for future design and faculty review:

- Add a second scenario focused on long-term company health.
- Add debrief prompts that ask students to explain which choices improved short-term net income and why.
- Clarify how aggressive assumptions may look favorable in early years but shift expense into later years.
- Consider whether to include renovation or reinvestment decisions, including capitalization versus expensing.
- Decide whether the final screen should compare the player's choices to a CFO baseline or to an optimal short-term strategy.

## Publishing

Because this is a static app, it can be published with GitHub Pages. A typical setup would be:

1. Create or choose a repository in the NYU GitHub organization or account.
2. Commit the source files from this folder.
3. Push to the repository.
4. Enable GitHub Pages for the repository branch that contains `index.html`.

No package installation or build command is required for the current prototype.
