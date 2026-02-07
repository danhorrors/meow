import { useState } from 'react';
import { useSelector } from 'react-redux';
import { Link } from 'react-router-dom';
import { ActionType } from '../actions/Actions';
import { selectCurrency, selectRoles, selectSessionUser, selectUserId, store } from '../store/Store';
import { Avatar } from './Avatar';
import { IconBurger } from './IconBurger';
import { hasPermission } from '../helpers/PermissionHelper';

export const NavigationMobile = () => {
  const userId = useSelector(selectUserId);
  const currency = useSelector(selectCurrency);
  const roles = useSelector(selectRoles);
  const user = useSelector(selectSessionUser);
  const [isExpanded, setIsExpanded] = useState(false);

  const logout = () => {
    store.dispatch({
      type: ActionType.LOGOUT,
    });
  };

  return (
    <>
      <div className="burger">
        <div>
          <div className="icon-canvas" onClick={() => setIsExpanded(!isExpanded)}>
            <IconBurger />
          </div>
        </div>
        <Avatar onClick={() => setIsExpanded(!isExpanded)} width={36} id={userId} />
      </div>

      {isExpanded && (
        <div className="burger-items">
          {hasPermission(user, roles, 'opportunities', 'browse') && (
            <div className="item-mobile">
              <Link onClick={() => setIsExpanded(!isExpanded)} to="/" title="Opportunities">
                <img alt="Deals" src={`/${currency?.toLocaleLowerCase()}-icon.svg`} />
                Opportunities
              </Link>
            </div>
          )}
          {hasPermission(user, roles, 'forecast', 'read') && (
            <div className="item-mobile">
              <Link onClick={() => setIsExpanded(!isExpanded)} to="/forecast" title="Forecast">
                <img alt="Forecast" src="/forecast-icon.svg" /> Forecast
              </Link>
            </div>
          )}
          {hasPermission(user, roles, 'accounts', 'browse') && (
            <div className="item-mobile">
              <Link onClick={() => setIsExpanded(!isExpanded)} to="/accounts" title="Accounts">
                <img alt="Accounts" src="/accounts-icon.svg" /> Accounts
              </Link>
            </div>
          )}
          {hasPermission(user, roles, 'customers', 'browse') && (
            <div className="item-mobile">
              <Link onClick={() => setIsExpanded(!isExpanded)} to="/customers" title="Customers">
                <img alt="Customers" src="/accounts-icon.svg" /> Customers
              </Link>
            </div>
          )}
          {hasPermission(user, roles, 'leads', 'browse') && (
            <div className="item-mobile">
              <Link onClick={() => setIsExpanded(!isExpanded)} to="/leads" title="Leads">
                <img alt="Leads" src="/statistics-icon.svg" /> Leads
              </Link>
            </div>
          )}
          {hasPermission(user, roles, 'campaigns', 'browse') && (
            <div className="item-mobile">
              <Link onClick={() => setIsExpanded(!isExpanded)} to="/campaigns" title="Campaigns">
                <img alt="Campaigns" src="/statistics-icon.svg" /> Campaigns
              </Link>
            </div>
          )}
          {hasPermission(user, roles, 'users', 'browse') && (
            <div className="item-mobile">
              <Link onClick={() => setIsExpanded(!isExpanded)} to="/hire" title="Hire a Specialist">
                <img alt="Hire a Specialist" src="/paw-icon.svg" /> Users
              </Link>
            </div>
          )}
          {hasPermission(user, roles, 'settings', 'browse') && (
            <div className="item-mobile">
              <Link onClick={() => setIsExpanded(!isExpanded)} to="/setup" title="Setup">
                <img alt="Setup" src="/setup-icon.svg" /> Setup
              </Link>
            </div>
          )}

          <h4 className="headline">User</h4>

          <div className="item-mobile">
            <Link onClick={() => setIsExpanded(!isExpanded)} to="/user-setup" title="User Setup">
              Settings
            </Link>
          </div>
          <div onClick={logout} className="item-mobile logout">
            Logout
          </div>
        </div>
      )}
    </>
  );
};
