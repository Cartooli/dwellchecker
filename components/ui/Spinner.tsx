export default function Spinner({ size = 14 }: { size?: number }) {
  return (
    <span
      className="spinner"
      role="status"
      aria-hidden="true"
      style={{ width: size, height: size }}
    />
  );
}
