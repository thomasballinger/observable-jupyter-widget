// Copyright (c) Jupyter Development Team.
// Distributed under the terms of the Modified BSD License.

// Add any needed widget imports here (or from controls)
// import {} from '@jupyter-widgets/base';

import { createTestModel } from './utils';

import { ObservableWidgetModel } from '..';

describe('Example', () => {
  describe('ObservableWidgetModel', () => {
    it('should be createable', () => {
      const model = createTestModel(ObservableWidgetModel);
      expect(model).toBeInstanceOf(ObservableWidgetModel);
      expect(model.get('value')).toEqual(undefined);
    });

    it('should be createable with a value', () => {
      const state = { value: 'Foo Bar!' };
      const model = createTestModel(ObservableWidgetModel, state);
      expect(model).toBeInstanceOf(ObservableWidgetModel);
      expect(model.get('value')).toEqual('Foo Bar!');
    });
  });
});
