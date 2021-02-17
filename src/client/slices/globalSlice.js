/* eslint-disable no-param-reassign */
import { createSlice } from "@reduxjs/toolkit";
import updateFrameByTime from "./utils";
// constants
// import control from "../../../data/control.json";
// import position from "../../../data/position.json";

export const globalSlice = createSlice({
  name: "global",
  initialState: {
    dancerNum: 0, // dancerNum
    isPlaying: false, // isPlaying
    selected: [], // dancer selected

    currentStatus: {}, // current dancers' frame, TODO: kill this
    currentPos: {}, // currnet dancers' position

    controlRecord: {}, // all dancer's status, TODEL
    posRecord: {}, // all dancer's position
    // TODO
    statusRecord: {}, // all dancer's status

    timeData: {
      controlFrame: 0, // control frame's index, TODEL
      posFrame: 0, // positions' index, TODEL

      // TODO
      time: 0, // time
      from: "", // update from what component
      statusIdx: 0, // status index
      posIdx: 0, // pos index
    },
  },
  reducers: {
    /**
     * Play or Pause
     * @param {*} state - redux state
     * @param {boolean} action.payload
     */
    playPause: (state, action) => {
      state.isPlaying = action.payload;
    },

    /**
     * Initiate controlRecord
     * @param {*} state - redux state
     * @param {object} action.payload - controlRecord
     */
    controlInit: (state, action) => {
      state.controlRecord = action.payload;
      state.dancerNum = Object.keys(state.controlRecord).length;
    },

    /**
     * Initiate posRecord
     * @param {*} state
     * @param {object} action.payload - posRecord
     */
    posInit: (state, action) => {
      state.posRecord = action.payload;
    },

    /**
     * Update Time data
     * @param {*} state
     * @param {object} action.payload -  {time, controlFrame, postFrame, from: string}
     */
    updateTimeData: (state, action) => {
      const { time: newTime } = action.payload;
      let {
        controlFrame: newControlFrame,
        posFram: newPosFrame, // ?????? posFrame?
      } = action.payload;
      if (!newControlFrame || !newPosFrame) {
        const { posFrame, controlFrame } = state.timeData;
        newControlFrame = updateFrameByTime(
          state.controlRecord,
          controlFrame,
          newTime
        );
        newPosFrame = updateFrameByTime(state.posRecord, posFrame, newTime);
      }
      state.timeData.controlFrame = newControlFrame;
      state.timeData.posFrame = newPosFrame;
      state.timeData.time = newTime;
    },

    /**
     * Set control frame index
     * @param {*} state
     * @param {number} action.payload - new Frame Index
     */
    setControlFrame: (state, action) => {
      state.timeData.controlFrame = action.payload;
    },

    /**
     * Set pos frame index
     * @param {*} state
     * @param {number} action.payload - new Pos Index
     */
    setPosFrame: (state, action) => {
      state.timeData.posFrame = action.payload;
    },

    /**
     * Set selected array
     * @param {*} state
     * @param {array of number} action.payload - new selected array
     */
    setSeletected: (state, action) => {
      state.selected = action.payload;
    },

    /**
     * Set current Frame
     * @param {*} state
     * @param {object} action.payload - new frame object
     */
    setCurrentStatus: (state, action) => {
      const { id, status } = action.payload;
      state.currentStatus[`player${id}`] = status;
    },

    /**
     * Set current pos
     * @param {*} state
     * @param {object} action.payload - new pos
     */
    setCurrentPos: (state, action) => {
      const { id, x, y, z } = action.payload;
      state.currentPos[`player${id}`] = { x, y, z };
    },

    /**
     *
     * @param {*} state
     */
    setNewPosRecord: (state) => {
      // can't save while playing
      if (state.isPlaying) return;

      const { time: curTime, posFrame } = state.timeData;

      Object.keys(state.currentPos).forEach((curName) => {
        const posData = state.currentPos[curName];
        let { x, y, z } = posData;
        [x, y, z] = [x, y, z].map((ele) => Math.round(ele * 1000) / 1000);
        const newPosFrame = { Start: curTime, x, y, z };
        const cloestPosFrame = updateFrameByTime(
          state.posRecord,
          posFrame,
          curTime
        );
        state.timeData.posFrame = cloestPosFrame;
        if (state.posRecord[curName]) {
          if (state.posRecord["player0"][cloestPosFrame].Start === curTime) {
            state.posRecord[curName][cloestPosFrame] = newPosFrame;
          } else {
            state.posRecord[curName].splice(cloestPosFrame + 1, 0, newPosFrame);
          }
        } else {
          state.posRecord[curName] = [newPosFrame];
        }
      });
    },

    /**
     * set timeData by time
     * @param {} state
     * @param {*} action.payload - number
     */
    setTime: (state, action) => {
      // TODO: check type
      const { from, time } = action.payload;
      if (from === undefined || time === undefined) {
        throw new Error(
          `[Error] setTime invalid parameter(from ${from}, time ${time})`
        );
      }
      state.timeData.from = from;
      state.timeData.time = time >= 0 ? time : 0;
      // TODO: change statusIdx and posIdx
    },

    /**
     * set timeData by statusIdx
     * @param {} state
     * @param {*} action.payload - number
     */
    setStatusIdx: (state, action) => {
      // TODO: check type
      const { from, statusIdx } = action.payload;
      if (from === undefined || statusIdx === undefined) {
        throw new Error(
          `[Error] setStatusIdx invalid parameter(from ${from}, statusIdx ${statusIdx})`
        );
      }
      state.timeData.from = from;
      state.timeData.statusIdx = statusIdx >= 0 ? statusIdx : 0;
      // TODO: change time by statusRecord as well
    },

    /**
     * set timeData by posIdx
     * @param {} state
     * @param {*} action.payload - number
     */
    setPosIdx: (state, action) => {
      // TODO: check type
      const { from, posIdx } = action.payload;
      if (from === undefined || posIdx === undefined) {
        throw new Error(
          `[Error] setPosIdx invalid parameter(from ${from}, posIdx ${posIdx})`
        );
      }
      state.timeData.from = from;
      state.timeData.posIdx = posIdx >= 0 ? posIdx : 0;
      // TODO: change time by posRecord as well
    },
  },
});

export const {
  playPause,
  posInit,
  controlInit,
  updateTimeData,
  setControlFrame,
  setPosFrame,
  setSeletected,
  setCurrentStatus,
  setCurrentPos,
  setNewPosRecord,
  setTime,
  setPosIdx,
  setStatusIdx,
} = globalSlice.actions;

export const selectGlobal = (state) => state.global;

export default globalSlice.reducer;