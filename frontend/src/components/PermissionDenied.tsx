import { Translations } from '../Translations';
import { DEFAULT_LANGUAGE } from '../Constants';

export const PermissionDenied = () => {
  return (
    <div className="canvas">
      <div className="content-box">
        <h2>{Translations.PermissionDeniedTitle[DEFAULT_LANGUAGE]}</h2>
        <div>{Translations.PermissionDeniedText[DEFAULT_LANGUAGE]}</div>
      </div>
    </div>
  );
};
