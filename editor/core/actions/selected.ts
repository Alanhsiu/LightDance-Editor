import { registerActions } from "../registerActions";
// types
import { State, SelectedType, PartPayloadType } from "../models";

const actions = registerActions({
  /**
   * Set the 'selected' object
   * @param {State} state
   * @param {SelectedType} payload - object containing dancer names as keys selected parts as values
   */
  setSelected: (state: State, payload: SelectedType) => {
    state.selected = payload;
  },

  /**
   * Set selected dancer
   * @param {State} state
   * @param {string[]} payload - array of dancer's name
   */
  setSelectedDancers: (state: State, payload: string[]) => {
    const dancers = payload;
    Object.keys(state.selected).forEach((dancer) => {
      state.selected[dancer].selected = dancers.includes(dancer);
    });
  },

  /**
   * Set selected dancer
   * @param {State} state
   * @param {PartPayloadType[]} payload - array of dancer's name
   */
  setSelectedParts: (state: State, payload: PartPayloadType[]) => {
    const parts = payload;
    parts.forEach(({ dancer, parts }) => {
      state.selected[dancer].parts = parts as string[];
    });
  },

  /**
   * toggle one in selected array
   * @param {State} state
   * @param {string} payload - one of dancer's name
   */
  toggleSelectedDancer: (state: State, payload: string) => {
    const dancer = payload;
    state.selected[dancer].selected = !state.selected[dancer].selected;
  },

  /**
   * toggle one in selected array
   * @param {State} state
   * @param {PartPayloadType} payload
   */
  toggleSelectedPart: (state: State, payload: PartPayloadType) => {
    const { dancer, part } = payload;
    const index = state.selected[dancer].parts.indexOf(part as string);
    if (index !== -1) {
      state.selected[dancer].parts.splice(index, 1);
    } else {
      state.selected[dancer].parts.push(part as string);
    }
  },

  /**
   * toggle one in selected array
   * @param {State} state
   * @param {null} payload
   */
  clearSelected: (state: State, payload: null) => {
    Object.keys(state.selected).forEach((name) => {
      state.selected[name].selected = false;
      state.selected[name].parts = [];
    });
  },
});

export const {
  setSelected,
  setSelectedDancers,
  setSelectedParts,
  toggleSelectedDancer,
  toggleSelectedPart,
  clearSelected,
} = actions;