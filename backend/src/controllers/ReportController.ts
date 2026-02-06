import { Response, NextFunction } from 'express';
import { DateTime } from 'luxon';
import { AuthenticatedRequest } from '../requests/AuthenticatedRequest.js';
import { Card, CardStatus } from '../entities/Card.js';
import { Lane, LaneType } from '../entities/Lane.js';
import { EntityHelper } from '../helpers/EntityHelper.js';
import { ObjectId } from 'mongodb';

const summary = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const lanes = await EntityHelper.findByTeam(Lane, req.jwt.team);
    const laneTypeById = new Map<string, LaneType | undefined>();
    const laneProbabilityById = new Map<string, number | undefined>();

    lanes.forEach((lane) => {
      laneTypeById.set(lane._id.toString(), lane.tags?.type as LaneType | undefined);
      laneProbabilityById.set(lane._id.toString(), lane.probability);
    });

    const start = req.query.start ? DateTime.fromISO(req.query.start as string) : null;
    const end = req.query.end ? DateTime.fromISO(req.query.end as string) : null;

    const query: any = {
      teamId: req.jwt.team._id,
      status: { $ne: CardStatus.Deleted },
    };

    if (req.query.userId) {
      query.userId = new ObjectId(req.query.userId as string);
    }

    const cards = await EntityHelper.findBy(Card, query);

    const closed = cards.filter((card) => {
      if (!card.closedAt) {
        return false;
      }

      if (start && card.closedAt < start.toJSDate()) {
        return false;
      }

      if (end && card.closedAt > end.endOf('day').toJSDate()) {
        return false;
      }

      return true;
    });

    const won = closed.filter(
      (card) => laneTypeById.get(card.laneId.toString()) === LaneType.ClosedWon
    );
    const lost = closed.filter(
      (card) => laneTypeById.get(card.laneId.toString()) === LaneType.ClosedLost
    );

    const totalClosed = won.length + lost.length;
    const winRate = totalClosed > 0 ? won.length / totalClosed : 0;

    const avgCycleDays =
      closed.length > 0
        ? closed.reduce((acc, card) => {
            const startDate = DateTime.fromJSDate(card.createdAt);
            const endDate = DateTime.fromJSDate(card.closedAt!);
            return acc + endDate.diff(startDate, 'days').days;
          }, 0) / closed.length
        : 0;

    const avgDealSize =
      won.length > 0 ? won.reduce((acc, card) => acc + card.amount, 0) / won.length : 0;

    const openCards = cards.filter((card) => !card.closedAt);
    const pipelineValue = openCards.reduce((acc, card) => acc + card.amount, 0);
    const weightedPipelineValue = openCards.reduce((acc, card) => {
      const probability = laneProbabilityById.get(card.laneId.toString());
      if (typeof probability === 'number') {
        return acc + card.amount * (probability / 100);
      }
      return acc;
    }, 0);

    return res.json({
      totalClosed,
      won: won.length,
      lost: lost.length,
      winRate,
      avgCycleDays,
      avgDealSize,
      pipelineValue,
      weightedPipelineValue,
    });
  } catch (error) {
    return next(error);
  }
};

export const ReportController = {
  summary,
};
