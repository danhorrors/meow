import { CurrencyCanvas } from '../components/setup/currency/CurrencyCanvas';
import { LanesSchema } from '../components/setup/lane/LaneSchema';
import { CardSchema } from '../components/setup/card/CardSchema';
import { AccountSchema } from '../components/setup/account/AccountSchema';
import { LeadSchema } from '../components/setup/lead/LeadSchema';
import { PermissionsCanvas } from '../components/setup/permissions/PermissionsCanvas';
import { Switch } from '@adobe/react-spectrum';
import { useEffect, useMemo, useState } from 'react';
import { IconDownload } from '../components/setup/IconDownload';
import { Translations } from '../Translations';
import { DEFAULT_LANGUAGE } from '../Constants';
import { getBaseUrl, getRequestClient } from '../helpers/RequestHelper';
import { useSelector } from 'react-redux';
import { selectRoles, selectSessionUser, selectTeam, selectToken, store } from '../store/Store';
import { showModalError, showModalSuccess } from '../actions/Actions';
import { PermissionDenied } from '../components/PermissionDenied';
import { hasPermission } from '../helpers/PermissionHelper';

export const SetupPage = () => {
  const [isDeveloperMode, setIsDeveloperMode] = useState(false);
  const [allowTeamRegistration, setAllowTeamRegistration] = useState<boolean | null>(null);
  const [registrationConfigured, setRegistrationConfigured] = useState<boolean | null>(null);
  const [registrationLoading, setRegistrationLoading] = useState(false);
  const [stackInfo, setStackInfo] = useState<any | null>(null);

  const token = useSelector(selectToken);
  const team = useSelector(selectTeam);
  const roles = useSelector(selectRoles);
  const sessionUser = useSelector(selectSessionUser);
  const client = getRequestClient(token);

  const baseUrl = useMemo(() => getBaseUrl().toString(), []);
  const frontendOrigin =
    typeof window !== 'undefined' ? window.location.origin : 'unknown';
  const viteUrl =
    import.meta.env.VITE_URL && import.meta.env.VITE_URL.toString().length > 0
      ? import.meta.env.VITE_URL.toString()
      : Translations.StackViteUrlUnsetLabel[DEFAULT_LANGUAGE];
  const buildMode = import.meta.env.MODE ?? 'unknown';

  const isFirstTeam = team?.isFirstTeam === true;

  if (!hasPermission(sessionUser, roles, 'settings', 'browse')) {
    return <PermissionDenied />;
  }

  useEffect(() => {
    if (!token || !isFirstTeam) {
      setAllowTeamRegistration(null);
      setRegistrationConfigured(null);
      return;
    }

    setRegistrationLoading(true);
    client
      .getRegistrationStatus()
      .then((payload) => {
        setAllowTeamRegistration(payload.allowTeamRegistration === true);
        setRegistrationConfigured(payload.configured === true);
      })
      .catch((error) => {
        console.error(error);
        store.dispatch(showModalError(error?.toString()));
      })
      .finally(() => setRegistrationLoading(false));
  }, [token, isFirstTeam]);

  useEffect(() => {
    if (!token) {
      setStackInfo(null);
      return;
    }

    client
      .getStackInfo()
      .then((payload) => setStackInfo(payload))
      .catch((error) => {
        console.error(error);
        setStackInfo(null);
      });
  }, [token]);

  const updateRegistration = async (value: boolean) => {
    if (!isFirstTeam) {
      return;
    }

    setRegistrationLoading(true);
    try {
      const payload = await client.setRegistrationStatus(value);
      setAllowTeamRegistration(payload.allowTeamRegistration === true);
      setRegistrationConfigured(payload.configured === true);
      store.dispatch(showModalSuccess(Translations.ChangesSavedMessage[DEFAULT_LANGUAGE]));
    } catch (error) {
      console.error(error);
      store.dispatch(showModalError(error?.toString()));
    } finally {
      setRegistrationLoading(false);
    }
  };

  return (
    <div className="canvas">
      <div className="developer-mode">
        <div className="switch">
          <Switch isSelected={isDeveloperMode} onChange={setIsDeveloperMode}>
            {Translations.DeveloperModeLabel[DEFAULT_LANGUAGE]}
          </Switch>
        </div>
        {isDeveloperMode ? (
          <div className="link">
            <a href="https://github.com/nash-md/meow" target="_blank">
              <div style={{}}>
                <IconDownload />
              </div>
              <span>{Translations.DownloadApiDefinitionLabel[DEFAULT_LANGUAGE]}</span>
            </a>
          </div>
        ) : null}
      </div>

      <div className="content-box">
        <h2>{Translations.BackendSettingsTitle[DEFAULT_LANGUAGE]}</h2>
        {isFirstTeam ? (
          <>
            <div className="settings-row">
              <Switch
                isSelected={allowTeamRegistration === true}
                isDisabled={registrationLoading || allowTeamRegistration === null}
                onChange={updateRegistration}
              >
                {Translations.TeamRegistrationSwitchLabel[DEFAULT_LANGUAGE]}
              </Switch>
            </div>
            <div className="settings-meta">
              <div>
                {Translations.TeamRegistrationStatusLabel[DEFAULT_LANGUAGE]}{' '}
                <strong>
                  {allowTeamRegistration === true
                    ? Translations.TeamRegistrationEnabledLabel[DEFAULT_LANGUAGE]
                    : Translations.TeamRegistrationDisabledLabel[DEFAULT_LANGUAGE]}
                </strong>
              </div>
              <div>
                {Translations.TeamRegistrationConfiguredLabel[DEFAULT_LANGUAGE]}{' '}
                <strong>
                  {registrationConfigured === true
                    ? Translations.YesLabel[DEFAULT_LANGUAGE]
                    : Translations.NoLabel[DEFAULT_LANGUAGE]}
                </strong>
              </div>
            </div>
          </>
        ) : (
          <div className="settings-meta">
            {Translations.TeamRegistrationNotFirstTeamLabel[DEFAULT_LANGUAGE]}
          </div>
        )}
      </div>

      <div className="content-box">
        <h2>{Translations.StackInfoTitle[DEFAULT_LANGUAGE]}</h2>
        <div className="settings-meta">
          <div>
            {Translations.StackApiBaseUrlLabel[DEFAULT_LANGUAGE]}{' '}
            <strong>{baseUrl}</strong>
          </div>
          <div>
            {Translations.StackFrontendOriginLabel[DEFAULT_LANGUAGE]}{' '}
            <strong>{frontendOrigin}</strong>
          </div>
          <div>
            {Translations.StackBuildModeLabel[DEFAULT_LANGUAGE]}{' '}
            <strong>{buildMode}</strong>
          </div>
          <div>
            {Translations.StackViteUrlLabel[DEFAULT_LANGUAGE]}{' '}
            <strong>{viteUrl}</strong>
          </div>
          <div>
            {Translations.StackNodeEnvLabel[DEFAULT_LANGUAGE]}{' '}
            <strong>
              {stackInfo?.nodeEnv ?? Translations.StackUnknownLabel[DEFAULT_LANGUAGE]}
            </strong>
          </div>
          <div>
            {Translations.StackPortLabel[DEFAULT_LANGUAGE]}{' '}
            <strong>
              {stackInfo?.port ?? Translations.StackUnknownLabel[DEFAULT_LANGUAGE]}
            </strong>
          </div>
          <div>
            {Translations.StackIpAddressLabel[DEFAULT_LANGUAGE]}{' '}
            <strong>
              {stackInfo?.ipAddress ?? Translations.StackUnknownLabel[DEFAULT_LANGUAGE]}
            </strong>
          </div>
          <div>
            {Translations.StackLogLevelLabel[DEFAULT_LANGUAGE]}{' '}
            <strong>
              {stackInfo?.logLevel ?? Translations.StackUnknownLabel[DEFAULT_LANGUAGE]}
            </strong>
          </div>
          <div>
            {Translations.StackDbNameLabel[DEFAULT_LANGUAGE]}{' '}
            <strong>
              {stackInfo?.dbName ?? Translations.StackUnknownLabel[DEFAULT_LANGUAGE]}
            </strong>
          </div>
          <div>
            {Translations.StackProcessManagerLabel[DEFAULT_LANGUAGE]}{' '}
            <strong>
              {stackInfo?.processManager ?? Translations.StackUnknownLabel[DEFAULT_LANGUAGE]}
            </strong>
          </div>
          <div>
            {Translations.StackPublicDomainLabel[DEFAULT_LANGUAGE]}{' '}
            <strong>
              {stackInfo?.publicDomain ?? Translations.StackUnknownLabel[DEFAULT_LANGUAGE]}
            </strong>
          </div>
        </div>
      </div>

      <CurrencyCanvas />
      <LanesSchema isDeveloperMode={isDeveloperMode} />
      <CardSchema isDeveloperMode={isDeveloperMode} />
      <AccountSchema isDeveloperMode={isDeveloperMode} />
      <LeadSchema isDeveloperMode={isDeveloperMode} />
      <PermissionsCanvas />
    </div>
  );
};
