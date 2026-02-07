import { Button, Item, Picker, TextArea, TextField } from '@adobe/react-spectrum';
import { useEffect, useMemo, useState } from 'react';
import { useSelector } from 'react-redux';
import { getRequestClient } from '../helpers/RequestHelper';
import { selectRoles, selectSessionUser, selectToken } from '../store/Store';
import { hasPermission } from '../helpers/PermissionHelper';
import { PermissionDenied } from '../components/PermissionDenied';
import { Translations } from '../Translations';
import { DEFAULT_LANGUAGE } from '../Constants';
import { Campaign, CampaignCondition } from '../interfaces/Campaign';
import { showModalError, showModalSuccess } from '../actions/Actions';
import { store } from '../store/Store';
import { TemplateBuilder } from '../components/campaign/TemplateBuilder';
import { SegmentBuilder } from '../components/campaign/SegmentBuilder';

const EMPTY_CAMPAIGN: Campaign = {
  name: '',
  audience: {
    entity: 'leads',
    match: 'all',
    conditions: [],
  },
  template: {
    subject: '',
    html: '',
    text: '',
  },
  steps: [],
  schedule: {
    sendAt: '',
    timeZone: Intl.DateTimeFormat().resolvedOptions().timeZone || 'UTC',
  },
};

export const CampaignsPage = () => {
  const token = useSelector(selectToken);
  const roles = useSelector(selectRoles);
  const sessionUser = useSelector(selectSessionUser);
  const client = getRequestClient(token);

  const [campaigns, setCampaigns] = useState<Campaign[]>([]);
  const [selectedId, setSelectedId] = useState<string | undefined>(undefined);
  const [draft, setDraft] = useState<Campaign>({ ...EMPTY_CAMPAIGN });

  const canBrowse = useMemo(
    () => hasPermission(sessionUser, roles, 'campaigns', 'browse'),
    [sessionUser, roles]
  );
  const canEdit = useMemo(
    () => hasPermission(sessionUser, roles, 'campaigns', 'edit'),
    [sessionUser, roles]
  );

  useEffect(() => {
    if (!token) return;
    client
      .getCampaigns()
      .then((list) => setCampaigns(list || []))
      .catch((error) => store.dispatch(showModalError(error?.toString())));
  }, [token]);

  useEffect(() => {
    if (!selectedId) {
      setDraft({ ...EMPTY_CAMPAIGN });
      return;
    }

    const found = campaigns.find((item) => item._id === selectedId);
    if (found) {
      setDraft({ ...found });
    }
  }, [selectedId, campaigns]);

  const updateConditions = (next: { match: 'all' | 'any'; conditions: CampaignCondition[] }) => {
    setDraft({
      ...draft,
      audience: {
        ...draft.audience,
        match: next.match,
        conditions: next.conditions,
      },
    });
  };

  const addStep = () => {
    const next = {
      name: `Step ${draft.steps?.length ? draft.steps.length + 1 : 1}`,
      delayDays: 1,
      template: { subject: '', html: '', text: '' },
    };
    setDraft({ ...draft, steps: [...(draft.steps || []), next] });
  };

  const updateStep = (index: number, patch: any) => {
    const next = (draft.steps || []).map((item, idx) => (idx === index ? { ...item, ...patch } : item));
    setDraft({ ...draft, steps: next });
  };

  const removeStep = (index: number) => {
    const next = (draft.steps || []).filter((_, idx) => idx !== index);
    setDraft({ ...draft, steps: next });
  };

  const save = async () => {
    try {
      const saved = await client.saveCampaign(draft);
      const list = await client.getCampaigns();
      setCampaigns(list || []);
      setSelectedId(saved._id);
      store.dispatch(showModalSuccess(Translations.SetupChangedConfirmation[DEFAULT_LANGUAGE]));
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  const sendNow = async () => {
    if (!draft._id) return;
    try {
      await client.sendCampaign(draft._id);
      store.dispatch(showModalSuccess(Translations.CampaignSendNowButton[DEFAULT_LANGUAGE]));
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  const schedule = async () => {
    if (!draft._id) return;
    try {
      await client.scheduleCampaign(draft._id, {
        sendAt: draft.schedule?.sendAt || undefined,
        timeZone: draft.schedule?.timeZone || undefined,
        recurring: draft.schedule?.recurring || undefined,
      });
      store.dispatch(showModalSuccess(Translations.CampaignScheduleButton[DEFAULT_LANGUAGE]));
    } catch (error) {
      store.dispatch(showModalError(error?.toString()));
    }
  };

  if (!canBrowse) {
    return <PermissionDenied />;
  }

  return (
    <div className="canvas">
      <div className="list-view-header">
        <div>
          <h2>{Translations.CampaignsTitle[DEFAULT_LANGUAGE]}</h2>
        </div>
      </div>

      <div className="content-box" style={{ display: 'grid', gap: '16px' }}>
        <div style={{ display: 'flex', gap: '12px', alignItems: 'center' }}>
          <Picker
            width={260}
            selectedKey={selectedId ?? ''}
            onSelectionChange={(key) => setSelectedId(key.toString())}
            aria-label={Translations.CampaignsTitle[DEFAULT_LANGUAGE]}
          >
            <Item key="">{Translations.AddButton[DEFAULT_LANGUAGE]}</Item>
            {campaigns.map((campaign) => (
              <Item key={campaign._id}>{campaign.name}</Item>
            ))}
          </Picker>
          <Button variant="primary" onPress={() => setSelectedId(undefined)} isDisabled={!canEdit}>
            {Translations.AddButton[DEFAULT_LANGUAGE]}
          </Button>
        </div>

        <TextField
          label={Translations.CampaignNameLabel[DEFAULT_LANGUAGE]}
          value={draft.name}
          onChange={(value) => setDraft({ ...draft, name: value })}
          isDisabled={!canEdit}
        />

        <div>
          <h3>{Translations.CampaignAudienceLabel[DEFAULT_LANGUAGE]}</h3>
          <div style={{ display: 'flex', gap: '12px', flexWrap: 'wrap' }}>
            <Picker
              width={220}
              selectedKey={draft.audience.entity}
              onSelectionChange={(key) =>
                setDraft({
                  ...draft,
                  audience: { ...draft.audience, entity: key.toString() as any },
                })
              }
            >
              <Item key="leads">{Translations.LeadsTitle[DEFAULT_LANGUAGE]}</Item>
              <Item key="customers">{Translations.CustomersTitle[DEFAULT_LANGUAGE]}</Item>
              <Item key="accounts">{Translations.AccountsTitle[DEFAULT_LANGUAGE]}</Item>
              <Item key="opportunities">{Translations.OpportunitiesNavItem[DEFAULT_LANGUAGE]}</Item>
              <Item key="users">{Translations.UsersTitle[DEFAULT_LANGUAGE]}</Item>
            </Picker>
          </div>

          <SegmentBuilder
            entity={draft.audience.entity}
            match={draft.audience.match}
            conditions={draft.audience.conditions}
            onChange={updateConditions}
          />
        </div>

        <div>
          <h3>{Translations.CampaignTemplateLabel[DEFAULT_LANGUAGE]}</h3>
          <TextField
            label={Translations.CampaignSubjectLabel[DEFAULT_LANGUAGE]}
            value={draft.template.subject}
            onChange={(value) =>
              setDraft({ ...draft, template: { ...draft.template, subject: value } })
            }
          />
          <TemplateBuilder
            value={draft.template.html}
            onChange={(value) => setDraft({ ...draft, template: { ...draft.template, html: value } })}
          />
          <TextArea
            label={Translations.CampaignTextLabel[DEFAULT_LANGUAGE]}
            value={draft.template.text || ''}
            onChange={(value) =>
              setDraft({ ...draft, template: { ...draft.template, text: value } })
            }
          />
        </div>

        <div>
          <h3>{Translations.CampaignStepsLabel[DEFAULT_LANGUAGE]}</h3>
          <div style={{ display: 'grid', gap: '12px' }}>
            {(draft.steps || []).map((step, index) => (
              <div key={index} style={{ border: '1px solid #e4e4e4', padding: '10px' }}>
                <TextField
                  label={Translations.CampaignNameLabel[DEFAULT_LANGUAGE]}
                  value={step.name}
                  onChange={(value) => updateStep(index, { name: value })}
                />
                <TextField
                  label="Delay (days)"
                  value={step.delayDays.toString()}
                  onChange={(value) => updateStep(index, { delayDays: parseInt(value || '0') })}
                />
                <TextField
                  label={Translations.CampaignSubjectLabel[DEFAULT_LANGUAGE]}
                  value={step.template.subject}
                  onChange={(value) =>
                    updateStep(index, { template: { ...step.template, subject: value } })
                  }
                />
                <TemplateBuilder
                  value={step.template.html}
                  onChange={(value) =>
                    updateStep(index, { template: { ...step.template, html: value } })
                  }
                />
                <TextArea
                  label={Translations.CampaignTextLabel[DEFAULT_LANGUAGE]}
                  value={step.template.text || ''}
                  onChange={(value) =>
                    updateStep(index, { template: { ...step.template, text: value } })
                  }
                />
                <Button variant="secondary" onPress={() => removeStep(index)}>
                  {Translations.DeleteButton[DEFAULT_LANGUAGE]}
                </Button>
              </div>
            ))}
            <Button variant="secondary" onPress={addStep}>
              {Translations.CampaignAddStepButton[DEFAULT_LANGUAGE]}
            </Button>
          </div>
        </div>

        <div>
          <h3>{Translations.CampaignScheduleLabel[DEFAULT_LANGUAGE]}</h3>
          <TextField
            label={Translations.CampaignSendAtLabel[DEFAULT_LANGUAGE]}
            value={draft.schedule?.sendAt || ''}
            onChange={(value) =>
              setDraft({ ...draft, schedule: { ...draft.schedule, sendAt: value } })
            }
          />
          <TextField
            label={Translations.CampaignTimeZoneLabel[DEFAULT_LANGUAGE]}
            value={draft.schedule?.timeZone || ''}
            onChange={(value) =>
              setDraft({ ...draft, schedule: { ...draft.schedule, timeZone: value } })
            }
          />
          <Picker
            width={220}
            selectedKey={draft.schedule?.recurring?.interval || ''}
            onSelectionChange={(key) =>
              setDraft({
                ...draft,
                schedule: {
                  ...draft.schedule,
                  recurring: key.toString()
                    ? { interval: key.toString() as 'daily' | 'weekly' }
                    : undefined,
                },
              })
            }
          >
            <Item key="">{Translations.IgnoreLabel[DEFAULT_LANGUAGE]}</Item>
            <Item key="daily">{Translations.CampaignIntervalDaily[DEFAULT_LANGUAGE]}</Item>
            <Item key="weekly">{Translations.CampaignIntervalWeekly[DEFAULT_LANGUAGE]}</Item>
          </Picker>
        </div>

        <div style={{ display: 'flex', gap: '10px' }}>
          <Button variant="primary" onPress={save} isDisabled={!canEdit}>
            {Translations.CampaignSaveButton[DEFAULT_LANGUAGE]}
          </Button>
          <Button variant="secondary" onPress={sendNow} isDisabled={!draft._id}>
            {Translations.CampaignSendNowButton[DEFAULT_LANGUAGE]}
          </Button>
          <Button variant="secondary" onPress={schedule} isDisabled={!draft._id}>
            {Translations.CampaignScheduleButton[DEFAULT_LANGUAGE]}
          </Button>
        </div>
      </div>
    </div>
  );
};
