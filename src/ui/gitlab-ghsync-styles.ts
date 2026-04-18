/** GitHub Sync UI styles (PAGE_STYLES + loading + progress), reused for GitLab Connector settings. */

const SHARED_PROGRESS_STYLES = `
.ghsync-progress {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--ghsync-info-border);
  background: var(--ghsync-info-bg);
}

.ghsync-progress--compact {
  gap: 8px;
  padding: 12px;
}

.ghsync-progress__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.ghsync-progress__copy strong {
  display: block;
  font-size: 13px;
  color: var(--ghsync-title);
}

.ghsync-progress__copy span {
  display: block;
  margin-top: 4px;
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync-progress__pill {
  display: inline-flex;
  align-items: center;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--ghsync-info-border);
  background: var(--ghsync-surfaceAlt);
  color: var(--ghsync-info-text);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.04em;
  text-transform: uppercase;
  white-space: nowrap;
}

.ghsync-progress__track {
  position: relative;
  overflow: hidden;
  height: 10px;
  border-radius: 999px;
  border: 1px solid var(--ghsync-border-soft);
  background: var(--ghsync-surfaceRaised);
}

.ghsync-progress__fill {
  height: 100%;
  min-width: 12px;
  border-radius: inherit;
  background: linear-gradient(90deg, var(--ghsync-info-border) 0%, var(--ghsync-info-text) 100%);
  transition: width 220ms ease;
}

.ghsync-progress__fill--indeterminate {
  width: 34%;
  animation: ghsync-progress-slide 1.4s ease-in-out infinite;
}

.ghsync-progress__meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.ghsync-progress__meta span {
  color: var(--ghsync-muted);
  font-size: 11px;
  line-height: 1.5;
}

@keyframes ghsync-progress-slide {
  0% {
    transform: translateX(-120%);
  }

  100% {
    transform: translateX(320%);
  }
}

@media (max-width: 640px) {
  .ghsync-progress__header,
  .ghsync-progress__meta {
    align-items: stretch;
    flex-direction: column;
  }

  .ghsync-diagnostics__layout--split {
    grid-template-columns: 1fr;
  }
}
`;

const SHARED_LOADING_STYLES = `
@keyframes ghsync-spin {
  to {
    transform: rotate(360deg);
  }
}

@keyframes ghsync-skeleton-shimmer {
  0% {
    background-position: 200% 0;
  }

  100% {
    background-position: -200% 0;
  }
}

.ghsync__spinner {
  display: inline-block;
  flex: 0 0 auto;
  border-radius: 999px;
  border: 1.75px solid currentColor;
  border-right-color: transparent;
  animation: ghsync-spin 0.8s linear infinite;
}

.ghsync__spinner--sm {
  width: 12px;
  height: 12px;
}

.ghsync__spinner--md {
  width: 16px;
  height: 16px;
  border-width: 2px;
}

.ghsync__spinner--lg {
  width: 20px;
  height: 20px;
  border-width: 2px;
}

.ghsync__button-content {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  min-width: 0;
}

.ghsync__loading-inline {
  display: inline-flex;
  align-items: center;
  gap: 8px;
  color: var(--ghsync-muted);
  font-size: 12px;
  font-weight: 600;
  line-height: 1.5;
}

.ghsync__loading-state {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 20px 18px;
  text-align: center;
  color: var(--ghsync-muted);
}

.ghsync__loading-state strong {
  color: var(--ghsync-title);
  font-size: 13px;
  line-height: 1.4;
}

.ghsync__loading-state--compact {
  display: inline-flex;
  align-items: center;
  justify-items: initial;
  gap: 8px;
  padding: 0;
  text-align: left;
}

.ghsync__loading-state--compact strong {
  font-size: 12px;
}

.ghsync__skeleton {
  display: block;
  border-radius: 999px;
  background:
    linear-gradient(
      90deg,
      color-mix(in srgb, var(--ghsync-surfaceRaised) 82%, var(--ghsync-border-soft)) 0%,
      color-mix(in srgb, var(--ghsync-surface) 92%, var(--ghsync-surfaceRaised)) 50%,
      color-mix(in srgb, var(--ghsync-surfaceRaised) 82%, var(--ghsync-border-soft)) 100%
    );
  background-size: 200% 100%;
  animation: ghsync-skeleton-shimmer 1.35s ease-in-out infinite;
}
`;

const PAGE_STYLES_MAIN = `
.ghsync {
  display: grid;
  gap: 16px;
  color: var(--ghsync-text);
  font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
}

.ghsync * {
  box-sizing: border-box;
}

.ghsync button,
.ghsync input {
  font-family: inherit;
}

.ghsync__header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 16px;
  flex-wrap: wrap;
}

.ghsync__header-copy {
  min-width: 0;
}

.ghsync__header-copy h2 {
  margin: 0;
  font-size: 20px;
  line-height: 1.2;
  font-weight: 700;
  color: var(--ghsync-title);
}

.ghsync__header-copy p {
  margin: 8px 0 0;
  max-width: 760px;
  color: var(--ghsync-muted);
  font-size: 13px;
  line-height: 1.55;
}

.ghsync__scope-overview {
  display: grid;
  gap: 12px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ghsync__scope-card {
  display: grid;
  gap: 12px;
  padding: 16px;
  border-radius: 12px;
  border: 1px solid var(--ghsync-border-soft);
  background: var(--ghsync-surfaceRaised);
}

.ghsync__scope-card--company {
  border-color: var(--ghsync-border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--ghsync-surfaceRaised) 82%, var(--ghsync-success-bg)), var(--ghsync-surfaceRaised));
}

.ghsync__scope-card--global {
  border-color: var(--ghsync-info-border);
  background:
    linear-gradient(180deg, color-mix(in srgb, var(--ghsync-surfaceRaised) 78%, var(--ghsync-info-bg)), var(--ghsync-surfaceRaised));
}

.ghsync__scope-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 10px;
  flex-wrap: wrap;
}

.ghsync__scope-kicker {
  display: block;
  color: var(--ghsync-muted);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.ghsync__scope-card .ghsync__scope-name {
  margin: 0;
  font-size: 22px;
  line-height: 1.15;
  font-weight: 700;
  color: var(--ghsync-title);
}

.ghsync__scope-card p {
  margin: 0;
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.55;
}

.ghsync__scope-points {
  display: grid;
  gap: 8px;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ghsync__scope-points li {
  display: flex;
  align-items: flex-start;
  gap: 8px;
  color: var(--ghsync-text);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync__scope-points li::before {
  content: "";
  width: 7px;
  height: 7px;
  margin-top: 5px;
  flex: 0 0 auto;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.65;
}

.ghsync__layout {
  display: grid;
  gap: 16px;
  align-items: start;
  grid-template-columns: minmax(0, 1.45fr) minmax(260px, 0.8fr);
}

.ghsync__card {
  overflow: hidden;
  border-radius: 12px;
  border: 1px solid var(--ghsync-border);
  background: var(--ghsync-surface);
  box-shadow: var(--ghsync-shadow);
}

.ghsync__card-header {
  padding: 16px 18px;
  border-bottom: 1px solid var(--ghsync-border-soft);
}

.ghsync__card-header h3 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--ghsync-title);
}

.ghsync__card-header p {
  margin: 6px 0 0;
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync__loading,
.ghsync__message {
  margin: 0 18px;
}

.ghsync__loading {
  margin-top: 16px;
  color: var(--ghsync-muted);
  font-size: 12px;
}

.ghsync__message {
  margin-top: 16px;
  padding: 10px 12px;
  border-radius: 10px;
  border: 1px solid var(--ghsync-border-soft);
  background: var(--ghsync-surfaceAlt);
  color: var(--ghsync-text);
  font-size: 13px;
  line-height: 1.5;
}

.ghsync__message--error {
  border-color: var(--ghsync-danger-border);
  background: var(--ghsync-danger-bg);
  color: var(--ghsync-danger-text);
}

.ghsync-diagnostics {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--ghsync-dangerBorder);
  background: var(--ghsync-dangerBg);
}

.ghsync-diagnostics__header {
  display: grid;
  gap: 4px;
}

.ghsync-diagnostics__header strong {
  font-size: 13px;
  color: var(--ghsync-dangerText);
}

.ghsync-diagnostics__header span {
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync-diagnostics__grid {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
}

.ghsync-diagnostics__layout {
  display: grid;
  gap: 10px;
}

.ghsync-diagnostics__layout--split {
  grid-template-columns: minmax(220px, 300px) minmax(0, 1fr);
  align-items: start;
}

.ghsync-diagnostics__detail,
.ghsync-diagnostics__failures {
  display: grid;
  gap: 10px;
}

.ghsync-diagnostics__failures {
  max-height: 420px;
  overflow: auto;
  margin: 0;
  padding: 0;
  list-style: none;
}

.ghsync-diagnostics__failure {
  display: grid;
  gap: 6px;
  width: 100%;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--ghsync-dangerBorder);
  background: var(--ghsync-surfaceAlt);
  text-align: left;
  transition: border-color 160ms ease, background 160ms ease, transform 160ms ease;
}

.ghsync-diagnostics__failure-item {
  list-style: none;
}

.ghsync-diagnostics__failure:hover {
  border-color: var(--ghsync-dangerText);
  transform: translateY(-1px);
}

.ghsync-diagnostics__failure--active {
  border-color: var(--ghsync-dangerText);
  background: color-mix(in srgb, var(--ghsync-dangerBg) 35%, var(--ghsync-surfaceAlt));
  box-shadow: 0 0 0 1px color-mix(in srgb, var(--ghsync-dangerText) 22%, transparent);
}

.ghsync-diagnostics__failure-title {
  color: var(--ghsync-title);
  font-size: 13px;
  line-height: 1.4;
}

.ghsync-diagnostics__failure-meta {
  color: var(--ghsync-muted);
  font-size: 11px;
  line-height: 1.4;
}

.ghsync-diagnostics__failure-preview {
  color: var(--ghsync-text);
  font-size: 12px;
  line-height: 1.5;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
  overflow: hidden;
}

.ghsync-diagnostics__item,
.ghsync-diagnostics__block {
  display: grid;
  gap: 6px;
  padding: 12px;
  border-radius: 10px;
  border: 1px solid var(--ghsync-dangerBorder);
  background: var(--ghsync-surfaceAlt);
}

.ghsync-diagnostics__label {
  color: var(--ghsync-dangerText);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: 0.06em;
  text-transform: uppercase;
}

.ghsync-diagnostics__value {
  color: var(--ghsync-title);
  font-size: 13px;
  line-height: 1.5;
  word-break: break-word;
}

.ghsync-diagnostics__value--code {
  font-family: ui-monospace, SFMono-Regular, Menlo, Monaco, Consolas, "Liberation Mono", monospace;
  font-size: 12px;
  white-space: pre-wrap;
}

.ghsync__section {
  display: grid;
  gap: 14px;
  padding: 18px;
  border-top: 1px solid var(--ghsync-border-soft);
}

.ghsync__section-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.ghsync__section-head-actions {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
  justify-content: flex-end;
}

.ghsync__section-copy {
  min-width: 0;
}

.ghsync__section-title-row {
  display: flex;
  align-items: center;
  gap: 10px;
  flex-wrap: wrap;
}

.ghsync__section-copy h4 {
  margin: 0;
  font-size: 14px;
  font-weight: 700;
  color: var(--ghsync-title);
}

.ghsync__section-tags {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ghsync__section-copy p {
  margin: 6px 0 0;
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync__summary-line {
  margin: 8px 0 0;
  color: var(--ghsync-title);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync__scope-pill {
  display: inline-flex;
  align-items: center;
  min-height: 22px;
  padding: 0 9px;
  border-radius: 999px;
  border: 1px solid var(--ghsync-border);
  background: transparent;
  color: var(--ghsync-title);
  font-size: 11px;
  font-weight: 700;
  line-height: 1;
  white-space: nowrap;
}

.ghsync__scope-pill--company {
  border-color: var(--ghsync-border);
  background: var(--ghsync-surface);
  color: var(--ghsync-title);
}

.ghsync__scope-pill--global {
  border-color: var(--ghsync-info-border);
  background: var(--ghsync-info-bg);
  color: var(--ghsync-info-text);
}

.ghsync__scope-pill--mixed {
  border-color: var(--ghsync-warning-border);
  background: var(--ghsync-warning-bg);
  color: var(--ghsync-warning-text);
}

.ghsync__badge {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  min-height: 24px;
  padding: 0 10px;
  border-radius: 999px;
  border: 1px solid var(--ghsync-badge-border);
  background: var(--ghsync-badge-bg);
  color: var(--ghsync-badge-text);
  font-size: 12px;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.ghsync__badge--success {
  border-color: var(--ghsync-success-border);
  background: var(--ghsync-success-bg);
  color: var(--ghsync-success-text);
}

.ghsync__badge--warning {
  border-color: var(--ghsync-warning-border);
  background: var(--ghsync-warning-bg);
  color: var(--ghsync-warning-text);
}

.ghsync__badge--info {
  border-color: var(--ghsync-info-border);
  background: var(--ghsync-info-bg);
  color: var(--ghsync-info-text);
}

.ghsync__badge--danger {
  border-color: var(--ghsync-danger-border);
  background: var(--ghsync-danger-bg);
  color: var(--ghsync-danger-text);
}

.ghsync__badge--neutral {
  border-color: var(--ghsync-border);
  background: transparent;
  color: var(--ghsync-muted);
}

.ghsync__badge-dot {
  width: 7px;
  height: 7px;
  border-radius: 999px;
  background: currentColor;
}

.ghsync__stack,
.ghsync__mapping-list,
.ghsync__side-body,
.ghsync__detail-list {
  display: grid;
  gap: 12px;
}

.ghsync__field {
  display: grid;
  gap: 8px;
}

.ghsync__field label {
  font-size: 12px;
  font-weight: 600;
  color: var(--ghsync-title);
}

.ghsync__input {
  width: 100%;
  min-height: 40px;
  border-radius: 10px;
  border: 1px solid var(--ghsync-input-border);
  background: var(--ghsync-input-bg);
  color: var(--ghsync-input-text);
  padding: 0 12px;
  outline: none;
}

.ghsync__input--select {
  appearance: none;
  -webkit-appearance: none;
  -moz-appearance: none;
  font: inherit;
  line-height: 1.2;
  padding-right: 40px;
  background-image:
    linear-gradient(45deg, transparent 50%, var(--ghsync-muted) 50%),
    linear-gradient(135deg, var(--ghsync-muted) 50%, transparent 50%);
  background-position:
    calc(100% - 18px) 16px,
    calc(100% - 12px) 16px;
  background-size: 6px 6px, 6px 6px;
  background-repeat: no-repeat;
}

.ghsync__input::placeholder {
  color: var(--ghsync-muted);
}

.ghsync__input:focus {
  border-color: var(--ghsync-border);
}

.ghsync__input[readonly] {
  opacity: 0.78;
}

.ghsync__input:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.ghsync__picker {
  position: relative;
}

.ghsync__picker-trigger {
  width: fit-content;
  max-width: 100%;
  min-height: 0;
  display: inline-flex;
  align-items: center;
  justify-content: space-between;
  gap: 6px;
  border-radius: 8px;
  border: 1px solid var(--ghsync-border);
  background: color-mix(in srgb, var(--ghsync-badgeBg) 72%, transparent);
  color: var(--ghsync-text);
  padding: 4px 8px;
  text-align: left;
  cursor: pointer;
  transition: background-color 120ms ease, color 120ms ease, border-color 120ms ease;
}

.ghsync__picker-trigger:disabled {
  opacity: 0.72;
  cursor: not-allowed;
}

.ghsync__picker-trigger:focus,
.ghsync__picker-trigger:focus-visible {
  outline: none;
  border-color: var(--ghsync-border);
}

.ghsync__picker-trigger:hover {
  background: var(--ghsync-surfaceRaised);
}

.ghsync__picker-trigger--assignee {
  min-width: 10rem;
  font-size: 14px;
  font-weight: 500;
}

.ghsync__picker-trigger--status {
  font-size: 12px;
}

.ghsync__picker-trigger-main {
  min-width: 0;
  display: inline-flex;
  align-items: center;
  gap: 8px;
}

.ghsync__picker-agent-icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  color: var(--ghsync-muted);
}

.ghsync__picker-agent-icon svg {
  width: 14px;
  height: 14px;
}

.ghsync__picker-trigger-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ghsync__picker-trigger-icon {
  flex: 0 0 auto;
  display: inline-flex;
  align-items: center;
  color: var(--ghsync-muted);
}

.ghsync__picker-trigger-icon svg,
.ghsync__picker-option-check svg {
  width: 16px;
  height: 16px;
}

.ghsync__picker-panel {
  position: absolute;
  top: calc(100% + 8px);
  left: 0;
  z-index: 30;
  border-radius: 8px;
  border: 1px solid var(--ghsync-border);
  background: var(--ghsync-surfaceAlt);
  box-shadow: var(--ghsync-shadow);
  padding: 4px;
}

.ghsync__picker-panel--assignee {
  width: min(20rem, calc(100vw - 2rem));
}

.ghsync__picker-panel--status {
  width: 9rem;
}

.ghsync__picker-search {
  padding: 2px 2px 6px;
}

.ghsync__picker-search-input {
  width: 100%;
  min-height: 32px;
  border-radius: 6px;
  border: 1px solid transparent;
  background: transparent;
  color: var(--ghsync-input-text);
  padding: 0 8px;
  font-size: 14px;
  outline: none;
}

.ghsync__picker-search-input::placeholder {
  color: var(--ghsync-muted);
}

.ghsync__picker-search-input:focus,
.ghsync__picker-search-input:focus-visible {
  border-color: var(--ghsync-input-border);
  background: var(--ghsync-surfaceRaised);
}

.ghsync__picker-list {
  display: flex;
  flex-direction: column;
  gap: 2px;
  max-height: 240px;
  overflow: auto;
}

.ghsync__picker-option {
  width: 100%;
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  border: none;
  border-radius: 6px;
  background: transparent;
  color: var(--ghsync-input-text);
  padding: 6px 8px;
  text-align: left;
  cursor: pointer;
}

.ghsync__picker-option:hover,
.ghsync__picker-option:focus,
.ghsync__picker-option:focus-visible,
.ghsync__picker-option--selected {
  outline: none;
  background: var(--ghsync-surfaceRaised);
}

.ghsync__picker-panel--assignee .ghsync__picker-option {
  font-size: 14px;
  touch-action: manipulation;
}

.ghsync__picker-panel--status .ghsync__picker-option {
  font-size: 12px;
}

.ghsync__picker-option-label {
  min-width: 0;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.ghsync__picker-option-check {
  flex: 0 0 auto;
  color: var(--ghsync-muted);
}

.ghsync__picker-empty {
  padding: 10px 12px;
  color: var(--ghsync-muted);
  font-size: 13px;
}

.ghsync__select-dot {
  width: 10px;
  height: 10px;
  flex: 0 0 auto;
  border-radius: 999px;
  border: 1px solid currentColor;
  background: transparent;
}

.ghsync__select-dot--neutral {
  color: var(--ghsync-muted);
}

.ghsync__select-dot--blue {
  color: #60a5fa;
}

.ghsync__select-dot--yellow {
  color: #facc15;
}

.ghsync__select-dot--violet {
  color: #a78bfa;
}

.ghsync__select-dot--green {
  color: #34d399;
}

.ghsync__select-dot--red {
  color: #f87171;
}

.ghsync__hint,
.ghsync__note,
.ghsync__check span {
  margin: 0;
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync__branch-hint {
  min-height: 18px;
}

.ghsync__hint--error {
  color: var(--ghsync-danger-text);
}

.ghsync__actions,
.ghsync__section-footer,
.ghsync__connected,
.ghsync__locked,
.ghsync__sync-summary,
.ghsync__mapping-head,
.ghsync__check-top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.ghsync__section-footer {
  justify-content: flex-end;
  padding: 12px 10px 10px;
  margin-top: 6px;
}

.ghsync__connected,
.ghsync__locked,
.ghsync__sync-summary,
.ghsync__check {
  border: 1px solid var(--ghsync-border-soft);
  border-radius: 10px;
  background: var(--ghsync-surfaceAlt);
  padding: 14px;
}

.ghsync__connected strong,
.ghsync__locked strong,
.ghsync__sync-summary strong {
  display: block;
  font-size: 13px;
  color: var(--ghsync-title);
}

.ghsync__connected span:not(.ghsync__scope-pill),
.ghsync__locked span:not(.ghsync__scope-pill),
.ghsync__sync-summary span:not(.ghsync__scope-pill) {
  display: block;
  margin-top: 4px;
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync__sync-summary > div {
  display: grid;
  gap: 8px;
}

.ghsync__permission-audit {
  display: grid;
  gap: 10px;
  padding: 14px;
  border-radius: 10px;
  border: 1px solid var(--ghsync-border-soft);
  background: var(--ghsync-surfaceAlt);
}

.ghsync__permission-audit--warning {
  border-color: var(--ghsync-warning-border);
  background: var(--ghsync-warning-bg);
}

.ghsync__permission-audit-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  flex-wrap: wrap;
}

.ghsync__permission-audit-header strong,
.ghsync__permission-audit-item strong {
  color: var(--ghsync-title);
  font-size: 13px;
}

.ghsync__permission-audit-list {
  display: grid;
  gap: 10px;
}

.ghsync__permission-audit-item {
  display: grid;
  gap: 4px;
}

.ghsync__permission-audit-item span {
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync__sync-summary--success {
  border-color: var(--ghsync-success-border);
  background: var(--ghsync-success-bg);
}

.ghsync__sync-summary--success strong,
.ghsync__sync-summary--success span {
  color: var(--ghsync-success-text);
}

.ghsync__sync-summary--danger {
  border-color: var(--ghsync-danger-border);
  background: var(--ghsync-danger-bg);
}

.ghsync__sync-summary--danger strong,
.ghsync__sync-summary--danger span {
  color: var(--ghsync-danger-text);
}

.ghsync__sync-summary--info {
  border-color: var(--ghsync-info-border);
  background: var(--ghsync-info-bg);
}

.ghsync__sync-summary--info strong,
.ghsync__sync-summary--info span {
  color: var(--ghsync-info-text);
}

.ghsync__button-row {
  display: flex;
  align-items: center;
  gap: 8px;
  flex-wrap: wrap;
}

.ghsync__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: 6px;
  white-space: nowrap;
  text-decoration: none;
  cursor: pointer;
}

.ghsync__button:disabled {
  cursor: not-allowed;
}

.ghsync__mapping-card,
.ghsync__advanced-card,
.ghsync__schedule-card,
.ghsync__stat {
  border: 1px solid var(--ghsync-border-soft);
  border-radius: 10px;
  background: var(--ghsync-surfaceRaised);
}

.ghsync__mapping-card,
.ghsync__advanced-card {
  display: grid;
  gap: 12px;
  padding: 14px;
}

.ghsync__schedule-card {
  display: grid;
  gap: 12px;
  align-items: start;
  padding: 14px;
  grid-template-columns: minmax(0, 1fr) minmax(180px, 0.8fr);
}

.ghsync__mapping-title strong {
  display: block;
  font-size: 13px;
  color: var(--ghsync-title);
}

.ghsync__mapping-title span {
  display: block;
  margin-top: 4px;
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync__existing-projects {
  display: grid;
  gap: 10px;
}

.ghsync__existing-project-card {
  display: grid;
  gap: 10px;
  align-items: start;
  grid-template-columns: minmax(0, 1fr) auto;
}

.ghsync__existing-project-meta {
  display: grid;
  gap: 6px;
}

.ghsync__existing-project-meta strong {
  color: var(--ghsync-title);
  font-size: 13px;
}

.ghsync__existing-project-meta span {
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync__existing-project-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.ghsync__mapping-grid {
  display: grid;
  align-items: start;
  gap: 12px;
  grid-template-columns: minmax(0, 1.15fr) minmax(220px, 0.85fr);
}

.ghsync__textarea {
  min-height: 96px;
  padding: 10px 12px;
  resize: vertical;
}

.ghsync__stats {
  display: grid;
  gap: 10px;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.ghsync__schedule-meta {
  display: grid;
  gap: 4px;
}

.ghsync__schedule-meta strong {
  font-size: 13px;
  color: var(--ghsync-title);
}

.ghsync__schedule-meta span {
  color: var(--ghsync-muted);
  font-size: 12px;
  line-height: 1.5;
}

.ghsync__stat {
  display: grid;
  gap: 6px;
  padding: 12px;
}

.ghsync__stat--emphasized {
  border-color: var(--ghsync-danger-border);
  background: var(--ghsync-danger-bg);
}

.ghsync__stat span {
  display: block;
  color: var(--ghsync-title);
  font-size: 12px;
  font-weight: 600;
}

.ghsync__stat strong {
  display: block;
  color: var(--ghsync-title);
  font-size: 20px;
  line-height: 1;
}

.ghsync__stat p {
  margin: 0;
  color: var(--ghsync-muted);
  font-size: 11px;
  line-height: 1.5;
}

.ghsync__side-body {
  padding: 16px 18px;
}

.ghsync__check {
  display: grid;
  gap: 6px;
}

.ghsync__check strong {
  font-size: 12px;
  color: var(--ghsync-title);
}

.ghsync__detail-list {
  padding-top: 2px;
}

.ghsync__detail {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding-bottom: 10px;
  border-bottom: 1px solid var(--ghsync-border-soft);
}

.ghsync__detail:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.ghsync__detail-label {
  color: var(--ghsync-muted);
  font-size: 12px;
}

.ghsync__detail-value {
  color: var(--ghsync-title);
  font-size: 12px;
  text-align: right;
}

@media (max-width: 980px) {
  .ghsync__scope-overview,
  .ghsync__layout,
  .ghsync__schedule-card,
  .ghsync__existing-project-card,
  .ghsync__advanced-card,
  .ghsync__mapping-grid,
  .ghsync__stats {
    grid-template-columns: minmax(0, 1fr);
  }
}

@media (max-width: 640px) {
  .ghsync__header,
  .ghsync__section-head,
  .ghsync__actions,
  .ghsync__section-footer,
  .ghsync__connected,
  .ghsync__locked,
  .ghsync__sync-summary,
  .ghsync__mapping-head,
  .ghsync__check-top {
    align-items: stretch;
    flex-direction: column;
  }

  .ghsync__button-row {
    width: 100%;
  }

  .ghsync__button {
    flex: 1 1 auto;
  }

  .ghsync__detail {
    display: grid;
    gap: 4px;
  }

  .ghsync__detail-value {
    text-align: left;
  }
}
`;

export const GITLAB_CONNECTOR_UI_STYLES =
  PAGE_STYLES_MAIN + SHARED_LOADING_STYLES + SHARED_PROGRESS_STYLES;
