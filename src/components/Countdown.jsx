export default function Countdown({ value }) {
  if (value <= 0) {
    return null;
  }

  return (
    <div className="countdown">
      <span>{value}</span>
    </div>
  );
}
