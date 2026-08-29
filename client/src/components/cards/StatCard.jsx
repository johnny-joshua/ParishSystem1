export default function StatCard({ title, value, icon, color = 'blue' }) {
  const border =
    color === 'gold' ? 'border-parish-gold' : color === 'green' ? 'border-green-500' : 'border-parish-blue';
  return (
    <div className={`card border-l-4 ${border}`}>
      <div className="flex justify-between items-start">
        <div>
          <p className="text-sm text-gray-500">{title}</p>
          <p className="text-3xl font-bold text-parish-blue mt-1">{value}</p>
        </div>
        <span className="text-2xl">{icon}</span>
      </div>
    </div>
  );
}
