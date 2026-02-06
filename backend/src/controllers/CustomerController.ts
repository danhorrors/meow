import { Response, NextFunction } from 'express';
import { AuthenticatedRequest } from '../requests/AuthenticatedRequest.js';
import { Customer, NewCustomer } from '../entities/Customer.js';
import { EntityHelper } from '../helpers/EntityHelper.js';
import { validateAndFetchCustomer, validateAndFetchUser } from '../helpers/EntityFetchHelper.js';
import { PermissionHelper } from '../helpers/PermissionHelper.js';

const create = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    let userId = req.jwt.user._id!;

    if (req.body.userId) {
      await PermissionHelper.ensurePermission(req.jwt.user, 'customers', 'assign');
      userId = (await validateAndFetchUser(req.body.userId, req.jwt.user))._id!;
    }

    const customer = new NewCustomer(req.jwt.team, userId, req.body.name, req.body.attributes);

    if (req.body.contact) {
      customer.contact = { ...req.body.contact };
      if (customer.contact?.email && !customer.contact.domain) {
        const domain = customer.contact.email.split('@')[1];
        if (domain) {
          customer.contact.domain = domain.toLowerCase();
        }
      }
    }

    const latest = await EntityHelper.create(customer, Customer);

    return res.status(201).json(latest);
  } catch (error) {
    return next(error);
  }
};

const update = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await validateAndFetchCustomer(req.params.id, req.jwt.user);

    customer.name = req.body.name;

    if (req.body.attributes) {
      customer.attributes = req.body.attributes;
    }

    if (req.body.contact) {
      customer.contact = { ...req.body.contact };
      if (customer.contact?.email && !customer.contact.domain) {
        const domain = customer.contact.email.split('@')[1];
        if (domain) {
          customer.contact.domain = domain.toLowerCase();
        }
      }
    }

    if (req.body.userId && customer.userId.toString() !== req.body.userId.toString()) {
      await PermissionHelper.ensurePermission(req.jwt.user, 'customers', 'assign');
      const user = await validateAndFetchUser(req.body.userId, req.jwt.user);
      customer.userId = user._id!;
    }

    const updated = await EntityHelper.update(customer);

    return res.json(updated);
  } catch (error) {
    return next(error);
  }
};

const list = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const customers = await EntityHelper.findByTeam(Customer, req.jwt.team);

    return res.json(customers);
  } catch (error) {
    return next(error);
  }
};

const fetch = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await validateAndFetchCustomer(req.params.id, req.jwt.user);

    return res.json(customer);
  } catch (error) {
    return next(error);
  }
};

const remove = async (req: AuthenticatedRequest, res: Response, next: NextFunction) => {
  try {
    const customer = await validateAndFetchCustomer(req.params.id, req.jwt.user);

    await EntityHelper.remove(Customer, customer);

    return res.json(customer.toPlain());
  } catch (error) {
    return next(error);
  }
};

export const CustomerController = {
  update,
  create,
  list,
  fetch,
  remove,
};
