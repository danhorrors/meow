import 'dotenv/config';
// @ts-ignore
export const log = pino({
  name: SERVICE_NAME,
  level: process.env.LOG_LEVEL || 'info',
});

process.on('uncaughtException', log.fatal.bind(log));

const IP_ADDRESS = process.env.IP_ADDRESS || '127.0.0.1';

function isValidPort(port: string | undefined): boolean {
  if (!port) {
    return false;
  }

  const portAsNumber = parseInt(port);

  return !isNaN(portAsNumber) && portAsNumber >= 0 && portAsNumber <= 65535;
}

const PORT = isValidPort(process.env.PORT) ? parseInt(process.env.PORT!) : 9000;

const mandatory = ['MONGODB_URI', 'SESSION_SECRET'];

mandatory.forEach((param) => {
  if (!process.env[param]) {
    log.error(`env variable ${param} is not set, exiting worker ...`);
    process.exit(1);
  }
});

import cors from 'cors';
import compression from 'compression';
import express from 'express';
import http from 'http';
import { CardController } from './controllers/CardController.js';
import { LoginController } from './controllers/LoginController.js';
import { setHeaders } from './middlewares/setHeaders.js';
import { rejectIfContentTypeIsNot } from './middlewares/rejectIfContentTypeIsNot.js';
import { validateAgainst } from './middlewares/validateAgainst.js';
import { RegisterRequestSchema } from './middlewares/schema-validation/RegisterRequestSchema.js';
import { RegisterController } from './controllers/RegisterController.js';
import { LoginRequestSchema } from './middlewares/schema-validation/LoginRequestSchema.js';
import { verifyJwt } from './middlewares/verifyJwt.js';
import { addEntityToHeader } from './middlewares/addEntityToHeader.js';
import { handleError } from './middlewares/handleError.js';
import { ValidateTokenRequestSchema } from './middlewares/schema-validation/ValidateTokenRequestSchema.js';
import { ValidateTokenController } from './controllers/ValidateTokenController.js';
import { AccountController } from './controllers/AccountController.js';
import { TeamRequestSchema } from './middlewares/schema-validation/TeamRequestSchema.js';
import { LaneController } from './controllers/LaneController.js';
import { LaneRequestSchema } from './middlewares/schema-validation/LaneRequestSchema.js';
import { LanesRequestSchema } from './middlewares/schema-validation/LanesRequestSchema.js';
import { isDatabaseConnectionEstablished } from './middlewares/isDatabaseConnectionEstablished.js';
import { UserController } from './controllers/UserController.js';
import { UserRequestSchema } from './middlewares/schema-validation/UserRequestSchema.js';
import { CardRequestSchema } from './middlewares/schema-validation/CardRequestSchema.js';
import { ForecastController } from './controllers/ForecastController.js';
import { DatabaseHelper } from './helpers/DatabaseHelper.js';
import { SchemaController } from './controllers/SchemaController.js';
import { SchemaRequestSchema } from './middlewares/schema-validation/SchemaRequestSchema.js';
import { BoardRequestSchema } from './middlewares/schema-validation/BoardRequestSchema.js';
import { UserUpdateRequestSchema } from './middlewares/schema-validation/UserUpdateRequestSchema.js';
import { PasswordRequestSchema } from './middlewares/schema-validation/PasswordRequestSchema.js';
import { UserViewsRequestSchema } from './middlewares/schema-validation/UserViewsRequestSchema.js';
import { TeamController } from './controllers/TeamController.js';
import { AccountRequestSchema } from './middlewares/schema-validation/AccountRequestSchema.js';
import { EventRequestSchema } from './middlewares/schema-validation/EventRequestSchema.js';
import { LaneStatisticsController } from './controllers/LaneStatisticsController.js';
import { EventHelper } from './helpers/EventHelper.js';
import { NodeEventStrategy } from './events/NodeEventStrategy.js';
import { LaneEventListener } from './events/LaneEventListener.js';
import { CardEventListener } from './events/CardEventListener.js';
import { AccountEventListener } from './events/AccountEventListener.js';
import { SERVICE_NAME } from './Constants.js';
import pino from 'pino';
import { CardReferenceListener } from './events/CardReferenceListener.js';
import { CardEventController } from './controllers/CardEventController.js';
import { AccountEventController } from './controllers/AccountEventController.js';
import { notifyOnMissedFollowUpDatesTimeline } from './jobs/notifyOnMissedFollowUpDatesTimeline.js';
import JobDailyScheduler from './job-daily-scheduler.js';
import { BoardEventListener } from './events/BoardEventListener.js';
import { CardForecastEventListener } from './events/CardForecastEventListener.js';
import { ActivityController } from './controllers/ActivityController.js';
import { LeadController } from './controllers/LeadController.js';
import { LeadRequestSchema } from './middlewares/schema-validation/LeadRequestSchema.js';
import { BookLeadRequestSchema } from './middlewares/schema-validation/BookLeadRequestSchema.js';
import { CustomerController } from './controllers/CustomerController.js';
import { CustomerRequestSchema } from './middlewares/schema-validation/CustomerRequestSchema.js';
import { IntegrationController } from './controllers/IntegrationController.js';
import { StackInfoController } from './controllers/StackInfoController.js';
import { RoleController } from './controllers/RoleController.js';
import { RoleRequestSchema } from './middlewares/schema-validation/RoleRequestSchema.js';
import { requirePermission } from './middlewares/requirePermission.js';
import { ReportController } from './controllers/ReportController.js';
import { DuplicateController } from './controllers/DuplicateController.js';
import { DuplicateMergeRequestSchema } from './middlewares/schema-validation/DuplicateMergeRequestSchema.js';
import { CampaignController } from './controllers/CampaignController.js';
import { CampaignRequestSchema } from './middlewares/schema-validation/CampaignRequestSchema.js';
import { EmailController } from './controllers/EmailController.js';
import { EmailSendRequestSchema } from './middlewares/schema-validation/EmailSendRequestSchema.js';
import { AppointmentController } from './controllers/AppointmentController.js';
import { AppointmentCreateRequestSchema } from './middlewares/schema-validation/AppointmentCreateRequestSchema.js';
import { AppointmentUpdateRequestSchema } from './middlewares/schema-validation/AppointmentUpdateRequestSchema.js';
import { Campaign } from './entities/Campaign.js';
import { CampaignService } from './services/CampaignService.js';
import { Team } from './entities/Team.js';
import { User } from './entities/User.js';
import { GmailSyncService } from './services/GmailSyncService.js';
import { DateTime } from 'luxon';
import { EntityHelper } from './helpers/EntityHelper.js';

/* spinning up express */
export const app = express();

app.set('port', process.env.PORT || 9000);
app.set('etag', false);

app.use(compression());
app.enable('trust proxy');
app.disable('x-powered-by');

let corsOptions: cors.CorsOptions = {
  origin: '*',
  methods: ['GET', 'POST', 'DELETE'],
};

/* enable CORS in production mode */
if (process.env.NODE_ENV === 'production') {
  corsOptions.origin = false;
}

app.use(cors(corsOptions));

try {
  log.info('initialise database connection');

  await DatabaseHelper.connect(process.env.MONGODB_URI!);

  log.info('database connection established');

  const strategy = new NodeEventStrategy();

  strategy.register('board', BoardEventListener.onBoardEvent);
  strategy.register('lane', LaneEventListener.onLaneUpdate);
  strategy.register('card', CardEventListener.onCardUpdateOrCreate);
  strategy.register('card', CardForecastEventListener.onCardUpdateOrCreate);
  strategy.register('card', CardReferenceListener.onCardUpdateOrCreate);
  strategy.register('account', AccountEventListener.onAccountUpdate);

  EventHelper.set(strategy);

  const card = express.Router();

  card.use(express.json({ limit: '5kb' }));
  card.use(verifyJwt, addEntityToHeader, setHeaders, isDatabaseConnectionEstablished);

  card.route('/').get(requirePermission('opportunities', 'browse'), CardController.list);
  card
    .route('/')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(CardRequestSchema),
      requirePermission('opportunities', 'add'),
      CardController.create
    );
  card.route('/:id').get(requirePermission('opportunities', 'read'), CardController.get);
  card
    .route('/:id?')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(CardRequestSchema),
      requirePermission('opportunities', 'edit'),
      CardController.update
    );
  card
    .route('/:id/events')
    .get(requirePermission('opportunities', 'read'), CardEventController.list);
  card
    .route('/:id/events')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(EventRequestSchema),
      requirePermission('opportunities', 'edit'),
      CardEventController.create
    );
  card
    .route('/:id/convert-account')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      requirePermission('opportunities', 'edit'),
      requirePermission('accounts', 'add'),
      CardController.convertToAccount
    );

  app.use('/api/cards', card);

  const stackInfo = express.Router();

  stackInfo.use(express.json({ limit: '2kb' }));
  stackInfo.use(verifyJwt, addEntityToHeader, setHeaders, isDatabaseConnectionEstablished);
  stackInfo.route('/').get(requirePermission('settings', 'browse'), StackInfoController.get);

  app.use('/api/stack-info', stackInfo);

  const registration = express.Router();

  registration.use(express.json({ limit: '2kb' }));
  registration.use(verifyJwt, addEntityToHeader, setHeaders, isDatabaseConnectionEstablished);

  registration
    .route('/status')
    .get(requirePermission('settings', 'browse'), RegisterController.authenticatedStatus)
    .post(
      rejectIfContentTypeIsNot('application/json'),
      requirePermission('settings', 'edit'),
      RegisterController.setStatus
    );

  app.use('/api/registration', registration);

  const team = express.Router();

  team.use(express.json({ limit: '5kb' }));

  team.use(verifyJwt, addEntityToHeader, setHeaders, isDatabaseConnectionEstablished);

  team.route('/:id').get(requirePermission('settings', 'browse'), TeamController.get);
  team
    .route('/:id')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(TeamRequestSchema),
      requirePermission('settings', 'edit'),
      TeamController.update
    );
  team
    .route('/:id/integrations')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      requirePermission('settings', 'edit'),
      TeamController.updateIntegration
    );
  team
    .route('/:id/allow-team-registration')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      requirePermission('settings', 'edit'),
      TeamController.allowTeamRegistration
    );

  app.use('/api/teams', team);

  const account = express.Router();

  account.use(express.json({ limit: '5kb' }));

  account.use(verifyJwt, addEntityToHeader, setHeaders, isDatabaseConnectionEstablished);

  account.route('/').get(requirePermission('accounts', 'browse'), AccountController.list);
  account
    .route('/')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(AccountRequestSchema),
      requirePermission('accounts', 'add'),
      AccountController.create
    );
  account
    .route('/:id')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(AccountRequestSchema),
      requirePermission('accounts', 'edit'),
      AccountController.update
    );
  account.route('/:id').delete(requirePermission('accounts', 'delete'), AccountController.remove);
  account.route('/:id').get(requirePermission('accounts', 'read'), AccountController.fetch);
  account
    .route('/:id/events')
    .get(requirePermission('accounts', 'read'), AccountEventController.list);
  account
    .route('/:id/events')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(EventRequestSchema),
      requirePermission('accounts', 'edit'),
      AccountEventController.create
    );

  app.use('/api/accounts', account);

  const lead = express.Router();

  lead.use(express.json({ limit: '5kb' }));
  lead.use(verifyJwt, addEntityToHeader, setHeaders, isDatabaseConnectionEstablished);

  lead.route('/').get(requirePermission('leads', 'browse'), LeadController.list);
  lead
    .route('/')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(LeadRequestSchema),
      requirePermission('leads', 'add'),
      LeadController.create
    );
  lead
    .route('/:id')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(LeadRequestSchema),
      requirePermission('leads', 'edit'),
      LeadController.update
    );
  lead.route('/:id').delete(requirePermission('leads', 'delete'), LeadController.remove);
  lead.route('/:id').get(requirePermission('leads', 'read'), LeadController.fetch);
  lead
    .route('/:id/book')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(BookLeadRequestSchema),
      requirePermission('leads', 'edit'),
      LeadController.bookMeeting
    );

  app.use('/api/leads', lead);

  const appointment = express.Router();

  appointment.use(express.json({ limit: '5kb' }));
  appointment.use(verifyJwt, addEntityToHeader, setHeaders, isDatabaseConnectionEstablished);

  appointment.route('/').get(requirePermission('appointments', 'browse'), AppointmentController.list);
  appointment
    .route('/')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(AppointmentCreateRequestSchema),
      requirePermission('appointments', 'add'),
      AppointmentController.create
    );
  appointment
    .route('/:id')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(AppointmentUpdateRequestSchema),
      requirePermission('appointments', 'edit'),
      AppointmentController.update
    );
  appointment
    .route('/:id')
    .delete(requirePermission('appointments', 'delete'), AppointmentController.remove);
  appointment.route('/:id').get(requirePermission('appointments', 'read'), AppointmentController.fetch);

  app.use('/api/appointments', appointment);

  const customer = express.Router();

  customer.use(express.json({ limit: '5kb' }));
  customer.use(verifyJwt, addEntityToHeader, setHeaders, isDatabaseConnectionEstablished);

  customer.route('/').get(requirePermission('customers', 'browse'), CustomerController.list);
  customer
    .route('/')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(CustomerRequestSchema),
      requirePermission('customers', 'add'),
      CustomerController.create
    );
  customer
    .route('/:id')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(CustomerRequestSchema),
      requirePermission('customers', 'edit'),
      CustomerController.update
    );
  customer.route('/:id').delete(requirePermission('customers', 'delete'), CustomerController.remove);
  customer.route('/:id').get(requirePermission('customers', 'read'), CustomerController.fetch);

  app.use('/api/customers', customer);

  const lane = express.Router();

  lane.use(express.json({ limit: '5kb' }));

  lane.use(verifyJwt, addEntityToHeader, setHeaders, isDatabaseConnectionEstablished);

  lane.route('/').get(requirePermission('opportunities', 'browse'), LaneController.list);
  lane.route('/statistic').get(LaneStatisticsController.get);
  lane
    .route('/')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(LanesRequestSchema),
      requirePermission('settings', 'edit'),
      LaneController.updateAll
    );
  lane
    .route('/:id')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(LaneRequestSchema),
      requirePermission('settings', 'edit'),
      LaneController.update
    );

  app.use('/api/lanes', lane);

  const user = express.Router();

  user.use(express.json({ limit: '5kb' }));

  user.use(verifyJwt, addEntityToHeader, setHeaders, isDatabaseConnectionEstablished);

  user.route('/').get(requirePermission('users', 'browse'), UserController.list);
  user
    .route('/')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(UserRequestSchema),
      requirePermission('users', 'add'),
      UserController.create
    );
  user
    .route('/:id')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(UserUpdateRequestSchema),
      UserController.update
    );
  user
    .route('/:id/board')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(BoardRequestSchema),
      UserController.board
    );
  user
    .route('/:id/views')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(UserViewsRequestSchema),
      UserController.views
    );
  user.route('/:id/views').get(UserController.viewsList);
  user.route('/:id/flags').get(UserController.flags);
  user
    .route('/:id/password')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(PasswordRequestSchema),
      UserController.password
    );

  app.use('/api/users', user);

  const forecast = express.Router();

  forecast.use(express.json({ limit: '5kb' }));

  forecast.use(
    verifyJwt,
    addEntityToHeader,
    setHeaders,
    setHeaders,
    isDatabaseConnectionEstablished
  );

  forecast.route('/achieved').get(requirePermission('forecast', 'read'), ForecastController.achieved);
  forecast
    .route('/predicted')
    .get(requirePermission('forecast', 'read'), ForecastController.predicted);
  forecast.route('/list').get(requirePermission('forecast', 'read'), ForecastController.list);
  forecast
    .route('/time-series')
    .get(requirePermission('forecast', 'read'), ForecastController.series);
  forecast
    .route('/generated')
    .get(requirePermission('forecast', 'read'), ForecastController.generated);

  app.use('/api/forecast', forecast);

  const schema = express.Router();

  schema.use(express.json({ limit: '5kb' }));

  schema.use(verifyJwt);
  schema.use(addEntityToHeader);
  schema.use(setHeaders);
  schema.use(isDatabaseConnectionEstablished);

  schema
    .route('/')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(SchemaRequestSchema),
      requirePermission('settings', 'edit'),
      SchemaController.create
    );
  schema.route('/').get(requirePermission('settings', 'browse'), SchemaController.list);

  app.use('/api/schemas', schema);

  const integration = express.Router();

  integration.use(express.json({ limit: '5kb' }));
  integration.use(verifyJwt, addEntityToHeader, setHeaders, isDatabaseConnectionEstablished);

  integration
    .route('/google-calendar/auth-url')
    .get(requirePermission('settings', 'edit'), IntegrationController.getGoogleCalendarAuthUrl);

  integration
    .route('/google-workspace/auth-url')
    .get(requirePermission('emails', 'add'), IntegrationController.getGoogleWorkspaceAuthUrl);
  integration
    .route('/:key')
    .get(requirePermission('settings', 'browse'), IntegrationController.getIntegration);

  app.use('/api/integrations', integration);

  const email = express.Router();

  email.use(express.json({ limit: '10kb' }));
  email.use(verifyJwt, addEntityToHeader, setHeaders, isDatabaseConnectionEstablished);

  email
    .route('/')
    .get(requirePermission('emails', 'browse'), EmailController.list)
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(EmailSendRequestSchema),
      requirePermission('emails', 'add'),
      EmailController.send
    );
  email
    .route('/sync')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      requirePermission('emails', 'browse'),
      EmailController.sync
    );

  app.use('/api/emails', email);

  const campaign = express.Router();

  campaign.use(express.json({ limit: '10kb' }));
  campaign.use(verifyJwt, addEntityToHeader, setHeaders, isDatabaseConnectionEstablished);

  campaign.route('/').get(requirePermission('campaigns', 'browse'), CampaignController.list);
  campaign
    .route('/')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(CampaignRequestSchema),
      requirePermission('campaigns', 'edit'),
      CampaignController.createOrUpdate
    );
  campaign
    .route('/:id')
    .get(requirePermission('campaigns', 'read'), CampaignController.fetch)
    .delete(requirePermission('campaigns', 'delete'), CampaignController.remove);
  campaign
    .route('/:id/schedule')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      requirePermission('campaigns', 'edit'),
      CampaignController.schedule
    );
  campaign
    .route('/:id/send')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      requirePermission('campaigns', 'edit'),
      CampaignController.sendNow
    );

  app.use('/api/campaigns', campaign);

  const role = express.Router();

  role.use(express.json({ limit: '5kb' }));
  role.use(verifyJwt, addEntityToHeader, setHeaders, isDatabaseConnectionEstablished);

  role.route('/').get(requirePermission('settings', 'browse'), RoleController.list);
  role
    .route('/')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(RoleRequestSchema),
      requirePermission('settings', 'edit'),
      RoleController.createOrUpdate
    );
  role
    .route('/:id')
    .delete(requirePermission('settings', 'delete'), RoleController.remove);

  app.use('/api/roles', role);

  const report = express.Router();

  report.use(express.json({ limit: '5kb' }));
  report.use(verifyJwt, addEntityToHeader, setHeaders, isDatabaseConnectionEstablished);

  report.route('/summary').get(requirePermission('forecast', 'read'), ReportController.summary);

  app.use('/api/reports', report);

  const duplicates = express.Router();

  duplicates.use(express.json({ limit: '5kb' }));
  duplicates.use(verifyJwt, addEntityToHeader, setHeaders, isDatabaseConnectionEstablished);

  duplicates
    .route('/leads')
    .get(requirePermission('leads', 'browse'), DuplicateController.listLeadDuplicates);
  duplicates
    .route('/accounts')
    .get(requirePermission('accounts', 'browse'), DuplicateController.listAccountDuplicates);
  duplicates
    .route('/leads/merge')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(DuplicateMergeRequestSchema),
      requirePermission('leads', 'edit'),
      requirePermission('leads', 'delete'),
      DuplicateController.mergeLead
    );
  duplicates
    .route('/accounts/merge')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(DuplicateMergeRequestSchema),
      requirePermission('accounts', 'edit'),
      requirePermission('accounts', 'delete'),
      DuplicateController.mergeAccount
    );

  app.use('/api/duplicates', duplicates);

  const activity = express.Router();

  activity.use(express.json({ limit: '5kb' }));

  activity.use(
    verifyJwt,
    addEntityToHeader,
    setHeaders,
    setHeaders,
    isDatabaseConnectionEstablished
  );

  activity.route('/').get(requirePermission('activity', 'read'), ActivityController.list);

  app.use('/api/activities', activity);

  const unprotected = express.Router();

  unprotected.use(express.json({ limit: '1kb' }));
  unprotected.use(setHeaders);
  unprotected.use(isDatabaseConnectionEstablished);

  unprotected
    .route('/login')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(LoginRequestSchema),
      LoginController.handle
    );
  unprotected
    .route('/register')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(RegisterRequestSchema),
      RegisterController.register
    );
  unprotected.route('/register/invite').get(RegisterController.invite);
  unprotected.route('/register/status').get(RegisterController.status);
  unprotected
    .route('/validate-token')
    .post(
      rejectIfContentTypeIsNot('application/json'),
      validateAgainst(ValidateTokenRequestSchema),
      ValidateTokenController.validate
    );
  unprotected
    .route('/google-calendar/callback')
    .get(IntegrationController.googleCalendarCallback);
  unprotected
    .route('/google-workspace/callback')
    .get(IntegrationController.googleWorkspaceCallback);

  app.use('/public', unprotected);
} catch (error) {
  log.error(error);
}

/* return 404 for all other /api routes */
app.all('/api/*', (req, res) => {
  res.status(404).end();
});

app.use(handleError);

const server = http.createServer(app);

server.listen(PORT, IP_ADDRESS, () => {
  log.info(`Listening on ${IP_ADDRESS}:${PORT}`);
});

try {
  const timelineNotification = new JobDailyScheduler(
    notifyOnMissedFollowUpDatesTimeline,
    '10:00'
  ).start();
} catch (error) {
  log.error(error);
}

try {
  setInterval(async () => {
    try {
      const due = await EntityHelper.findBy(Campaign, {
        status: { $eq: 'scheduled' },
        nextSendAt: { $lte: new Date() },
      });

      for (const campaign of due) {
        try {
          const team = await EntityHelper.findOneById(Team, campaign.teamId);
          const user = await EntityHelper.findOneById(User, campaign.userId);

          if (!team || !user) {
            continue;
          }

          const stepIndex = campaign.stepIndex || 0;
          await new CampaignService().sendCampaign(team, user, campaign, stepIndex);

          const steps = campaign.steps || [];
          const hasNextStep = steps.length > 0 && stepIndex < steps.length - 1;

          if (hasNextStep) {
            const base = campaign.schedule?.sendAt
              ? DateTime.fromJSDate(campaign.schedule.sendAt)
              : DateTime.utc();
            const nextIndex = stepIndex + 1;
            const nextDelay = steps[nextIndex]?.delayDays || 0;
            campaign.stepIndex = nextIndex;
            campaign.nextSendAt = base.plus({ days: nextDelay }).toJSDate();
            campaign.status = 'scheduled';
          } else if (campaign.schedule?.recurring) {
            const interval = campaign.schedule.recurring.interval;
            const zone = campaign.schedule.timeZone || 'UTC';
            const recurringBase = (campaign.schedule.sendAt
              ? DateTime.fromJSDate(campaign.schedule.sendAt)
              : DateTime.utc()
            ).setZone(zone);
            const nextCycleBase =
              interval === 'weekly'
                ? recurringBase.plus({ weeks: 1 })
                : recurringBase.plus({ days: 1 });
            const firstDelay = steps[0]?.delayDays || 0;
            campaign.stepIndex = 0;
            campaign.nextSendAt = nextCycleBase.plus({ days: firstDelay }).toJSDate();
            campaign.schedule.sendAt = nextCycleBase.toJSDate();
            campaign.status = 'scheduled';
          } else {
            campaign.status = 'completed';
            campaign.nextSendAt = null;
          }

          campaign.updatedAt = new Date();
          await EntityHelper.update(campaign);
        } catch (error) {
          log.error(error);
        }
      }
    } catch (error) {
      log.error(error);
    }
  }, 60 * 1000);
} catch (error) {
  log.error(error);
}

try {
  const syncInterval = parseInt(process.env.GMAIL_SYNC_INTERVAL_MINUTES || '10', 10);
  const syncLimit = parseInt(process.env.GMAIL_SYNC_LIMIT || '20', 10);

  setInterval(async () => {
    try {
      const users = await EntityHelper.findBy(User, {});

      for (const user of users) {
        const integration = user.integrations?.find(
          (item: { key: string }) => item.key === 'google_workspace'
        );
        const refreshToken = integration?.attributes?.refreshToken;
        if (!refreshToken) {
          continue;
        }
        const team = await EntityHelper.findOneById(Team, user.teamId);
        if (!team) {
          continue;
        }
        try {
          await new GmailSyncService().syncInbox(team, user, syncLimit);
        } catch (error) {
          log.error(error);
        }
      }
    } catch (error) {
      log.error(error);
    }
  }, Math.max(syncInterval, 5) * 60 * 1000);
} catch (error) {
  log.error(error);
}
