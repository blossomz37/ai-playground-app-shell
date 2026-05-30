<script lang="ts">
  // Placeholder for Prompt Studio inspector (Run Settings & History)
</script>

<div class="inspector-view">
  <div class="section">
    <h3>Run Settings</h3>
    
    <div class="field">
      <label for="provider">Provider</label>
      <select id="provider" class="select-input">
        <option>OpenAI</option>
        <option>Anthropic</option>
        <option>Google</option>
        <option>Local (Ollama)</option>
      </select>
    </div>

    <div class="field">
      <label for="model">Model</label>
      <select id="model" class="select-input">
        <option>gpt-4o</option>
        <option>gpt-3.5-turbo</option>
      </select>
    </div>

    <div class="field">
      <label for="temp">Temperature: <span class="val">0.7</span></label>
      <input id="temp" type="range" min="0" max="2" step="0.1" value="0.7" />
    </div>
  </div>

  <div class="section">
    <h3>Run History</h3>
    <div class="history-list">
      <div class="history-item">
        <div class="time">10:42 AM</div>
        <div class="status success">Success</div>
      </div>
      <div class="history-item">
        <div class="time">10:35 AM</div>
        <div class="status error">Error</div>
      </div>
      <div class="history-item">
        <div class="time">Yesterday</div>
        <div class="status success">Success</div>
      </div>
    </div>
  </div>
</div>

<style>
  .inspector-view {
    display: flex;
    flex-direction: column;
    padding: var(--space-4);
    gap: var(--space-6);
  }

  .section {
    display: flex;
    flex-direction: column;
    gap: var(--space-3);
  }

  h3 {
    margin: 0;
    font-size: var(--font-size-sm);
    font-weight: 600;
    color: var(--color-fg-muted);
    text-transform: uppercase;
    letter-spacing: 0.05em;
    border-bottom: 1px solid var(--border-subtle);
    padding-bottom: var(--space-2);
  }

  .field {
    display: flex;
    flex-direction: column;
    gap: var(--space-1);
  }

  label {
    font-size: var(--font-size-sm);
    font-weight: 500;
    display: flex;
    justify-content: space-between;
  }

  .val {
    color: var(--color-fg-muted);
  }

  .select-input {
    padding: var(--space-2);
    border-radius: var(--radius-sm);
    border: 1px solid var(--border-subtle);
    background: var(--color-bg-base);
    color: var(--color-fg-default);
    font-size: var(--font-size-sm);
  }

  input[type="range"] {
    width: 100%;
    margin-top: var(--space-2);
  }

  .history-list {
    display: flex;
    flex-direction: column;
    gap: var(--space-2);
  }

  .history-item {
    display: flex;
    justify-content: space-between;
    padding: var(--space-2);
    background: var(--color-bg-base);
    border-radius: var(--radius-sm);
    font-size: var(--font-size-xs);
  }

  .time {
    color: var(--color-fg-muted);
  }

  .status {
    font-weight: 600;
  }

  .status.success {
    color: var(--color-success, #2da44e);
  }

  .status.error {
    color: var(--color-error, #cf222e);
  }
</style>
