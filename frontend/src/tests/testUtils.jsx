import { configureStore } from '@reduxjs/toolkit';
import { render } from '@testing-library/react';
import PropTypes from 'prop-types';
import { Provider } from 'react-redux';

import { authReducer } from '../features/auth/authSlice.js';
import { boardsReducer } from '../features/boards/boardsSlice.js';
import { cardsReducer } from '../features/cards/cardsSlice.js';
import { listsReducer } from '../features/lists/listsSlice.js';

export const createTestStore = (options = {}) => {
  const {
    preloadedState,
    reducer = {
      auth: authReducer,
      boards: boardsReducer,
      lists: listsReducer,
      cards: cardsReducer,
    },
  } = options;

  return configureStore({ reducer, preloadedState });
};

export const renderWithProviders = (ui, { store = createTestStore(), ...renderOptions } = {}) => {
  const Wrapper = ({ children }) => <Provider store={store}>{children}</Provider>;

  Wrapper.propTypes = {
    children: PropTypes.node.isRequired,
  };

  return {
    store,
    ...render(ui, { wrapper: Wrapper, ...renderOptions }),
  };
};
