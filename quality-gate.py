import re

with open("components/ui/network-graph.tsx") as f:
    src = f.read()

checks = [
    ("No injected <style> tags",        len(re.findall(r'<style', src)) == 0),
    ("cn() used",                        len(re.findall(r'\bcn\(', src)) >= 5),
    ("data-slot attributes",             len(re.findall(r'data-slot=', src)) >= 8),
    ("displayName on all components",    len(re.findall(r'\.displayName\s*=', src)) == 6),
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
