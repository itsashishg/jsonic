<script setup lang="ts">
import { computed, ref } from 'vue'
import { RouterLink } from 'vue-router'

type PathSegment = string | number

type DiffStatus = 'added' | 'removed' | 'modified'

interface DiffEntry {
  id: string
  path: PathSegment[]
  status: DiffStatus
  valueLeft: unknown
  valueRight: unknown
}

type JsonLike = Record<string, unknown> | unknown[]

const leftInput = ref('')
const rightInput = ref('')
const leftError = ref<string | null>(null)
const rightError = ref<string | null>(null)
const diffEntries = ref<DiffEntry[]>([])
const hasCompared = ref(false)
const leftParsed = ref<unknown>(null)
const rightParsed = ref<unknown>(null)

let diffId = 0

const compareJson = () => {
  leftError.value = null
  rightError.value = null

  let parsedLeft: unknown
  let parsedRight: unknown

  try {
    parsedLeft = leftInput.value.trim() ? JSON.parse(leftInput.value) : null
  } catch (error) {
    leftError.value = `Invalid JSON: ${(error as Error).message}`
  }

  try {
    parsedRight = rightInput.value.trim() ? JSON.parse(rightInput.value) : null
  } catch (error) {
    rightError.value = `Invalid JSON: ${(error as Error).message}`
  }

  if (leftError.value || rightError.value) {
    diffEntries.value = []
    hasCompared.value = true
    return
  }

  leftParsed.value = parsedLeft ?? null
  rightParsed.value = parsedRight ?? null

  diffId = 0
  diffEntries.value = buildDiff(leftParsed.value, rightParsed.value)
  hasCompared.value = true
}

const diffSummary = computed(() =>
  diffEntries.value.reduce(
    (acc, entry) => {
      acc[entry.status] += 1
      return acc
    },
    { added: 0, removed: 0, modified: 0 } as Record<DiffStatus, number>,
  ),
)

const hasDiffs = computed(() => diffEntries.value.length > 0)

const statusIcon: Record<DiffStatus, string> = {
  added: '+',
  removed: '-',
  modified: '±',
}

const statusLabel: Record<DiffStatus, string> = {
  added: 'Key present on right only',
  removed: 'Key present on left only',
  modified: 'Value differs',
}

const pathToLabel = (path: PathSegment[]) => {
  if (!path.length) return '$'

  let label = '$'
  for (const segment of path) {
    if (typeof segment === 'number') {
      label = `${label}[${segment}]`
    } else {
      label = `${label}.${segment}`
    }
  }
  return label
}

const formatPreview = (value: unknown) => {
  if (value === undefined) return '—'
  if (typeof value === 'string') return value
  if (typeof value === 'number' || typeof value === 'boolean' || value === null) {
    return JSON.stringify(value)
  }
  return JSON.stringify(value, null, 2)
}

const stringifyJson = (value: unknown) => JSON.stringify(value ?? null, null, 2)

const cloneDeep = <T>(value: T): T => {
  if (value === undefined) return value
  if (typeof structuredClone === 'function') return structuredClone(value)
  return JSON.parse(JSON.stringify(value))
}

const isObjectLike = (value: unknown): value is Record<string, unknown> | unknown[] =>
  typeof value === 'object' && value !== null

const isDeepEqual = (left: unknown, right: unknown): boolean => {
  if (left === right) return true
  if (typeof left !== typeof right) return false
  if (!isObjectLike(left) || !isObjectLike(right)) return false
  if (Array.isArray(left) !== Array.isArray(right)) return false

  const keysLeft = Object.keys(left as Record<string, unknown>)
  const keysRight = Object.keys(right as Record<string, unknown>)
  if (keysLeft.length !== keysRight.length) return false

  return keysLeft.every((key) =>
    key in (right as Record<string, unknown>) &&
    isDeepEqual((left as Record<string, unknown>)[key], (right as Record<string, unknown>)[key]),
  )
}

const createEntry = (
  status: DiffStatus,
  path: PathSegment[],
  valueLeft: unknown,
  valueRight: unknown,
): DiffEntry => ({
  id: `${status}-${path.join('.')}-${diffId++}`,
  path,
  status,
  valueLeft,
  valueRight,
})

const buildDiff = (left: unknown, right: unknown, path: PathSegment[] = []): DiffEntry[] => {
  const leftUndefined = typeof left === 'undefined'
  const rightUndefined = typeof right === 'undefined'
  if (leftUndefined && rightUndefined) return []
  if (leftUndefined) return [createEntry('added', path, left, cloneDeep(right))]
  if (rightUndefined) return [createEntry('removed', path, cloneDeep(left), right)]
  if (isDeepEqual(left, right)) return []

  const leftObject = isObjectLike(left)
  const rightObject = isObjectLike(right)
  if (leftObject && rightObject) {
    if (Array.isArray(left) !== Array.isArray(right)) {
      return [createEntry('modified', path, cloneDeep(left), cloneDeep(right))]
    }

    const keys = new Set([
      ...Object.keys(left as Record<string, unknown>),
      ...Object.keys(right as Record<string, unknown>),
    ])

    const diffs: DiffEntry[] = []
    for (const key of keys) {
      const nextPath = [...path, Array.isArray(left) || Array.isArray(right) ? Number(key) : key]
      diffs.push(
        ...buildDiff(
          (left as Record<string, unknown>)[key as string],
          (right as Record<string, unknown>)[key as string],
          nextPath,
        ),
      )
    }
    return diffs
  }

  return [createEntry('modified', path, cloneDeep(left), cloneDeep(right))]
}

const createEmptyRoot = (path: PathSegment[]): JsonLike => {
  if (!path.length) return {}
  return typeof path[0] === 'number' ? [] : {}
}

const setValueAtPath = (input: unknown, path: PathSegment[], value: unknown): unknown => {
  if (!path.length) return cloneDeep(value)

  const [head, ...rest] = path
  const base = isObjectLike(input) || Array.isArray(input) ? cloneDeep(input) : createEmptyRoot(path)

  if (Array.isArray(base)) {
    const arrayBase = [...(base as unknown[])]
    const index = head as number
    const child = rest.length ? setValueAtPath(arrayBase[index], rest, value) : cloneDeep(value)
    arrayBase[index] = child
    return arrayBase
  }

  const objectBase = { ...(base as Record<string, unknown>) }
  const key = String(head)
  const child = rest.length ? setValueAtPath(objectBase[key], rest, value) : cloneDeep(value)
  objectBase[key] = child
  return objectBase
}

const removeValueAtPath = (input: unknown, path: PathSegment[]): unknown => {
  if (!path.length) return null
  if (!isObjectLike(input) && !Array.isArray(input)) return input

  const base = cloneDeep(input)
  const [head, ...rest] = path

  if (Array.isArray(base)) {
    const arrayBase = [...(base as unknown[])]
    const index = head as number
    if (rest.length === 0) {
      if (index >= 0 && index < arrayBase.length) arrayBase.splice(index, 1)
      return arrayBase
    }

    if (index >= 0 && index < arrayBase.length) {
      arrayBase[index] = removeValueAtPath(arrayBase[index], rest)
    }
    return arrayBase
  }

  const objectBase = { ...(base as Record<string, unknown>) }
  const key = String(head)

  if (!(key in objectBase)) {
    return objectBase
  }

  if (rest.length === 0) {
    const { [key]: removedValue, ...restObject } = objectBase
    void removedValue
    return restObject
  }

  objectBase[key] = removeValueAtPath(objectBase[key], rest)
  return objectBase
}

const applyChange = (entry: DiffEntry, direction: 'left' | 'right') => {
  if (!hasDiffs.value) return

  if (direction === 'left') {
    if (entry.status === 'removed') {
      leftParsed.value = removeValueAtPath(leftParsed.value, entry.path)
    } else {
      leftParsed.value = setValueAtPath(leftParsed.value, entry.path, entry.valueRight)
    }
  } else if (direction === 'right') {
    if (entry.status === 'added') {
      rightParsed.value = removeValueAtPath(rightParsed.value, entry.path)
    } else {
      rightParsed.value = setValueAtPath(rightParsed.value, entry.path, entry.valueLeft)
    }
  }

  if (direction === 'left' && (leftParsed.value as unknown) === undefined) leftParsed.value = null
  if (direction === 'right' && (rightParsed.value as unknown) === undefined) rightParsed.value = null

  leftInput.value = stringifyJson(leftParsed.value)
  rightInput.value = stringifyJson(rightParsed.value)

  diffId = 0
  diffEntries.value = buildDiff(leftParsed.value, rightParsed.value)
}
</script>

<template>
  <div class="compare-app">
    <header class="compare-header">
      <div>
        <h1>JSON Compare</h1>
        <p>Paste JSON on both sides and see the differences Git-style.</p>
      </div>
      <RouterLink to="/" class="back-link">← Back to viewer</RouterLink>
    </header>

    <section class="compare-body">
      <article class="json-panel">
        <header>
          <h2>Left JSON</h2>
        </header>
        <textarea v-model="leftInput" spellcheck="false" placeholder="Paste left JSON here..."></textarea>
        <p v-if="leftError" class="error">{{ leftError }}</p>
      </article>

      <div class="controls-panel">
        <button class="compare-btn" type="button" @click="compareJson">Compare</button>

        <div class="summary" v-if="hasCompared">
          <p v-if="hasDiffs">Differences: {{ diffEntries.length }}</p>
          <p v-else>No differences detected</p>
          <div v-if="hasDiffs" class="summary-counts">
            <span class="count added">+ {{ diffSummary.added }}</span>
            <span class="count removed">- {{ diffSummary.removed }}</span>
            <span class="count modified">± {{ diffSummary.modified }}</span>
          </div>
        </div>
      </div>

      <article class="json-panel">
        <header>
          <h2>Right JSON</h2>
        </header>
        <textarea v-model="rightInput" spellcheck="false" placeholder="Paste right JSON here..."></textarea>
        <p v-if="rightError" class="error">{{ rightError }}</p>
      </article>
    </section>

    <section class="diff-section">
      <header>
        <h2>Diff</h2>
        <p>Select a line to merge the change to either side.</p>
      </header>

      <div v-if="!hasCompared" class="diff-placeholder">
        <p>Run a compare to see the differences between both JSON documents.</p>
      </div>

      <div v-else-if="!hasDiffs" class="diff-placeholder">
        <p>No differences to display. The JSON documents are identical.</p>
      </div>

      <div v-else class="diff-list">
        <div
          v-for="entry in diffEntries"
          :key="entry.id"
          class="diff-row"
          :class="entry.status"
          :style="{ marginLeft: `${Math.max(0, entry.path.length - 1) * 16}px` }"
        >
          <div class="diff-main">
            <div class="diff-meta">
              <span class="diff-icon" :title="statusLabel[entry.status]">
                {{ statusIcon[entry.status] }}
              </span>
              <span class="diff-path">{{ pathToLabel(entry.path) }}</span>
            </div>
            <div class="diff-values" :class="entry.status">
              <div v-if="entry.status !== 'added'" class="value left">
                <span class="label">Left</span>
                <pre>{{ formatPreview(entry.valueLeft) }}</pre>
              </div>
              <div v-if="entry.status !== 'removed'" class="value right">
                <span class="label">Right</span>
                <pre>{{ formatPreview(entry.valueRight) }}</pre>
              </div>
            </div>
          </div>
          <div class="merge-actions">
            <button type="button" class="merge-btn to-left" @click.stop="applyChange(entry, 'left')">
              ← Merge to left
            </button>
            <button type="button" class="merge-btn to-right" @click.stop="applyChange(entry, 'right')">
              Merge to right →
            </button>
          </div>
        </div>
      </div>
    </section>
  </div>
</template>

<style>
:root {
  --added: #dcfce7;
  --removed: #fee2e2;
  --modified: #fef3c7;
  --border: #e2e8f0;
  --text: #1e293b;
  --muted: #64748b;
  --bg: #f8fafc;
  --panel-bg: #ffffff;
  --accent: #4f46e5;
}

.compare-app {
  min-height: 100vh;
  background: var(--bg);
  padding: 2rem;
  display: flex;
  flex-direction: column;
  gap: 2rem;
}

.compare-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.compare-header h1 {
  font-size: 1.75rem;
  margin: 0;
  color: var(--text);
}

.compare-header p {
  margin: 0.25rem 0 0;
  color: var(--muted);
  font-size: 0.95rem;
}

.back-link {
  color: var(--accent);
  font-weight: 600;
  text-decoration: none;
}

.back-link:hover {
  text-decoration: underline;
}

.compare-body {
  display: grid;
  grid-template-columns: 1fr 220px 1fr;
  gap: 1.5rem;
}

.json-panel {
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 12px;
  padding: 1rem;
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  box-shadow: 0 10px 30px rgba(15, 23, 42, 0.06);
}

.json-panel header h2 {
  margin: 0;
  font-size: 1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.json-panel textarea {
  min-height: 200px;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.9rem;
  line-height: 1.5;
  border-radius: 8px;
  border: 1px solid var(--border);
  padding: 0.75rem;
  resize: vertical;
  background: #f9fafb;
  color: var(--text);
}

.json-panel textarea:focus {
  outline: none;
  border-color: var(--accent);
  box-shadow: 0 0 0 3px rgba(79, 70, 229, 0.15);
  background: #fff;
}

.error {
  color: #dc2626;
  background: #fee2e2;
  padding: 0.5rem 0.75rem;
  border-radius: 6px;
  font-size: 0.85rem;
  border: 1px solid #fecaca;
}

.controls-panel {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 1.5rem;
  background: transparent;
}

.compare-btn {
  padding: 0.85rem 1.75rem;
  border-radius: 999px;
  border: none;
  background: var(--accent);
  color: white;
  font-size: 1rem;
  font-weight: 600;
  cursor: pointer;
  box-shadow: 0 10px 20px rgba(79, 70, 229, 0.2);
  transition: transform 0.15s ease, box-shadow 0.15s ease;
}

.compare-btn:hover {
  transform: translateY(-2px);
  box-shadow: 0 14px 24px rgba(79, 70, 229, 0.25);
}

.summary {
  text-align: center;
  color: var(--muted);
}

.summary-counts {
  display: flex;
  gap: 0.5rem;
  justify-content: center;
  margin-top: 0.5rem;
}

.count {
  padding: 0.25rem 0.65rem;
  border-radius: 999px;
  font-size: 0.8rem;
  font-weight: 600;
}

.count.added {
  background: var(--added);
  color: #166534;
}

.count.removed {
  background: var(--removed);
  color: #b91c1c;
}

.count.modified {
  background: var(--modified);
  color: #92400e;
}

.diff-section {
  background: var(--panel-bg);
  border: 1px solid var(--border);
  border-radius: 16px;
  padding: 1.5rem;
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  box-shadow: 0 12px 36px rgba(15, 23, 42, 0.08);
}

.diff-section header h2 {
  margin: 0;
  font-size: 1.1rem;
  text-transform: uppercase;
  letter-spacing: 0.08em;
  color: var(--muted);
}

.diff-section header p {
  margin: 0.25rem 0 0;
  color: var(--muted);
  font-size: 0.9rem;
}

.diff-placeholder {
  border: 1px dashed var(--border);
  border-radius: 12px;
  padding: 1.5rem;
  text-align: center;
  color: var(--muted);
  background: #f8fafc;
}

.diff-list {
  display: flex;
  flex-direction: column;
  gap: 1rem;
}

.diff-row {
  border-radius: 12px;
  padding: 1rem;
  border: 1px solid var(--border);
  display: flex;
  flex-direction: column;
  gap: 0.75rem;
  background: #fff;
  box-shadow: 0 8px 24px rgba(15, 23, 42, 0.06);
}

.diff-row.added {
  border-left: 6px solid #16a34a;
  background: var(--added);
}

.diff-row.removed {
  border-left: 6px solid #dc2626;
  background: var(--removed);
}

.diff-row.modified {
  border-left: 6px solid #d97706;
  background: var(--modified);
}

.diff-meta {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  font-weight: 600;
  color: var(--text);
}

.diff-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 32px;
  height: 32px;
  border-radius: 999px;
  background: rgba(15, 23, 42, 0.08);
  color: var(--text);
  font-size: 1rem;
}

.diff-path {
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.95rem;
}

.diff-values {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(180px, 1fr));
  gap: 1rem;
}

.diff-values .value {
  background: rgba(15, 23, 42, 0.04);
  border-radius: 8px;
  padding: 0.75rem;
  display: flex;
  flex-direction: column;
  gap: 0.5rem;
}

.diff-row.added .value.right {
  background: rgba(22, 163, 74, 0.12);
}

.diff-row.removed .value.left {
  background: rgba(220, 38, 38, 0.12);
}

.diff-row.modified .value {
  background: rgba(217, 119, 6, 0.12);
}

.diff-values .label {
  font-size: 0.75rem;
  font-weight: 700;
  text-transform: uppercase;
  color: var(--muted);
}

.diff-values pre {
  margin: 0;
  font-family: 'Fira Code', 'Courier New', monospace;
  font-size: 0.85rem;
  white-space: pre-wrap;
  word-break: break-word;
}

.merge-actions {
  display: flex;
  gap: 0.75rem;
  flex-wrap: wrap;
}

.merge-btn {
  border: none;
  border-radius: 8px;
  padding: 0.5rem 0.9rem;
  cursor: pointer;
  font-weight: 600;
  background: rgba(15, 23, 42, 0.1);
  color: var(--text);
  transition: background 0.15s ease, transform 0.15s ease;
}

.merge-btn:hover {
  background: rgba(15, 23, 42, 0.18);
  transform: translateY(-1px);
}

.merge-btn.to-left {
  background: #1d4ed8;
  color: white;
}

.merge-btn.to-left:hover {
  background: #1e40af;
}

.merge-btn.to-right {
  background: #0f766e;
  color: white;
}

.merge-btn.to-right:hover {
  background: #115e59;
}

@media (max-width: 1200px) {
  .compare-body {
    grid-template-columns: 1fr;
  }

  .controls-panel {
    flex-direction: row;
    justify-content: space-between;
    padding: 1rem;
    background: var(--panel-bg);
    border: 1px solid var(--border);
    border-radius: 12px;
    box-shadow: 0 6px 20px rgba(15, 23, 42, 0.05);
  }
}

@media (max-width: 768px) {
  .compare-app {
    padding: 1.25rem;
  }

  .compare-header {
    flex-direction: column;
    align-items: flex-start;
  }

  .compare-body {
    gap: 1rem;
  }

  .diff-row {
    padding: 0.75rem;
  }

  .diff-values {
    grid-template-columns: 1fr;
  }

  .merge-actions {
    flex-direction: column;
    align-items: stretch;
  }

  .merge-btn {
    width: 100%;
    text-align: center;
  }
}
</style>
