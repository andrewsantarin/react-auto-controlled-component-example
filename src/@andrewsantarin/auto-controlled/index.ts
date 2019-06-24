import { Component, GetDerivedStateFromProps } from 'react';

import isFunction from 'lodash/isFunction';
import isUndefined from 'lodash/isUndefined';


// TODO:
// Implement a similar solution for the `useState` hook. Let's call it `useTryState`.


// NOTE:
// The source code is mostly shamelessly cloned from '@stardust-ui/react'.
// After attempting to build a library from Stardust UI React as a dependency, we figured out that it's impossible to use it.
// There are coupled dependencies we don't really want, which are required in order to consume similar code.
//
// Alternatives exist in the form of 'semantic-ui-react', the grandfather of the logic, but unfortunately isn't exposed publicly.
// Therefore, that version is similarly unusable.


const getDefaultPropName = function getDefaultPropName(prop: string) {
  return `default${prop[0].toUpperCase() + prop.slice(1)}`;
};

const getAutoControlledStateValue = function getAutoControlledStateValue<Props extends any, State extends any = undefined>(
  propName: string,
  props: Props,
  state: State,
  includeDefaults: boolean = false
) {
  // regular props
  const propValue = props[propName];
  if (propValue !== undefined) return propValue;

  if (includeDefaults) {
    // defaultProps
    const defaultProp = props[getDefaultPropName(propName)];
    if (defaultProp !== undefined) return defaultProp;

    // initial state - state may be null or undefined
    if (state) {
      const initialState = state[propName];
      if (initialState !== undefined) return initialState;
    }
  }

  // React doesn't allow changing from uncontrolled to controlled components,
  // default checked/value if they were not present.
  if (propName === 'checked') return false;
  if (propName === 'value') return props.multiple ? [] : '';

  // otherwise, undefined
};

type AnyObject = {
  [key: string]: any;
};

export type AutoControlledComponent<State extends AnyObject> = {
  /**
   * Safely attempt to set state for props that might be controlled by the user.
   * Second argument is a state object that is always passed to setState.
   *
   * @param {object} maybeState State that corresponds to controlled props.
   * @param {object} [state] Actual state, useful when you also need to setState.
   * @param {object} callback Callback which is called after setState applied.
   */
  trySetState: (maybeState: Partial<State>, callback?: () => void) => void;
}

export type AutoControlledManager<
  State extends AnyObject,
  Props extends Partial<State>
  > = AutoControlledComponent<State> & {
    /**
     * Builds state from new props & old state whenever the component updates,
     * including during the component's initial render itself.
     *
     * @param {object} nextProps New props.
     * @param {object} prevState Old state.
     * @returns {(object | null)} New state object if the state depends on props or
     * `null` if there is nothing to derive.
     */
    getDerivedStateFromProps: GetDerivedStateFromProps<Props, State>;
    /**
     * Builds initial state from props that might be controlled by the user.
     *
     * @param {object} props Props possibly controlled by the user.
     * @returns {object} Full initial state of the component.
     */
    getInitialAutoControlledStateFromProps: (props: Props) => State;
  }

export const AutoControlledManager = function AutoControlledManager<
  State extends AnyObject,
  Props extends Partial<State>
>(
  autoControlledStateKeys: (keyof State)[],
  propsToStateDerivers: {
    getInitialAutoControlledState?: (props: Props) => State;
    getAutoControlledStateFromProps?: (props: Props, state: State) => Partial<State>;
  } = {}
): AutoControlledManager<State, Props> {
  const {
    getInitialAutoControlledState,
    getAutoControlledStateFromProps,
  } = propsToStateDerivers;

  return Object.freeze({
    getDerivedStateFromProps(nextProps, prevState) {
      // Solve the next state for autoControlledStateKeys
      const newStateFromProps = autoControlledStateKeys.reduce<Partial<State>>((acc, prop) => {
        // if next is defined then use its value
        if (!isUndefined(nextProps[prop])) {
          acc[prop] = nextProps[prop];
        }

        return acc;
      }, {});

      // Due to the inheritance of the AutoControlledComponent we should call its
      // getAutoControlledStateFromProps() and merge it with the existing state
      if (isFunction(getAutoControlledStateFromProps)) {
        const computedState = getAutoControlledStateFromProps(nextProps, {
          ...prevState,
          ...newStateFromProps,
        });

        // We should follow the idea of getDerivedStateFromProps() and return only modified state
        return {
          ...newStateFromProps,
          ...computedState,
        };
      }

      return newStateFromProps;
    },

    getInitialAutoControlledStateFromProps(props: Props) {
      const state = isFunction(getInitialAutoControlledState) ? getInitialAutoControlledState(props) : {} as State;
      const initialAutoControlledState = autoControlledStateKeys.reduce<Partial<State>>((acc, prop) => {
        acc[prop] = getAutoControlledStateValue(prop as string, props, state, true);

        return acc;
      }, {});

      const initialState: State = {
        ...state,
        ...initialAutoControlledState,
      };

      return initialState;
    },

    trySetState(maybeState: Partial<State>, callback?: () => void) {
      type Scope = Component<Props, State>;

      const newState = Object.keys(maybeState).reduce<typeof maybeState>((acc, prop: keyof Partial<State>) => {
        // ignore props defined by the parent
        if ((this as any as Scope).props[prop] !== undefined) {
          return acc;
        }

        acc[prop] = maybeState[prop];

        return acc;
      }, {});

      if (Object.keys(newState).length === 0) {
        return;
      }

      (this as any as Scope).setState(
        newState as Pick<State, keyof typeof newState>,
        callback
      );
    },
  });
}
