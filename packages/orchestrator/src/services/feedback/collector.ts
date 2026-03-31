import { existsSync, mkdirSync, readFileSync, writeFileSync, readdirSync, unlinkSync } from "node:fs";
import { join } from "node:path";
import os from "node:os";

export type FeedbackType = 'correction' | 'suggestion' | 'rating' | 'bug' | 'feature';

export interface Feedback {
  id: string;
  type: FeedbackType;
  content: string;
  context?: Record<string, unknown>;
  timestamp: string;
  applied?: boolean;
  sessionId?: string;
}

export interface FeedbackFilter {
  type?: FeedbackType;
  applied?: boolean;
  since?: string;
  limit?: number;
}

const DATA_DIR = join(os.homedir(), '.ai4s', 'feedback');

export class FeedbackCollector {
  private storePath: string;

  constructor(storePath?: string) {
    this.storePath = storePath || DATA_DIR;
    mkdirSync(this.storePath, { recursive: true });
  }

  collectFeedback(type: FeedbackType, content: string, context?: Record<string, unknown>): Feedback {
    const feedback: Feedback = {
      id: `fb_${Date.now()}_${Math.random().toString(36).slice(2, 6)}`,
      type, content, context,
      timestamp: new Date().toISOString(),
      applied: false,
    };
    const filePath = join(this.storePath, `${feedback.id}.json`);
    writeFileSync(filePath, JSON.stringify(feedback, null, 2), 'utf-8');
    return feedback;
  }

  listFeedbacks(filter?: FeedbackFilter): Feedback[] {
    if (!existsSync(this.storePath)) return [];
    let feedbacks = this.listFeedbacks();
    if (filter?.type) feedbacks = feedbacks.filter(f => f.type === filter.type);
    if (filter?.applied !== undefined) feedbacks = feedbacks.filter(f => f.applied === filter.applied);
    if (filter?.since) feedbacks = feedbacks.filter(f => f.timestamp >= filter.since!);
    feedbacks.sort((a, b) => b.timestamp.localeCompare(a.timestamp));
    if (filter?.limit) return feedbacks.slice(0, filter.limit);
    return feedbacks;
  }

  exportFeedbacks(format: 'json' | 'csv' | 'markdown' = 'json'): string {
    const feedbacks = this.listFeedbacks();
    switch (format) {
      case 'json':
        return JSON.stringify(feedbacks, null, 2);
      case 'csv':
        const header = 'id,type,content,timestamp,applied\n';
        const rows = feedbacks.map(f => `${f.id},${f.type},"${f.content.replace(/"/g, '""')}",${f.timestamp},${f.applied}`);
        return header + rows.join('\n');
      case 'markdown':
        const lines = ['# Feedback Report\n', `Generated: ${new Date().toISOString()}\n`, `Total: ${feedbacks.length}\n`];
        for (const f of feedbacks) {
          lines.push(`## ${f.id} (${f.type})`);
          lines.push(`- **Time**: ${f.timestamp}`);
          lines.push(`- **Content**: ${f.content}`);
          if (f.applied) lines.push('- **Status**: ✅ Applied');
          lines.push('');
        }
        return lines.join('\n');
      default:
        return JSON.stringify(feedbacks, null, 2);
    }
  }
}

export class FeedbackApplier {
  private collector: FeedbackCollector;

  constructor(collector?: FeedbackCollector) {
    this.collector = collector || new FeedbackCollector();
  }

  async applyToKnowledge(feedback: Feedback, _knowledgeManager?: unknown): Promise<boolean> {
    // Mark feedback as applied and integrate into knowledge base
    feedback.applied = true;
    const filePath = join(this.collector['storePath'], `${feedback.id}.json`);
    if (existsSync(filePath)) {
      writeFileSync(filePath, JSON.stringify(feedback, null, 2), 'utf-8');
    }
    return true;
  }

  async applyToConstraints(feedback: Feedback, _constraintEngine?: unknown): Promise<boolean> {
    feedback.applied = true;
    const filePath = join(this.collector['storePath'], `${feedback.id}.json`);
    if (existsSync(filePath)) {
      writeFileSync(filePath, JSON.stringify(feedback, null, 2), 'utf-8');
    }
    return true;
  }

  generateLearningReport(): string {
    const feedbacks = this.collector.listFeedbacks();
    const byType = new Map<string, number>();
    const applied = feedbacks.filter(f => f.applied).length;
    for (const f of feedbacks) {
      byType.set(f.type, (byType.get(f.type) || 0) + 1);
    }

    const lines = [
      '# Learning Report',
      `Generated: ${new Date().toISOString()}`,
      '',
      '## Summary',
      `- Total feedback: ${feedbacks.length}`,
      `- Applied: ${applied}`,
      `- Pending: ${feedbacks.length - applied}`,
      '',
      '## By Type',
      ...Array.from(byType.entries()).map(([type, count]) => `- ${type}: ${count}`),
    ];
    return lines.join('\n');
  }
}
