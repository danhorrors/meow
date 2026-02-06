import { useEffect, useState } from 'react';
import { BrowserRouter } from 'react-router-dom';
import { Routes, Route } from 'react-router-dom';
import { ActionType, showModalError } from './actions/Actions';
import './App.css';
import { ErrorModal } from './components/ErrorModal';
import { Layout } from './components/Layout';
import { SuccessModal } from './components/SuccessModal';
import { AccountsPage } from './pages/AccountsPage';
import { CustomersPage } from './pages/CustomersPage';
import { ForecastPage } from './pages/ForecastPage';
import { HirePage } from './pages/HirePage';
import { HomePage } from './pages/HomePage';
import { LeadsPage } from './pages/LeadsPage';
import { DuplicatesPage } from './pages/DuplicatesPage';
import { SetupPage } from './pages/SetupPage';
import { UserSetupPage } from './pages/UserSetupPage';
import { selectTeam, selectToken, store } from './store/Store';
import { getErrorMessage } from './helpers/ErrorHelper';
import { useSelector } from 'react-redux';
import { getRequestClient } from './helpers/RequestHelper';
import { AllowTeamRegistrationModal } from './components/modal/AllowTeamRegistrationModal';
import { ActivityPage } from './pages/ActivityPage';

function Application() {
  const token = useSelector(selectToken);
  const team = useSelector(selectTeam);

  const client = getRequestClient(token);
  const [registrationConfigured, setRegistrationConfigured] = useState<boolean | null>(null);

  useEffect(() => {
    const execute = async () => {
      try {
        let users = await client.getUsers();

        store.dispatch({
          type: ActionType.USERS,
          payload: [...users],
        });

        let schemas = await client.fetchSchemas();

        store.dispatch({
          type: ActionType.SCHEMAS,
          payload: [...schemas],
        });

        try {
          let roles = await client.getRoles();

          store.dispatch({
            type: ActionType.ROLES,
            payload: [...roles],
          });
        } catch (error) {
          console.warn('roles endpoint unavailable', error);
        }

        let accounts = await client.getAccounts();

        store.dispatch({
          type: ActionType.ACCOUNTS,
          payload: [...accounts],
        });

        let leads = await client.getLeads();

        store.dispatch({
          type: ActionType.LEADS,
          payload: [...leads],
        });

        let lanes = await client.getLanes();

        store.dispatch({
          type: ActionType.LANES,
          payload: [...lanes],
        });
      } catch (error) {
        console.error(error);

        const message = await getErrorMessage(error);

        store.dispatch(showModalError(message));
      }
    };

    if (token) {
      execute();
    }

    return () => {
      client.destroy();
    };
  }, [token]);

  useEffect(() => {
    if (!token) {
      setRegistrationConfigured(null);
      return;
    }

    client
      .registerStatus()
      .then((payload) => setRegistrationConfigured(payload.configured === true))
      .catch((error) => {
        console.error(error);
        setRegistrationConfigured(null);
      });
  }, [token]);

  return (
    <BrowserRouter>
      {team!.isFirstTeam === true && registrationConfigured === false ? (
        <AllowTeamRegistrationModal />
      ) : null}
      <Layout>
        <Routes>
          <Route path="/forecast/*" element={<ForecastPage />}></Route>
          <Route path="/setup" element={<SetupPage />}></Route>
          <Route path="/activity" element={<ActivityPage />}></Route>
          <Route path="/user-setup" element={<UserSetupPage />}></Route>
          <Route path="/hire" element={<HirePage />}></Route>
          <Route path="/accounts" element={<AccountsPage />}></Route>
          <Route path="/customers" element={<CustomersPage />}></Route>
          <Route path="/leads" element={<LeadsPage />}></Route>
          <Route path="/duplicates" element={<DuplicatesPage />}></Route>
          <Route path="*" element={<HomePage />}></Route>
        </Routes>
      </Layout>
      <SuccessModal />
      <ErrorModal />
    </BrowserRouter>
  );
}

export default Application;
