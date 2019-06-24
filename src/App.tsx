import React from 'react';
import './App.css';

import { AutoControlledComponent, AutoControlledManager } from '@andrewsantarin/auto-controlled';


type AppProps = {
  name?: string;
  defaultActive?: boolean;
  defaultLevel?: number;
  active?: boolean;
  level?: number;
};

type AppState = Required<
  Pick<AppProps, 'active' | 'level'>
>;

const appAutoControlledManager = AutoControlledManager<AppState, AppProps>(
  [
    'active',
    'level',
  ],
  {
    getInitialAutoControlledState() {
      return {
        active: false,
        level: 0,
      };
    }
  }
);

export class App extends React.Component<AppProps, AppState> implements AutoControlledComponent<AppState> {
  constructor(props: AppProps) {
    super(props);

    this.state = appAutoControlledManager.getInitialAutoControlledStateFromProps(props);
  }

  static getDerivedStateFromProps = appAutoControlledManager.getDerivedStateFromProps;
  public trySetState = appAutoControlledManager.trySetState;

  private handleClick = () => {
    this.trySetState({
      active: !this.state.active,
      level: this.state.level + 1,
    });
  }

  render() {
    const {
      active,
      level,
    } = this.state;

    return (
      <div>
        <button onClick={this.handleClick}>
          {level}
        </button>
        <div>  
          <label>
            <input type="checkbox" checked={active} />
            {' '}
            {active ? 'Active' : 'Inactive'}
          </label>
        </div>
      </div>
    );
  }
}
