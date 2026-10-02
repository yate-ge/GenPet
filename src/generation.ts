import { createHash } from 'node:crypto';
import { text } from './core.js';
import { readPrompt, readUnits } from './prompts.js';
import { pendingFor } from './story.js';
import type { Store, GenerationStep } from './store.js';

export interface UnitResult {
  inputRefs: string[];
  result: Record<string, unknown>;
}
const object = (value: unknown): value is Record<string, unknown> =>
  !!value && typeof value === 'object' && !Array.isArray(value);
function definition(unit: string) {
  const units = readUnits();
  if (!Object.hasOwn(units, unit)) throw new Error(`Unknown generation unit: ${unit}`);
  return units[unit];
}
function references(value: unknown): string[] {
  if (!Array.isArray(value)) throw new Error('inputRefs must be an array');
  return value.map(ref => text(ref, 'input reference'));
}
/** Only checks the observable data contract; semantic correctness needs separate evidence. */
export function validateUnitResult(unit: string, input: unknown): UnitResult {
  const contract = definition(unit);
  if (!object(input) || !object(input.result)) throw new Error('A unit result requires an object envelope and result');
  const inputRefs = references(input.inputRefs),
    result = input.result;
  for (const [field, type] of Object.entries(contract.result)) {
    const value = result[field];
    const valid =
      type === 'string'
        ? typeof value === 'string' && !!value.trim()
        : type === 'array'
          ? Array.isArray(value)
          : type === 'object'
            ? object(value)
            : type === 'nullable-string'
              ? value === null || (typeof value === 'string' && !!value.trim())
              : type === 'nullable-object'
                ? value === null || object(value)
                : false;
    if (!Object.hasOwn(result, field) || !valid) throw new Error(`${unit}.${field} requires ${type}`);
  }
  for (const [field, choices] of Object.entries(contract.choices ?? {}))
    if (!choices.includes(result[field] as string)) throw new Error(`Invalid ${unit}.${field}`);
  return { inputRefs, result };
}
export function unitRequest(unit: string, fixture: unknown) {
  const contract = definition(unit);
  if (!object(fixture) || !object(fixture.inputs)) throw new Error('A unit fixture requires inputs');
  for (const field of contract.inputs)
    if (!Object.hasOwn(fixture.inputs, field)) throw new Error(`Missing ${unit} input: ${field}`);
  const inputRefs = references(fixture.inputRefs ?? []);
  const prompt = [
    `这是独立单元测试，只执行 ${unit}。下游流程只作背景，不执行其他单元。只使用下面提供的输入与真实文件；不得补查真实用户资料、操作 Pet/Avatar、创建调度或执行完整生命周期。需要图像检查时实际查看输入文件。`,
    readPrompt('meta'),
    readPrompt(unit),
    `返回一个 JSON 对象：inputRefs 为输入引用列表，result 为本单元结果。所需字段与类型：${JSON.stringify(contract.result)}。${contract.choices ? `工程取值：${JSON.stringify(contract.choices)}。` : ''}可增加字段，内容保持开放。不要输出额外的流程说明。`,
    `固定输入：${JSON.stringify({ inputRefs, inputs: fixture.inputs }, null, 2)}`,
  ].join('\n\n');
  return { unit, inputRefs, prompt, promptHash: createHash('sha256').update(prompt).digest('hex') };
}
function canonical(value: unknown): string {
  return JSON.stringify(value, (_, item) =>
    object(item)
      ? Object.fromEntries(
          Object.keys(item)
            .sort()
            .map(key => [key, item[key]]),
        )
      : item,
  );
}
/** Append-only generation artifacts, tied to one pending or completed story. Never advances it. */
export async function recordStep(store: Store, operationId: string, unit: string, input: unknown) {
  const output = validateUnitResult(unit, input);
  return store.transaction(state => {
    const owner =
      state.pending?.id === operationId
        ? pendingFor(state, operationId)
        : state.stories.find(story => story.id === operationId && story.petId === state.pet?.id);
    if (!owner) throw new Error('Generation step belongs to another or missing story');
    const id = `step-${createHash('sha256')
      .update(canonical([operationId, unit, output]))
      .digest('hex')
      .slice(0, 24)}`;
    const steps = (owner.steps ??= []),
      previous = steps.find(step => step.id === id);
    if (previous) return previous;
    const step: GenerationStep = { id, unit, at: Date.now(), ...output };
    steps.push(step);
    return step;
  });
}
