import { handleTabPress, type TabPressState, type TabPressNavigation } from '../tab-press';

function makeState(activeIndex = 0): TabPressState {
  return {
    index: activeIndex,
    routes: [
      { key: 'today-k', name: 'today', params: undefined },
      { key: 'garden-k', name: 'garden', params: { from: 'tab-bar' } },
      { key: 'log-k', name: 'log', params: undefined },
      { key: 'you-k', name: 'you', params: undefined },
    ],
  } as unknown as TabPressState;
}

function makeNav(opts: { defaultPrevented?: boolean } = {}): TabPressNavigation & {
  emit: jest.Mock;
  navigate: jest.Mock;
} {
  return {
    emit: jest.fn().mockReturnValue({ defaultPrevented: opts.defaultPrevented ?? false }),
    navigate: jest.fn(),
  } as unknown as TabPressNavigation & { emit: jest.Mock; navigate: jest.Mock };
}

describe('handleTabPress', () => {
  it('emits tabPress with the route key (not the name) and navigates by route name', () => {
    const state = makeState(0);
    const navigation = makeNav();

    handleTabPress('garden', state, navigation);

    expect(navigation.emit).toHaveBeenCalledTimes(1);
    const emitted = navigation.emit.mock.calls[0][0];
    expect(emitted.type).toBe('tabPress');
    expect(emitted.target).toBe('garden-k'); // key, not 'garden'
    expect(emitted.canPreventDefault).toBe(true);

    expect(navigation.navigate).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).toHaveBeenCalledWith('garden', { from: 'tab-bar' });
  });

  it('does nothing for an unknown route name', () => {
    const state = makeState(0);
    const navigation = makeNav();

    handleTabPress('settings', state, navigation);

    expect(navigation.emit).not.toHaveBeenCalled();
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('skips navigation when the pressed tab is already active', () => {
    const state = makeState(0); // today is active
    const navigation = makeNav();

    handleTabPress('today', state, navigation);

    // Event still fires (so screen-level tabPress listeners run),
    // but no navigation action is dispatched.
    expect(navigation.emit).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });

  it('skips navigation when a tabPress listener calls preventDefault', () => {
    const state = makeState(0);
    const navigation = makeNav({ defaultPrevented: true });

    handleTabPress('garden', state, navigation);

    expect(navigation.emit).toHaveBeenCalledTimes(1);
    expect(navigation.navigate).not.toHaveBeenCalled();
  });
});
