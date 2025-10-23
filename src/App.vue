<script setup lang="ts">
import { ref, computed } from 'vue';
import VueJsonPretty from 'vue-json-pretty';
import 'vue-json-pretty/lib/styles.css';

const jsonInput = ref(JSON.stringify({
  example: "Paste your JSON here",
  items: [1, 2, 3],
  nested: {
    key: "value",
    enabled: true
  }
}, null, 2));

const parsedJson = computed(() => {
  try {
    return JSON.parse(jsonInput.value);
  } catch (e) {
    return { error: 'Invalid JSON' };
  }
});

const formatJson = () => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    jsonInput.value = JSON.stringify(parsed, null, 2);
  } catch (e) {
    // Handle invalid JSON
  }
};

const minifyJson = () => {
  try {
    const parsed = JSON.parse(jsonInput.value);
    jsonInput.value = JSON.stringify(parsed);
  } catch (e) {
    // Handle invalid JSON
  }
};
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>JSON Viewer</h1>
      <div class="toolbar">
        <button @click="formatJson" class="btn">Format</button>
        <button @click="minifyJson" class="btn">Minify</button>
      </div>
    </header>
    
    <div class="panels">
      <div class="panel">
        <div class="panel-header">
          <h3>JSON Input</h3>
        </div>
        <div class="panel-content">
          <textarea
            v-model="jsonInput"
            class="json-textarea"
            spellcheck="false"
            placeholder="Paste your JSON here..."
          ></textarea>
        </div>
      </div>
      
      <div class="panel">
        <div class="panel-header">
          <h3>Tree View</h3>
        </div>
        <div class="panel-content tree-view">
          <VueJsonPretty 
            :data="parsedJson"
            :deep="3"
            :showLine="true"
            :showLineNumber="true"
            :showDoubleQuotes="true"
            :showLength="true"
            :highlightMouseoverNode="true"
            :collapsedOnClickBrackets="true"
            :deepCollapseChildren="true"
          />
        </div>
      </div>
    </div>
  </div>
</template>

<style>
:root {
  --primary: #4f46e5;
  --primary-light: #818cf8;
  --border: #e2e8f0;
  --text: #1e293b;
  --text-light: #64748b;
  --bg: #f8fafc;
  --panel-bg: #ffffff;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

body {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Oxygen, Ubuntu, Cantarell, 'Open Sans', 'Helvetica Neue', sans-serif;
  background-color: var(--bg);
  color: var(--text);
  line-height: 1.5;
}

.app {
  min-height: 100vh;
  display: flex;
  flex-direction: column;
}

.header {
  background-color: var(--panel-bg);
  padding: 1rem 2rem;
  border-bottom: 1px solid var(--border);
  display: flex;
  justify-content: space-between;
  align-items: center;
}

h1 {
  font-size: 1.5rem;
  font-weight: 600;
  color: var(--text);
}

.toolbar {
  display: flex;
  gap: 0.5rem;
}

.btn {
  padding: 0.5rem 1rem;
  background-color: var(--primary);
  color: white;
  border: none;
  border-radius: 0.375rem;
  font-size: 0.875rem;
  font-weight: 500;
  cursor: pointer;
  transition: background-color 0.2s;
}

.btn:hover {
  background-color: var(--primary-light);
}

.panels {
  display: flex;
  flex: 1;
  overflow: hidden;
}

.panel {
  flex: 1;
  display: flex;
  flex-direction: column;
  border-right: 1px solid var(--border);
  background-color: var(--panel-bg);
  overflow: hidden;
}

.panel:last-child {
  border-right: none;
}

.panel-header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid var(--border);
  background-color: #f8fafc;
}

.panel-header h3 {
  font-size: 0.875rem;
  font-weight: 600;
  color: var(--text-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
}

.panel-content {
  flex: 1;
  overflow: auto;
  padding: 1rem;
}

.json-textarea {
  width: 100%;
  height: 100%;
  min-height: 300px;
  padding: 1rem;
  border: 1px solid var(--border);
  border-radius: 0.5rem;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.5;
  resize: none;
  background-color: #f8fafc;
  color: var(--text);
}

.json-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.2);
}

.tree-view {
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.875rem;
}

/* Custom styles for vue-json-pretty */
.vjs-tree {
  font-family: inherit;
  color: var(--text);
}

.vjs-tree-node {
  line-height: 1.5;
}

.vjs-tree-node.is-highlight,
.vjs-tree-node:hover {
  background-color: #f1f5f9;
}

.vjs-tree-node.is-expanded > .vjs-tree-node__content::before {
  border-color: var(--primary);
}

.vjs-tree-node__content .vjs-tree-node__key {
  color: #0ea5e9;
}

.vjs-tree-node__value {
  color: #10b981;
}

.vjs-tree-node__value-string {
  color: #f43f5e;
}

.vjs-tree-node__value-number {
  color: #8b5cf6;
}

.vjs-tree-node__value-boolean {
  color: #f97316;
}

.vjs-tree-node__value-null,
.vjs-tree-node__value-undefined {
  color: #94a3b8;
}
</style>
