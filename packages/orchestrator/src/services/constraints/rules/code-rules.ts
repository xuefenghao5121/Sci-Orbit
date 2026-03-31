// Code constraint rules

export interface CodeIssue {
  rule: string;
  message: string;
  line?: number;
  severity: 'error' | 'warning' | 'info';
}

export interface CodeRuleCheckResult {
  passed: boolean;
  issues: CodeIssue[];
}

const SECURITY_PATTERNS: Array<{ pattern: RegExp; rule: string; message: string; severity: CodeIssue['severity'] }> = [
  { pattern: /\beval\s*\(/, rule: 'no-eval', message: 'Avoid eval() - use safe alternatives', severity: 'error' },
  { pattern: /\bexec\s*\(/, rule: 'no-exec', message: 'Avoid exec() - use safe alternatives', severity: 'error' },
  { pattern: /subprocess\.call\(/, rule: 'subprocess-call', message: 'Use subprocess.run() instead of subprocess.call()', severity: 'warning' },
  { pattern: /os\.system\s*\(/, rule: 'os-system', message: 'Avoid os.system() - use subprocess', severity: 'warning' },
  { pattern: /pickle\.loads?\(/, rule: 'pickle-unsafe', message: 'pickle is unsafe for untrusted data', severity: 'warning' },
  { pattern: /yaml\.load\([^)]*(?!Loader)/, rule: 'yaml-unsafe', message: 'Use yaml.safe_load() instead of yaml.load()', severity: 'error' },
  { pattern: /__import__\s*\(/, rule: 'dynamic-import', message: 'Avoid dynamic imports', severity: 'warning' },
];

const QUALITY_PATTERNS: Array<{ pattern: RegExp; rule: string; message: string; severity: CodeIssue['severity'] }> = [
  { pattern: /except\s*:/, rule: 'bare-except', message: 'Avoid bare except - specify exception type', severity: 'warning' },
  { pattern: /print\s*\(/, rule: 'print-debugging', message: 'Remove print statements - use logging', severity: 'info' },
  { pattern: /TODO|FIXME|HACK|XXX/, rule: 'todos', message: 'Code contains TODO/FIXME markers', severity: 'info' },
  { pattern: /global\s+\w+/, rule: 'global-var', message: 'Avoid global variables', severity: 'warning' },
];

export function checkCodeSecurity(code: string): CodeRuleCheckResult {
  const issues: CodeIssue[] = [];
  const lines = code.split('\n');
  for (const pat of SECURITY_PATTERNS) {
    lines.forEach((line, i) => {
      if (!line.trimStart().startsWith('#') && pat.pattern.test(line)) {
        issues.push({ rule: pat.rule, message: pat.message, line: i + 1, severity: pat.severity });
      }
    });
  }
  return { passed: issues.filter(i => i.severity === 'error').length === 0, issues };
}

export function checkCodeQuality(code: string): CodeRuleCheckResult {
  const issues: CodeIssue[] = [];
  const lines = code.split('\n');
  for (const pat of QUALITY_PATTERNS) {
    lines.forEach((line, i) => {
      if (!line.trimStart().startsWith('#') && pat.pattern.test(line)) {
        issues.push({ rule: pat.rule, message: pat.message, line: i + 1, severity: pat.severity });
      }
    });
  }
  return { passed: issues.filter(i => i.severity === 'error').length === 0, issues };
}

export function runAllCodeChecks(code: string): CodeRuleCheckResult {
  const security = checkCodeSecurity(code);
  const quality = checkCodeQuality(code);
  const allIssues = [...security.issues, ...quality.issues];
  return {
    passed: allIssues.filter(i => i.severity === 'error').length === 0,
    issues: allIssues,
  };
}
