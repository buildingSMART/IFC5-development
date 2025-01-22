import * as fs from 'fs';
import * as path from 'path';
import * as glob from 'glob';
import { compose } from './compose';
import { compose2 } from './compose2';

let { describe, it } = global;
let composeFuncs = {'compose': compose, 'compose2': compose2};

const fixtureDirectories = glob.sync('test/fixtures/*');

const replacer = (key, value) => {
  if (value instanceof Object && !(value instanceof Array)) {
    return Object.keys(value)
      .sort()
      .filter(k => k !== 'def')
      .filter(k => k !== 'attributes' || Object.keys(value.attributes || {}).length > 0)
      .filter(k => k !== 'children' || (value.children || []).length > 0)
      .reduce((sorted, key) => {
        sorted[key] = value[key];
        return sorted 
      }, {});
  } else if (value instanceof Array) {
    return value.toSorted((a, b) => {
      return a.name < b.name ? -1 : a.name > b.name ? 1 : 0;
    })
  } else {
    return value;
  }
}

describe('Composition', () => {
  describe.each(Object.keys(composeFuncs))('composition function: %s', (compFunc) => {
    it.each(fixtureDirectories)('fixture: %s', (fixtureDir) => {
      const inputFiles = glob.sync(`${fixtureDir.replace(/\\/g, '/')}/input_*.ifcx`);
      expect(inputFiles.length).toBeGreaterThan(0);
      const inputs = inputFiles.map((inputFile) => {
        return JSON.parse(fs.readFileSync(inputFile, 'utf8'));
      });      
      const actualResult = JSON.stringify(composeFuncs[compFunc](inputs), replacer, 1);
      const outputFile = path.join(fixtureDir, 'output.json');
      const expectedOutput = JSON.stringify(JSON.parse(fs.readFileSync(outputFile, 'utf8')), replacer, 1);
      expect(actualResult).toEqual(expectedOutput);
    });
  });
});