import {
  Resolver,
  ID,
  Ctx,
  Query,
  Arg,
  Mutation,
  PubSub,
  Publisher,
} from "type-graphql";

// import { PositionFrame } from "./types/positionFrame";
// import { Dancer } from "./types/dancer";
import { PositionFrame, Dancer } from "../../prisma/generated/type-graphql";
import { updateRedisPosition } from "../utility";
import {
  EditPositionFrameInput,
  DeletePositionFrameInput,
} from "./inputs/positionFrame";
import { Topic } from "./subscriptions/topic";
import { PositionMapPayload } from "./subscriptions/positionMap";
import {
  PositionRecordPayload,
  PositionRecordMutation,
} from "./subscriptions/positionRecord";
import redis from "../redis";
import { IDancer, IPosition, IPositionFrame, TContext } from "../types/global";

@Resolver((of) => PositionFrame)
export class PositionFrameResolver {
  @Query((returns) => PositionFrame)
  async positionFrame(@Arg("start") start: number, @Ctx() ctx: TContext) {
    return await ctx.prisma.positionFrame.findFirst({ where: { start } });
  }

  @Query((returns) => [ID])
  async positionFrameIDs(@Ctx() ctx: TContext) {
    const frames = await ctx.prisma.positionFrame.findMany({
      orderBy: { start: "asc" },
    });
    const id = frames.map((frame: PositionFrame) => frame.id);
    return id;
  }

  @Mutation((returns) => PositionFrame)
  async addPositionFrame(
    @PubSub(Topic.PositionRecord)
    publishPositionRecord: Publisher<PositionRecordPayload>,
    @PubSub(Topic.PositionMap)
    publishPositionMap: Publisher<PositionMapPayload>,
    @Arg("start", { nullable: false }) start: number,
    @Ctx() ctx: TContext
  ) {
    const check = await ctx.prisma.positionFrame.findFirst({
      where: { start },
    });
    if (check) {
      throw new Error(
        `Start Time ${start} overlapped! (Overlapped frameID: ${check.id})`
      );
    }
    const newPositionFrame = await ctx.prisma.positionFrame.create({
      data: {
        start,
      },
    });
    const allDancers = await ctx.prisma.dancer.findMany();
    await Promise.all(
      allDancers.map(async (dancer: Dancer) => {
        if (!dancer.positionData) {
          dancer.positionData = [];
        }
        await ctx.prisma.dancer.update({
          where: { id: dancer.id },
          data: {
            positionData: {
              connect: [
                {
                  dancerId_frameId: {
                    dancerId: dancer.id,
                    frameId: newPositionFrame.id,
                  },
                },
              ],
            },
          },
        });
      })
    );
    await updateRedisPosition(newPositionFrame.id);
    const mapPayload: PositionMapPayload = {
      editBy: ctx.userID,
      frame: {
        createList: [newPositionFrame.id],
        deleteList: [],
        updateList: [],
      },
    };
    await publishPositionMap(mapPayload);
    const allPositionFrames: IPositionFrame[] =
      await ctx.prisma.positionFrame.findMany({
        orderBy: { start: "asc" },
      });

    let index = -1;
    allPositionFrames.map((frame, idx: number) => {
      if (frame.id === newPositionFrame.id) {
        index = idx;
      }
    });
    const recordPayload: PositionRecordPayload = {
      mutation: PositionRecordMutation.CREATED,
      editBy: ctx.userID,
      addID: [newPositionFrame.id],
      updateID: [],
      deleteID: [],
      index,
    };
    await publishPositionRecord(recordPayload);
    return newPositionFrame;
  }

  @Mutation((returns) => PositionFrame)
  async editPositionFrame(
    @PubSub(Topic.PositionRecord)
    publishPositionRecord: Publisher<PositionRecordPayload>,
    @PubSub(Topic.PositionMap)
    publishPositionMap: Publisher<PositionMapPayload>,
    @Arg("input") input: EditPositionFrameInput,
    @Ctx() ctx: TContext
  ) {
    const { start } = input;
    if (start) {
      const check = await ctx.prisma.positionFrame.findFirst({
        where: { start },
      });
      if (check) {
        if (check.id !== input.frameID) {
          throw new Error(
            `Start Time ${start} overlapped! (Overlapped frameID: ${check.id})`
          );
        }
      }
    }
    const frameToEdit = await ctx.prisma.editingPositionFrame.findFirst({
      where: { frameId: input.frameID },
    });
    if (!frameToEdit) {
      await ctx.prisma.editingPositionFrame.create({
        data: {
          userId: ctx.userID,
          frameId: input.frameID,
        },
      });
    } else if (frameToEdit.userId && frameToEdit.userId !== ctx.userID) {
      throw new Error(`The frame is now editing by ${frameToEdit.userId}.`);
    }
    await ctx.prisma.positionFrame.update({
      where: { id: input.frameID },
      data: { id: input.frameID, start: input.start },
    });
    await ctx.prisma.editingPositionFrame.delete({
      where: { userId: ctx.userID, frameId: input.frameID },
    });
    const positionFrame = await ctx.prisma.positionFrame.findFirst({
      where: { id: input.frameID },
    });
    if (positionFrame) {
      await updateRedisPosition(positionFrame.id);
      const payload: PositionMapPayload = {
        editBy: ctx.userID,
        frame: {
          createList: [],
          deleteList: [],
          updateList: [positionFrame?.id],
        },
      };
      await publishPositionMap(payload);
      const allPositionFrames: IPositionFrame[] =
        await ctx.prisma.positionFrame.findMany({
          orderBy: { start: "asc" },
        });
      let index = -1;
      allPositionFrames.map((frame, idx: number) => {
        if (frame.id === positionFrame?.id) {
          index = idx;
        }
      });
      const recordPayload: PositionRecordPayload = {
        mutation: PositionRecordMutation.UPDATED,
        editBy: ctx.userID,
        addID: [],
        updateID: [positionFrame.id],
        deleteID: [],
        index,
      };
      await publishPositionRecord(recordPayload);
    }
    return positionFrame;
  }

  @Mutation((returns) => PositionFrame)
  async deletePositionFrame(
    @PubSub(Topic.PositionRecord)
    publishPositionRecord: Publisher<PositionRecordPayload>,
    @PubSub(Topic.PositionMap)
    publishPositionMap: Publisher<PositionMapPayload>,
    @Arg("input") input: DeletePositionFrameInput,
    @Ctx() ctx: TContext
  ) {
    const { frameID } = input;
    const frameToDelete = await ctx.prisma.positionFrame.findFirst({
      where: { id: frameID },
    });
    if (!frameToDelete) return;
    await ctx.prisma.positionFrame.delete({ where: { id: frameID } });
    const dancers = await ctx.prisma.dancer.findMany({
      include: { positionData: true },
    });
    Promise.all(
      dancers.map(async (dancer) => {
        await ctx.prisma.dancer.update({
          where: { id: dancer.id },
          data: {
            positionData: {
              disconnect: {
                dancerId_frameId: {
                  dancerId: dancer.id,
                  frameId: frameID,
                },
              },
            },
          },
        });
      })
    );

    await ctx.prisma.positionData.deleteMany({ where: { frameId: frameID } });
    const mapPayload: PositionMapPayload = {
      editBy: ctx.userID,
      frame: {
        createList: [],
        deleteList: [frameID],
        updateList: [],
      },
    };
    redis.del(String(frameID));
    await publishPositionMap(mapPayload);
    const recordPayload: PositionRecordPayload = {
      mutation: PositionRecordMutation.DELETED,
      addID: [],
      updateID: [],
      deleteID: [frameID],
      editBy: ctx.userID,
      index: -1,
    };
    await publishPositionRecord(recordPayload);
    return frameToDelete;
  }
}
