import test from 'node:test';
import assert from 'node:assert/strict';
import {
  getFileStem,
  getFileExtension,
  isImageFile,
  isAnnotationFile,
  validateYoloContent,
  matchAndValidatePairs,
} from './fileValidation.ts';

// Helper mock file creator for node testing
function createMockFile(name: string, size = 1000): any {
  return {
    name,
    size,
    type: name.endsWith('.txt') ? 'text/plain' : 'image/png',
  };
}

test('getFileStem correctly parses filename base', () => {
  assert.equal(getFileStem('image_01.png'), 'image_01');
  assert.equal(getFileStem('dataset_dog.v2.jpg'), 'dataset_dog.v2');
  assert.equal(getFileStem('file_without_ext'), 'file_without_ext');
});

test('getFileExtension handles case and formats', () => {
  assert.equal(getFileExtension('test.PNG'), 'png');
  assert.equal(getFileExtension('image.jpeg'), 'jpeg');
  assert.equal(getFileExtension('annot.TXT'), 'txt');
});

test('isImageFile and isAnnotationFile correctly classify', () => {
  assert.equal(isImageFile({ name: 'cat.jpg' } as any), true);
  assert.equal(isImageFile({ name: 'cat.png' } as any), true);
  assert.equal(isImageFile({ name: 'cat.gif' } as any), false);
  assert.equal(isAnnotationFile({ name: 'cat.txt' } as any), true);
  assert.equal(isAnnotationFile({ name: 'cat.json' } as any), false);
});

test('validateYoloContent checks normalized coordinates and class ID', () => {
  const validYolo = `0 0.5 0.5 0.2 0.2\n1 0.1 0.2 0.3 0.4`;
  const resultValid = validateYoloContent(validYolo);
  assert.equal(resultValid.isValid, true);
  assert.equal(resultValid.boxCount, 2);

  const invalidCoords = `0 1.5 0.5 0.2 0.2`; // x > 1
  const resultInvalid = validateYoloContent(invalidCoords);
  assert.equal(resultInvalid.isValid, false);
});

test('matchAndValidatePairs succeeds with valid 1:1 image and annotation matching', () => {
  const images = [createMockFile('image_1.png'), createMockFile('image_2.jpg')];
  const annotations = [createMockFile('image_1.txt'), createMockFile('image_2.txt')];

  const { pairs, summary } = matchAndValidatePairs(images, annotations);
  assert.equal(summary.isValid, true);
  assert.equal(summary.matchedPairs, 2);
  assert.equal(pairs.length, 2);
  assert.equal(pairs[0].annotationFile?.name, 'image_1.txt');
});

test('matchAndValidatePairs flags missing annotations and stem mismatches', () => {
  const images = [createMockFile('image_1.png'), createMockFile('image_2.png')];
  const annotations = [createMockFile('image_1.txt'), createMockFile('unrelated.txt')];

  const { summary } = matchAndValidatePairs(images, annotations);
  assert.equal(summary.isValid, false);
  assert.equal(summary.unmatchedImages.includes('image_2.png'), true);
  assert.equal(summary.unmatchedAnnotations.includes('unrelated.txt'), true);
});

test('matchAndValidatePairs succeeds with image-only upload (annotation is optional)', () => {
  const images = [createMockFile('image_1.png'), createMockFile('image_2.png')];
  const { pairs, summary } = matchAndValidatePairs(images, []);

  assert.equal(summary.isValid, true);
  assert.equal(summary.hasAnnotations, false);
  assert.equal(pairs.length, 2);
});
