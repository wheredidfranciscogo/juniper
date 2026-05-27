import { render, screen, fireEvent } from '@testing-library/react-native';
import * as Haptics from 'expo-haptics';

import { WaterButton } from '../WaterButton';

describe('WaterButton', () => {
  beforeEach(() => jest.clearAllMocks());

  it('renders the idle "Water <name>" label', () => {
    render(<WaterButton name="Marcel" watered={false} onWater={jest.fn()} />);
    expect(screen.getByText('Water Marcel')).toBeTruthy();
  });

  it('fires onWater and a selection haptic on press', () => {
    const onWater = jest.fn();
    render(<WaterButton name="Marcel" watered={false} onWater={onWater} />);
    fireEvent.press(screen.getByText('Water Marcel'));
    expect(onWater).toHaveBeenCalledTimes(1);
    expect(Haptics.selectionAsync).toHaveBeenCalledTimes(1);
  });

  it('shows the watered label and ignores presses once watered', () => {
    const onWater = jest.fn();
    render(<WaterButton name="Marcel" watered wateredLabel="Tuesday" onWater={onWater} />);
    expect(screen.getByText('Watered, Tuesday.')).toBeTruthy();
    fireEvent.press(screen.getByText('Watered, Tuesday.'));
    expect(onWater).not.toHaveBeenCalled();
  });
});
