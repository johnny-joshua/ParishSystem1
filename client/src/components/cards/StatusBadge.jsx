import { STATUS_BADGE } from '../../utils/constants';
import { useSettings } from '../../context/SettingsContext';

export default function StatusBadge({ status }) {
  const { tStatus } = useSettings();
  return <span className={STATUS_BADGE[status] || 'badge-pending'}>{tStatus(status)}</span>;
}
