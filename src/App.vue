<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import VueJsonPretty from 'vue-json-pretty'
import 'vue-json-pretty/lib/styles.css'

const jsonInput = ref('')
const lineNumbers = ref('1')
const textareaRef = ref<HTMLTextAreaElement | null>(null)
const lineNumbersRef = ref<HTMLDivElement | null>(null)
const jsonViewer = ref()
const highlightRef = ref<HTMLElement | null>(null)

// Syntax highlighter function
const highlightJson = (json: string): string => {
  if (!json) return ''

  try {
    // Parse and re-stringify to ensure valid JSON
    const obj = JSON.parse(json)
    json = JSON.stringify(obj, null, 2)
  } catch {
    return json // Return as-is if invalid JSON
  }

  // Convert tabs to spaces for consistent rendering
  json = json.replace(/\t/g, '  ')

  // Handle empty object/array case
  if (json.trim() === '') return ''

  // Highlight JSON syntax with improved regex
  return json
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"(\\.|[^"])*"(\s*:)?/g, (match, p1, p2) => {
      let cls = 'string'
      if (p2) {
        cls = 'key'
        // Remove the trailing colon from the match for proper highlighting
        const key = match.replace(/:$/, '')
        return `<span class="${cls}">${key}</span>:`
      }
      return `<span class="${cls}">${match}</span>`
    })
    .replace(/\b(true|false)\b/g, '<span class="boolean">$&</span>')
    .replace(/\b(null)\b/g, '<span class="null">$&</span>')
    .replace(/\b(\d+\.?\d*)\b/g, '<span class="number">$&</span>')
    .replace(/\n/g, '<br>') // Handle newlines for better line number alignment
}

// Update line numbers when input changes
const updateLineNumbers = () => {
  const lines = jsonInput.value.split('\n').length
  lineNumbers.value = Array.from({ length: Math.max(1, lines) }, (_, i) => i + 1).join('\n')
}

// Sync scroll between textarea and line numbers
const syncScroll = () => {
  if (textareaRef.value && lineNumbersRef.value) {
    lineNumbersRef.value.scrollTop = textareaRef.value.scrollTop
  }
}

// Initialize and watch for changes
onMounted(() => {
  updateLineNumbers()
  if (textareaRef.value) {
    textareaRef.value.addEventListener('input', updateLineNumbers)
    textareaRef.value.addEventListener('scroll', syncScroll)
  }
})

const parsedJson = computed(() => {
  try {
    return jsonInput.value ? JSON.parse(jsonInput.value) : null
  } catch (_err) {
    return null
  }
})

const formatJson = () => {
  try {
    const parsed = JSON.parse(jsonInput.value)
    jsonInput.value = JSON.stringify(parsed, null, 2)
  } catch (error) {
    console.error('Invalid JSON:', error)
  }
}

const minifyJson = () => {
  try {
    const parsed = JSON.parse(jsonInput.value)
    jsonInput.value = JSON.stringify(parsed)
  } catch (error) {
    console.error('Invalid JSON:', error)
  }
}

const copyToClipboard = async () => {
  try {
    await navigator.clipboard.writeText(jsonInput.value)
    alert('JSON copied to clipboard!')
  } catch (error) {
    console.error('Failed to copy:', error)
  }
}
</script>

<template>
  <div class="app">
    <header class="header">
      <h1>JSON Viewer</h1>
    </header>

    <div class="panels">
      <!-- Left Panel (45%) -->
      <div class="panel left-panel">
        <div class="panel-header">
          <h3>JSON Input</h3>
        </div>
        <div class="panel-content code-editor">
          <div class="line-numbers" ref="lineNumbersRef">{{ lineNumbers }}</div>
          <textarea
            ref="textareaRef"
            v-model="jsonInput"
            class="json-textarea"
            spellcheck="false"
            placeholder="Paste your JSON here..."
            @input="updateLineNumbers"
            @scroll="syncScroll"
          ></textarea>
          <pre
            class="syntax-highlight"
            aria-hidden="true"
            v-html="highlightJson(jsonInput)"
            ref="highlightRef"
          ></pre>
        </div>
      </div>

      <!-- Center Panel (10%) -->
      <div class="center-panel">
        <div class="action-buttons">
          <div class="action-group">
            <h4>JSON Tools</h4>
            <button @click="formatJson" class="action-btn" title="Format JSON">
              <span class="icon">⇄</span>
              <span class="text">Format</span>
            </button>
            <button @click="minifyJson" class="action-btn" title="Minify JSON">
              <span class="icon">⇅</span>
              <span class="text">Minify</span>
            </button>
            <button @click="copyToClipboard" class="action-btn" title="Copy to Clipboard">
              <span class="icon">⎘</span>
              <span class="text">Copy</span>
            </button>
          </div>
        </div>
      </div>

      <!-- Right Panel (45%) -->
      <div class="panel right-panel">
        <div class="panel-header">
          <h3>Tree View</h3>
        </div>
        <div class="panel-content tree-view">
          <div v-if="parsedJson" class="tree-view">
            <VueJsonPretty
              ref="jsonViewer"
              :data="parsedJson"
              :deep="10"
              :show-line="true"
              :show-double-quotes="true"
              :show-length="true"
              :highlight-selected-node="true"
              :show-line-number="true"
              :show-icon="true"
              :show-line-hover="true"
              :selectable-type="'multiple'"
              :show-length-icon="true"
              :show-double-quotes-icon="true"
              :show-line-number-icon="true"
              :show-line-hover-icon="true"
              :show-icon-icon="true"
              :highlight-mouseover-node="true"
              :collapsed-on-click-brackets="true"
              class="json-tree"
            />
          </div>
          <div v-else class="empty-state">
            <p>No JSON data to display</p>
          </div>
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
  --panel-width: 45%;
  --center-width: 10%;
  --header-height: 60px;
}

* {
  box-sizing: border-box;
  margin: 0;
  padding: 0;
}

html,
body,
#app {
  height: 100%;
  width: 100%;
  overflow: hidden;
}

body {
  font-family:
    'Inter',
    -apple-system,
    BlinkMacSystemFont,
    'Segoe UI',
    Roboto,
    Oxygen,
    Ubuntu,
    Cantarell,
    'Open Sans',
    'Helvetica Neue',
    sans-serif;
  background-color: var(--bg);
  color: var(--text);
  line-height: 1.5;
  margin: 0;
  padding: 0;
}

.app {
  display: flex;
  flex-direction: column;
  height: 100vh;
  width: 100%;
  overflow: hidden;
}

.header {
  background-color: var(--panel-bg);
  padding: 0 1.5rem;
  border-bottom: 1px solid var(--border);
  height: var(--header-height);
  min-height: var(--header-height);
  display: flex;
  align-items: center;
  flex-shrink: 0;
}

h1 {
  font-size: 1.25rem;
  font-weight: 600;
  color: var(--text);
  margin: 0;
}

.panels {
  display: flex;
  flex: 1;
  overflow: hidden;
  width: 100%;
  height: calc(100% - var(--header-height));
  flex-direction: row;
}

.panel {
  display: flex;
  flex-direction: column;
  background-color: var(--panel-bg);
  height: 100%;
  overflow: hidden;
  position: relative;
}

.left-panel {
  width: var(--panel-width);
  min-width: 300px;
  border-right: 1px solid var(--border);
}

.right-panel {
  flex: 1;
  min-width: 300px;
  border-left: 1px solid var(--border);
}

.center-panel {
  width: var(--center-width);
  min-width: 120px;
  max-width: 180px;
  background-color: #f8fafc;
  border-right: 1px solid var(--border);
  padding: 1rem 0.5rem;
  display: flex;
  flex-direction: column;
  overflow: hidden;
}

.action-buttons {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  width: 100%;
  height: 100%;
  overflow-y: auto;
  padding: 0.5rem;
  scrollbar-width: thin;
  scrollbar-color: #c1c1c1 #f1f1f1;
}

.action-group {
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.action-group h4 {
  font-size: 0.7rem;
  text-transform: uppercase;
  letter-spacing: 0.05em;
  color: var(--text-light);
  margin: 0 0 0.25rem 0.5rem;
  font-weight: 600;
}

.action-btn {
  display: flex;
  align-items: center;
  padding: 0.5rem 0.75rem;
  background-color: white;
  border: 1px solid var(--border);
  border-radius: 6px;
  cursor: pointer;
  transition: all 0.2s ease;
  width: 100%;
  text-align: left;
  font-size: 0.85rem;
  color: var(--text);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.action-btn:hover {
  background-color: #f1f5f9;
  border-color: var(--primary-light);
  color: var(--primary);
  transform: translateY(-1px);
  box-shadow: 0 2px 4px rgba(0, 0, 0, 0.05);
}

.action-btn:active {
  transform: translateY(0);
  box-shadow: 0 1px 2px rgba(0, 0, 0, 0.05);
}

.action-btn .icon {
  font-size: 1rem;
  margin-right: 0.75rem;
  width: 1.25rem;
  text-align: center;
  display: flex;
  align-items: center;
  justify-content: center;
}

.action-btn .text {
  font-size: 0.85rem;
  font-weight: 500;
}

.divider {
  height: 1px;
  background-color: var(--border);
  margin: 0.5rem 0.75rem;
  width: calc(100% - 1.5rem);
  opacity: 0.7;
}

.panel-header {
  padding: 0.75rem 1.25rem;
  border-bottom: 1px solid var(--border);
  background-color: #f8fafc;
  flex-shrink: 0;
  display: flex;
  align-items: center;
}

.panel-header h3 {
  font-size: 0.75rem;
  font-weight: 600;
  color: var(--text-light);
  text-transform: uppercase;
  letter-spacing: 0.05em;
  margin: 0;
}

.panel-content {
  flex: 1;
  position: relative;
  overflow: hidden;
}

.code-editor {
  position: relative;
  display: flex;
  height: 100%;
  background: #f8f8f8;
}

.line-numbers {
  width: 44px;
  padding: 10px 8px 10px 12px;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.8125rem;
  line-height: 1.6;
  color: #4b5563;
  text-align: right;
  background: #f8f9fa;
  border-right: 1px solid #e5e7eb;
  user-select: none;
  overflow: hidden;
  box-sizing: border-box;
  font-weight: 500;
}

.json-textarea {
  position: absolute;
  top: 0;
  left: 44px;
  width: calc(100% - 44px);
  height: 100%;
  min-height: 200px;
  padding: 10px 12px 10px 8px;
  margin: 0;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.875rem;
  color: #1f2937;
  line-height: 1.6;
  resize: none;
  background: transparent;
  color: transparent;
  caret-color: #a29e9e;
  border: none;
  outline: none;
  white-space: pre;
  overflow: auto;
  z-index: 2;
  tab-size: 2;
  box-sizing: border-box;
}

.syntax-highlight {
  position: absolute;
  top: 0;
  left: 44px;
  width: calc(100% - 44px);
  height: 100%;
  padding: 10px 12px 10px 8px;
  margin: 0;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.875rem;
  line-height: 1.6;
  white-space: pre;
  overflow: hidden;
  pointer-events: none;
  z-index: 1;
  box-sizing: border-box;
  word-wrap: break-word;
  white-space: pre-wrap;
  color: #1f2937;
}

/* Syntax highlighting colors - improved contrast */
.syntax-highlight {
  color: #1f2937; /* Darker default text for better readability */
}

.syntax-highlight .string {
  color: #d97706; /* Warm orange for strings */
}

.syntax-highlight .number {
  color: #059669; /* Green for numbers */
}

.syntax-highlight .boolean {
  color: #2563eb; /* Blue for booleans */
}

.syntax-highlight .null {
  color: #7c3aed; /* Purple for null */
}

.syntax-highlight .key {
  color: #1d4ed8; /* Darker blue for keys */
  font-weight: 500;
}

.json-textarea:focus {
  outline: none;
  border-color: var(--primary);
  box-shadow: 0 0 0 2px rgba(79, 70, 229, 0.1);
}

.tree-view {
  font-family: 'Menlo', 'Monaco', 'Courier New', monospace;
  font-size: 13px;
  line-height: 1.5;
  height: 100%;
  overflow: auto;
  padding: 0.5rem 0;
}

.empty-state {
  display: flex;
  align-items: center;
  justify-content: center;
  height: 100%;
  color: #9e9e9e;
  font-style: italic;
}

.json-tree {
  padding: 0 0.5rem;
}

/* Custom styles for vue-json-pretty */
.vjs-tree {
  font-family: inherit;
  color: #333;
  font-size: 13px;
  line-height: 1.5;
  padding: 0;
}

.vjs-tree-node {
  position: relative;
  padding-left: 20px;
  margin: 0;
  line-height: 1.5;
}

.vjs-tree-node__content {
  display: flex;
  align-items: center;
  min-height: 20px;
  padding: 2px 0;
  margin: 0;
  position: relative;
}

/* Collapse/Expand arrows */
.vjs-tree-node__content.has-arrow::before {
  content: '▶';
  display: inline-block;
  font-size: 9px;
  color: #6b7280;
  margin-right: 6px;
  transition: transform 0.2s;
  transform-origin: 45% 50%;
  position: absolute;
  left: -16px;
  top: 6px;
  pointer-events: none;
}

.vjs-tree-node.is-expanded > .vjs-tree-node__content::before {
  transform: rotate(90deg);
  color: var(--primary);
}

/* Key styles */
.vjs-tree-node__content .vjs-tree-node__key {
  color: #1e40af;
  font-weight: 500;
  margin-right: 4px;
}

.vjs-tree-node__key:after {
  content: ':';
  color: #333;
  margin-left: 2px;
  margin-right: 4px;
}

/* Value styles */
.vjs-tree-node__value {
  color: #065f46;
}

.vjs-tree-node__value-string {
  color: #9d174d;
}

.vjs-tree-node__value-number {
  color: #7e22ce;
}

.vjs-tree-node__value-boolean {
  color: #b45309;
}

.vjs-tree-node__value-null,
.vjs-tree-node__value-undefined {
  color: #6b7280;
  font-style: italic;
}

/* Indentation lines */
.vjs-tree-node {
  position: relative;
  padding-left: 20px;
}

.vjs-tree-node:before {
  content: '';
  position: absolute;
  left: 8px;
  top: 0;
  bottom: 0;
  border-left: 1px solid #e5e7eb;
  pointer-events: none;
}

.vjs-tree-node:last-child:before {
  height: 14px;
}

.vjs-tree-node:after {
  content: '';
  position: absolute;
  left: 8px;
  top: 12px;
  width: 10px;
  border-top: 1px solid #e5e7eb;
  pointer-events: none;
}

.vjs-tree-node__children {
  position: relative;
  margin: 0;
  padding-left: 20px;
}

/* Hide the line for the last child */
.vjs-tree-node:last-child:before {
  display: none;
}

/* Hide the line for the root node */
.vjs-tree > .vjs-tree-node:before,
.vjs-tree > .vjs-tree-node:after {
  display: none;
}

/* Add some spacing between items */
.vjs-tree-node + .vjs-tree-node {
  margin-top: 2px;
}

/* Add a subtle background to hovered items */
.vjs-tree-node:hover {
  background-color: #f9fafb;
  border-radius: 3px;
}

/* Responsive styles */
@media (max-width: 1200px) {
  :root {
    --panel-width: 40%;
    --center-width: 20%;
  }
}

@media (max-width: 992px) {
  :root {
    --panel-width: 35%;
    --center-width: 30%;
  }

  .action-btn {
    padding: 0.5rem;
    font-size: 0.8rem;
  }

  .action-btn .icon {
    margin-right: 0.5rem;
  }

  .action-btn .text {
    font-size: 0.8rem;
  }
}

@media (max-width: 768px) {
  .panels {
    flex-direction: column;
    height: auto;
    overflow-y: auto;
    display: flex;
    flex: 1;
  }

  .panel,
  .left-panel,
  .right-panel,
  .center-panel {
    width: 100% !important;
    min-width: 100% !important;
    max-width: 100% !important;
    height: auto !important;
    max-height: none;
    border: none !important;
    border-bottom: 1px solid var(--border) !important;
    margin: 0;
    padding: 0;
  }

  .center-panel {
    order: 1;
    padding: 1rem 0;
    background: #f8fafc;
  }

  .left-panel {
    order: 2;
    flex: 1;
    min-height: 200px;
    border-bottom: 1px solid var(--border) !important;
  }

  .right-panel {
    order: 3;
    flex: 1;
    min-height: 300px;
    border-bottom: none !important;
  }

  .action-buttons {
    flex-direction: row;
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0 0.75rem;
    justify-content: space-between;
  }

  .action-group {
    flex: 1;
    min-width: 120px;
    margin: 0;
  }

  .action-group h4 {
    display: none;
  }

  .divider {
    display: none;
  }

  .action-btn {
    justify-content: center;
    padding: 0.75rem 0.5rem;
    font-size: 0.9rem;
    margin: 0.25rem;
    flex: 1 1 calc(33.333% - 0.5rem);
    min-width: 80px;
  }

  .action-btn .text {
    display: none;
  }

  .action-btn .icon {
    margin: 0;
    font-size: 1.1rem;
  }

  .panel-header {
    padding: 0.5rem 1rem;
    background: #f1f5f9;
  }

  .panel-content {
    padding: 0.75rem;
    height: calc(100% - 45px);
    overflow: auto;
  }

  .json-textarea {
    min-height: 200px;
    width: 100%;
    height: 100%;
    resize: none;
  }

  .vjs-tree {
    font-size: 13px;
    padding: 0.25rem 0;
  }

  .vjs-tree-node {
    padding-left: 16px;
  }

  .vjs-tree-node__content {
    padding: 4px 0;
  }
}

/* Scrollbar styles */
::-webkit-scrollbar {
  width: 8px;
  height: 8px;
}

::-webkit-scrollbar-track {
  background: #f1f1f1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb {
  background: #c1c1c1;
  border-radius: 4px;
}

::-webkit-scrollbar-thumb:hover {
  background: #a8a8a8;
}
</style>
