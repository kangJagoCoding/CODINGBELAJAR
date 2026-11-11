import test from 'node:test';
import assert from 'node:assert/strict';
import {
  INITIAL_TECHNIQUES,
  buildPayload,
  EditActionType,
} from './augmentationSchema.ts';

test('INITIAL_TECHNIQUES defaults to all unselected and zero ranges', () => {
  for (const [key, tech] of Object.entries(INITIAL_TECHNIQUES)) {
    assert.equal(tech.enabled, false, `Technique ${key} should be disabled by default`);
    if (tech.action === 'rotate' && tech.range) {
      assert.equal(tech.range.min, 0);
      assert.equal(tech.range.max, 0);
    }
  }

  const { errors } = buildPayload(
    INITIAL_TECHNIQUES,
    10,
    'png',
    { enabled: false, probability: 0 }
  );
  assert.equal(errors.length > 0, true);
  assert.equal(errors[0].includes('No augmentation technique selected'), true);
});

test('buildPayload produces canonical metadata matching Go backend schema', () => {
  const techniques = structuredClone(INITIAL_TECHNIQUES);
  // Enable rotate and brightness
  techniques.rotate.enabled = true;
  techniques.rotate.range = { min: -5, max: 5 };
  techniques.randomScale.enabled = false;
  techniques.brightness.enabled = true;
  techniques.brightness.range = { min: -10, max: 10 };
  techniques.contrast.enabled = false;

  const { payload, errors } = buildPayload(
    techniques,
    10,
    'png',
    { enabled: true, probability: 0.25 }
  );

  assert.equal(errors.length, 0);
  assert.equal(payload.count, 10);
  assert.equal(payload.ext, 'png');
  assert.equal(payload.edits.length, 2);
  assert.equal(payload.edits[0].action, 'rotate');
  assert.deepEqual(payload.flip, { enabled: true, probability: 0.25 });
});

test('buildPayload enforces count >= number of edits', () => {
  const techniques = structuredClone(INITIAL_TECHNIQUES);
  // Enable 4 edits
  techniques.rotate.enabled = true;
  techniques.randomScale.enabled = true;
  techniques.brightness.enabled = true;
  techniques.contrast.enabled = true;

  // Set count to 2 (less than 4)
  const { errors } = buildPayload(
    techniques,
    2,
    'png',
    { enabled: false, probability: 0 }
  );

  assert.equal(errors.length > 0, true);
  assert.equal(errors[0].includes('must be at least the number of selected edits'), true);
});

test('buildPayload handles randomCrop and resize correctly', () => {
  const techniques = structuredClone(INITIAL_TECHNIQUES);
  Object.keys(techniques).forEach(k => {
    techniques[k as EditActionType].enabled = false;
  });

  techniques.randomCrop.enabled = true;
  techniques.randomCrop.randomCrop = {
    width: { min: 0.7, max: 1.0 },
    height: { min: 0.7, max: 1.0 },
  };

  techniques.resize.enabled = true;
  techniques.resize.resize = { width: 800, height: 0 };

  const { payload, errors } = buildPayload(
    techniques,
    10,
    'jpeg',
    { enabled: false, probability: 0 }
  );

  assert.equal(errors.length, 0);
  assert.equal(payload.edits.length, 2);
  const crop = payload.edits.find(e => e.action === 'randomCrop') as any;
  assert.ok(crop);
  assert.equal(crop.randomCrop.width.min, 0.7);
  assert.equal(crop.randomCrop.height.max, 1.0);

  const resize = payload.edits.find(e => e.action === 'resize') as any;
  assert.ok(resize);
  assert.equal(resize.resize.width, 800);
  assert.equal(resize.resize.height, 0);
});
