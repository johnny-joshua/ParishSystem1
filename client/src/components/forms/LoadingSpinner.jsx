export default function LoadingSpinner({ fullPage = false }) {
  const inner = (
    <div className="flex justify-center items-center py-12">
      <div className="w-10 h-10 border-4 border-parish-gold border-t-parish-blue rounded-full animate-spin" />
    </div>
  );
  if (fullPage) {
    return <div className="min-h-screen flex items-center justify-center bg-parish-cream">{inner}</div>;
  }
  return inner;
}
