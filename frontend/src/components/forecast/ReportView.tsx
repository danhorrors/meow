import { useEffect, useState } from 'react';
import { useSelector } from 'react-redux';
import { selectDate, selectToken } from '../../store/Store';
import { getRequestClient } from '../../helpers/RequestHelper';
import { Translations } from '../../Translations';
import { DEFAULT_LANGUAGE } from '../../Constants';
import { showModalError } from '../../actions/Actions';
import { store } from '../../store/Store';
import { getErrorMessage } from '../../helpers/ErrorHelper';

interface ReportSummary {
  totalClosed: number;
  won: number;
  lost: number;
  winRate: number;
  avgCycleDays: number;
  avgDealSize: number;
  pipelineValue: number;
  weightedPipelineValue: number;
}

export const ReportView = () => {
  const token = useSelector(selectToken);
  const date = useSelector(selectDate);
  const client = getRequestClient(token);
  const [summary, setSummary] = useState<ReportSummary | null>(null);

  useEffect(() => {
    const execute = async () => {
      try {
        const result = await client.getReportSummary({
          start: date.start!,
          end: date.end!,
          userId: date.userId,
        });
        setSummary(result);
      } catch (error) {
        const message = await getErrorMessage(error);
        store.dispatch(showModalError(message));
      }
    };

    execute();
  }, [date.start, date.end, date.userId]);

  if (!summary) {
    return <div className="content-box">Loading...</div>;
  }

  const toPercent = (value: number) => `${Math.round(value * 100)}%`;

  return (
    <div className="content-box" style={{ padding: '20px' }}>
      <h3>{Translations.ReportLabel[DEFAULT_LANGUAGE]}</h3>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, minmax(200px, 1fr))', gap: '12px' }}>
        <div>
          <b>Total Closed:</b> {summary.totalClosed}
        </div>
        <div>
          <b>Won:</b> {summary.won}
        </div>
        <div>
          <b>Lost:</b> {summary.lost}
        </div>
        <div>
          <b>Win Rate:</b> {toPercent(summary.winRate)}
        </div>
        <div>
          <b>Avg Cycle Time (days):</b> {summary.avgCycleDays.toFixed(1)}
        </div>
        <div>
          <b>Avg Deal Size:</b> {summary.avgDealSize.toFixed(2)}
        </div>
        <div>
          <b>Pipeline Value:</b> {summary.pipelineValue.toFixed(2)}
        </div>
        <div>
          <b>Weighted Pipeline Value:</b> {summary.weightedPipelineValue.toFixed(2)}
        </div>
      </div>
    </div>
  );
};
