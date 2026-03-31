import { describe, it, expect, beforeEach } from 'vitest';
import { FeedbackCollector, FeedbackApplier } from '../index.js';

describe('FeedbackCollector', () => {
  let collector: FeedbackCollector;

  beforeEach(() => {
    collector = new FeedbackCollector('/tmp/ai4s-test-feedback');
  });

  it('should collect feedback', () => {
    const fb = collector.collectFeedback('correction', 'Fix the equation');
    expect(fb.id).toBeTruthy();
    expect(fb.type).toBe('correction');
    expect(fb.content).toBe('Fix the equation');
    expect(fb.applied).toBe(false);
  });

  it('should list feedbacks', () => {
    collector.collectFeedback('bug', 'Bug 1');
    collector.collectFeedback('suggestion', 'Suggestion 1');
    const feedbacks = collector.listFeedbacks();
    expect(feedbacks.length).toBeGreaterThanOrEqual(2);
  });

  it('should filter by type', () => {
    collector.collectFeedback('bug', 'Bug 1');
    collector.collectFeedback('suggestion', 'Suggestion 1');
    const bugs = collector.listFeedbacks({ type: 'bug' });
    expect(bugs.every(f => f.type === 'bug')).toBe(true);
  });

  it('should export as JSON', () => {
    collector.collectFeedback('rating', '5 stars');
    const json = collector.exportFeedbacks('json');
    const parsed = JSON.parse(json);
    expect(Array.isArray(parsed)).toBe(true);
  });

  it('should export as markdown', () => {
    collector.collectFeedback('rating', '5 stars');
    const md = collector.exportFeedbacks('markdown');
    expect(md).toContain('# Feedback Report');
  });
});

describe('FeedbackApplier', () => {
  it('should generate learning report', () => {
    const collector = new FeedbackCollector('/tmp/ai4s-test-feedback-applier');
    const applier = new FeedbackApplier(collector);
    const report = applier.generateLearningReport();
    expect(report).toContain('# Learning Report');
  });

  it('should apply feedback to knowledge', async () => {
    const collector = new FeedbackCollector('/tmp/ai4s-test-apply');
    const applier = new FeedbackApplier(collector);
    const fb = collector.collectFeedback('correction', 'Fix dimension');
    const result = await applier.applyToKnowledge(fb);
    expect(result).toBe(true);
  });
});
