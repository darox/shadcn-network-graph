# Lessons — shadcn Network Graph

Read this before writing any code. These rules come from hard-won experience. Breaking any of them produces wrong output.

## shadcn Conventions

### L-001: Never inject `<style>` tags
Every visual decision is a Tailwind utility class via `cn()`. Zero injected CSS.
If you're about to write a `<style>` tag — stop. Find the Tailwind equivalent.

### L-002: Always forward `className`
Every component destructures `{ className, ...props }` and passes `cn("base", className)` to the root element. No exceptions.

### L-003: Always add `data-slot`
Every element gets `data-slot="network-graph-[name]"`.
Enables `[&_[data-slot=...]]:` targeting from parent components.

### L-004: TypeScript interfaces extend HTML element types
- SVG components: `extends React.SVGAttributes<SVGGElement>` etc.
- HTML components: `extends React.HTMLAttributes<HTMLDivElement>` etc.
This makes `{...props}` work and allows any native attribute to be passed.

### L-005: `React.forwardRef` + `displayName` on everything
Every exported component uses `React.forwardRef` and sets `.displayName = "ComponentName"`.

### L-006: Use actual shadcn `<Button>` — never a custom one
`import { Button } from "@/components/ui/button"` and use `variant="outline" size="icon"`.

## SVG-Specific Rules

### L-007: SVG `<marker>` fill cannot use CSS custom properties reliably
Use a CSS class on the inner `<path>` (e.g. `className="fill-border"`).
Two separate markers = two separate `<marker>` elements (normal + highlighted).

### L-008: Tailwind `shadow-*` does not apply to SVG elements
Use inline style: `filter: "drop-shadow(0 1px 2px hsl(var(--foreground) / 0.06))"`.

### L-009: Tailwind fill/stroke classes DO work on SVG elements
`fill-card`, `fill-muted`, `stroke-border`, `stroke-ring` all work on SVG `<rect>`, `<line>`, `<path>`.

### L-010: Edges must exit from node border, not center
Compute bounding box intersection: `t = min(hw/|ux|, hh/|uy|)`.
Offset entry point by arrow marker size (6px) so line doesn't overlap arrowhead.

## Performance Rules

### L-011: Batch simulation ticks — don't setState every frame
`if (frame % 8 === 0) onTick([...pos])` — update React every 8 frames only.

### L-012: Memoize highlighted edges
`useMemo(() => new Set(...), [selected, edges])` — recomputes only on selection change.

### L-013: `useCallback` on all event handlers
All interaction handlers passed to SVG children must be stable references.

## Interaction Rules

### L-014: Drag delta must be divided by viewport scale
```ts
const dx = (ev.clientX - ref.sx) / tf.scale
```
Without this, nodes move incorrectly when zoomed in or out.

### L-015: Zoom toward cursor, not canvas center
```ts
const ns = clamp(t.scale * delta, 0.2, 3)
return {
  scale: ns,
  x: mx - (mx - t.x) * (ns / t.scale),
  y: my - (my - t.y) * (ns / t.scale),
}
```
Always use this formula. Do not improvise.

### L-016: Keep simulation state outside React
The force simulation's internal `pos[]` array is mutable and lives outside React state.
Only batched/final positions get committed via `setPositions()`.
Putting velocity state in `useState` causes constant re-render loops.

## Quality Gate Script
Run this after implementing to verify compliance:

```python
import re

with open("components/ui/network-graph.tsx") as f:
    src = f.read()

checks = [
    ("No injected <style> tags",        len(re.findall(r'<style', src)) == 0),
    ("cn() used",                        len(re.findall(r'\bcn\(', src)) >= 5),
    ("data-slot attributes",             len(re.findall(r'data-slot=', src)) >= 8),
    ("displayName on all components",    len(re.findall(r'\.displayName\s*=', src)) == 5),
    ("TS interfaces extend HTML types",  len(re.findall(r'extends React\.(SVGAttributes|HTMLAttributes)', src)) >= 4),
    ("use client directive",             '"use client"' in src),
    ("No hardcoded hex colors",          len(re.findall(r'(?<!\w)#[0-9a-fA-F]{3,6}(?!\w)', src)) == 0),
    ("interactive prop present",         len(re.findall(r'\binteractive\b', src)) >= 6),
    ("onSelectionChange present",        len(re.findall(r'onSelectionChange', src)) >= 2),
    ("useMemo present",                  len(re.findall(r'useMemo', src)) >= 2),
    ("useCallback present",              len(re.findall(r'useCallback', src)) >= 3),
    ("Simulation cleanup",               "return runSimulation" in src),
]

all_pass = True
for name, passed in checks:
    print(f"{'PASS' if passed else 'FAIL'}  {name}")
    if not passed: all_pass = False

print()
print("ALL CHECKS PASS" if all_pass else "FAILED — fix before marking done")
```
