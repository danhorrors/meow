import { Response, NextFunction } from 'express';
import { CurrencyCode } from '../entities/Team.js';
import { InvalidRequestBodyError } from '../errors/InvalidRequestBodyError.js';
import { EntityHelper } from '../helpers/EntityHelper.js';
import { AuthenticatedRequest } from '../requests/AuthenticatedRequest.js';
import { validateAndFetchTeam } from '../helpers/EntityFetchHelper.js';
import { InvalidRequestError } from '../errors/InvalidRequestError.js';

const parseCurrencyCode = (value: string): CurrencyCode => {
  if (value in CurrencyCode) {
    return value as CurrencyCode;
  }
  throw new InvalidRequestBodyError('invalid currency code');
};

const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const team = await validateAndFetchTeam(req.params.id, req.jwt.user);

    team.currency = parseCurrencyCode(req.body.currency);

    const updated = await EntityHelper.update(team);

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

const updateIntegration = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const team = await validateAndFetchTeam(req.params.id, req.jwt.user);
    const key = req.body?.key?.toString();

    if (!key) {
      throw new InvalidRequestBodyError('invalid integration key');
    }

    const integrations = team.integrations ?? [];
    const existing = integrations.find((integration) => integration.key === key);

    const updatedIntegrations = integrations.filter(
      (integration) => integration.key !== key
    );

    updatedIntegrations.push({
      key,
      attributes: {
        ...(existing?.attributes || {}),
        ...(req.body?.attributes || {}),
      },
    });

    team.integrations = updatedIntegrations;

    const updated = await EntityHelper.update(team);

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

const allowTeamRegistration = async (
  req: AuthenticatedRequest,
  res: Response,
  next: NextFunction
) => {
  try {
    let team = await validateAndFetchTeam(req.params.id, req.jwt.user);

    if (team.isFirstTeam !== true) {
      throw new InvalidRequestError();
    }

    let flag = await EntityHelper.findOrCreateGlobalFlagByName('allow-team-registration');

    flag.value = req.body.allowTeamRegistration === true;

    flag = await EntityHelper.update(flag);

    team = await EntityHelper.update(team);

    return res.json(team);
  } catch (error) {
    return next(error);
  }
};

const get = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const team = await validateAndFetchTeam(req.params.id, req.jwt.user);

    return res.json(team);
  } catch (error) {
    return next(error);
  }
};

export const TeamController = {
  update,
  allowTeamRegistration,
  updateIntegration,
  get,
};
